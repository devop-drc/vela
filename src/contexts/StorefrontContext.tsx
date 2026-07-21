import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { edgeGetWithRetry } from '@/lib/edgeInvoke';
import { getExchangeRates, readCachedRates } from '@/lib/exchangeRates';
import { readCache, writeCache } from '@/lib/pageCache';
import { primeVariantOptions } from '@/hooks/useVariantOptions';
import { showError } from '@/utils/toast';
import { DesignSettings } from './AppearanceContext'; // Re-use DesignSettings type
import { StorefrontAnnouncement } from '@/types/storefront';

interface ShopDetails {
  location: any;
  id: string;
  userId: string; // Added user ID here
  name: string;
  shop_name: string;
  slug: string; // Include slug in ShopDetails
  logo_url: string | null; // Can be null
  favicon_url: string | null; // Can be null
  currency: string;
  headline?: string;
  about?: string;
  contact_email?: string;
  followers_count?: number;
  media_count?: number;
  instagram_url?: string; // Added Instagram URL
  storefront_type?: string; // 'instagram' | 'custom'
}

interface Product {
  id: string;
  name: string;
  status: 'Active' | 'Draft' | 'Out of Stock';
  price: number | null;
  currency: string | null;
  inventory: number;
  media_url: string;
  media_gallery: string[] | null;
  media_type: string | null;
  thumbnail_url?: string;
  caption: string;
  category: string;
  tags: string[];
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  details: any;
  created_at: string; // Add created_at for sorting
}

interface TopProduct {
  product_id: string;
  name: string;
  media_url: string;
  total_sold: number;
}

interface Promotion {
  id: string;
  name: string;
  type: 'discount' | 'offer';
  value: any;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  target_products: string[] | null;
}

interface ExchangeRates {
  [key: string]: number;
}

/** Plan entitlements served by get-public-shop-data. Defaults are permissive
    so shops keep working against an older deployed function. */
export interface ShopCapabilities {
  card_payments: boolean;
  reviews: boolean;
  promotions: boolean;
  custom_storefront: boolean;
}
const DEFAULT_CAPABILITIES: ShopCapabilities = { card_payments: true, reviews: true, promotions: true, custom_storefront: true };

interface OrderDetails {
  id: string;
  customer_name: string;
  customer_email: string;
  status: 'Pending' | 'Order Seen' | 'Order Packaged' | 'Given to Courier' | 'Fulfilled' | 'Problematic' | 'Cancelled';
  total_amount: number;
  created_at: string;
  updated_at: string;
  currency: string;
  payment_method: string;
  payment_status: string;
  order_items: any[];
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: string;
  order_notes?: string;
}

interface StorefrontContextType {
  shopDetails: ShopDetails | null;
  appearanceSettings: DesignSettings | null;
  products: Product[];
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  hasMoreProducts: boolean;
  fetchMoreProducts: () => Promise<void>;
  /** Fetch one product by id (deep links) and merge it into `products`.
      Returns the product, or null if it doesn't exist / isn't public. */
  fetchProductById: (productId: string) => Promise<Product | null>;
  isLoadingMore: boolean;
  bestSellers: TopProduct[]; // New: Best selling products
  recommendedProducts: Product[]; // New: Recommended products
  exchangeRates: ExchangeRates | null; // Add exchangeRates to context type
  convertCurrency: (amount: number | null | undefined, fromCurrency?: string) => number; // Add convertCurrency
  promotions: Promotion[]; // New: Active promotions
  marqueeElements: StorefrontAnnouncement[]; // New: Marquee elements
  customerOrders: OrderDetails[]; // New: Customer orders
  /** Plan entitlements of this shop (card payments, reviews, promotions). */
  capabilities: ShopCapabilities;
}

// Exported so demo surfaces (e.g. the landing page's live storefront preview)
// can mount real storefront components over mock data without fetching.
export const StorefrontContext = createContext<StorefrontContextType | undefined>(undefined);

// Helper to generate a URL-friendly slug
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric characters except spaces and hyphens
    .trim()
    .replace(/\s+/g, '-'); // Replace spaces with single hyphens
};

const PRODUCTS_PER_PAGE = 12; // Define a constant for limit

// Newer edge responses embed each product's variant rows. Split them out and
// seed the variant-options cache so option pickers / "choose options" buttons
// render with zero extra round trips. Older responses (field absent) are a
// no-op — the client-side batched fetch still covers them.
//
// They also embed product_specifications rows (specs moved OUT of the details
// JSONB into their own table, but the whole storefront — detail page, facets,
// quick view — reads specs from `details`). Fold them back in here, at the
// single ingestion point, so every consumer works unchanged. Existing details
// keys win over spec rows (case/underscore-insensitively).
const normKey = (s: string) => s.toLowerCase().replace(/\s|_/g, '');
const absorbVariants = <T extends { id: string }>(list: T[] | null | undefined): T[] =>
  (list || []).map((p: any) => {
    const { product_variants, product_specifications, ...rest } = p;
    if (product_variants !== undefined) primeVariantOptions(rest.id, product_variants);
    if (Array.isArray(product_specifications) && product_specifications.length > 0) {
      const details: Record<string, unknown> = { ...(rest.details || {}) };
      const taken = new Set(Object.keys(details).map(normKey));
      [...product_specifications]
        .sort((a, b) => (a?.display_order ?? 0) - (b?.display_order ?? 0))
        .forEach((s: any) => {
          if (!s?.key || s.value == null || s.value === '') return;
          const k = normKey(String(s.key));
          if (!k || taken.has(k)) return;
          details[s.key] = s.unit ? `${s.value} ${s.unit}` : s.value;
          taken.add(k);
        });
      rest.details = details;
    }
    return rest as T;
  });

// Shop-level snapshot cached per slug for instant paint on reload.
interface StorefrontSnapshot {
  shopDetails: ShopDetails;
  appearanceSettings: DesignSettings;
  products: Product[];
  bestSellers: TopProduct[];
  recommendedProducts: Product[];
  promotions: Promotion[];
  marqueeElements: StorefrontAnnouncement[];
  hasMore: boolean;
  capabilities?: ShopCapabilities;
}

export const StorefrontProvider = ({ children }: { children: ReactNode }) => {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null);
  const [appearanceSettings, setAppearanceSettings] = useState<DesignSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [bestSellers, setBestSellers] = useState<TopProduct[]>([]); // New state
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]); // New state
  // Hydrate synchronously from the last successful fetch so prices render in
  // the correct currency on the very first frame — no convert-later flash.
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(() => readCachedRates());
  const [promotions, setPromotions] = useState<Promotion[]>([]); // New state for promotions
  const [marqueeElements, setMarqueeElements] = useState<StorefrontAnnouncement[]>([]); // New state for marquee elements
  const [customerOrders, setCustomerOrders] = useState<OrderDetails[]>([]); // New state for customer orders
  const [capabilities, setCapabilities] = useState<ShopCapabilities>(DEFAULT_CAPABILITIES);

  // Fetch exchange rates once on mount via the shared single-flight loader
  // (cache table first, edge function only on a stale/missing cache, stale
  // rows beat nothing) — deduped with CurrencyContext/ShopContext.
  useEffect(() => {
    let mounted = true;
    getExchangeRates()
      .then((rates) => { if (mounted) setExchangeRates(rates); })
      .catch((err: any) => {
        console.error("Failed to fetch exchange rates for storefront:", err?.message || err);
      });
    return () => { mounted = false; };
  }, []);

  const fetchStorefrontData = useCallback(async (pageToFetch: number = 1) => {
    if (!shopSlug) {
      setError("Shop slug is missing from the URL.");
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }

    const cacheKey = `storefront:${shopSlug}`;
    // Read once, up here, so the catch can tell whether we already have cached
    // content on screen (a failed revalidation must not replace it with an error).
    const cached = pageToFetch === 1 ? readCache<StorefrontSnapshot>(cacheKey) : null;
    if (pageToFetch === 1) {
      // Instant paint from the last successful load so a reload isn't a 13s
      // blank screen against the slow backend; we still revalidate below.
      if (cached) {
        setShopDetails(cached.shopDetails);
        setAppearanceSettings(cached.appearanceSettings);
        setProducts(cached.products);
        setBestSellers(cached.bestSellers);
        setRecommendedProducts(cached.recommendedProducts);
        setPromotions(cached.promotions);
        setMarqueeElements(cached.marqueeElements);
        setCapabilities(cached.capabilities ?? DEFAULT_CAPABILITIES);
        setHasMoreProducts(cached.hasMore);
        setCurrentPage(1);
        setIsLoading(false);
      } else {
        setIsLoading(true);
        setProducts([]); // Clear products for initial load
        setHasMoreProducts(true); // Assume more until proven otherwise
        setCurrentPage(1);
        setBestSellers([]); // Clear best sellers for initial load
        setRecommendedProducts([]); // Clear recommended products for initial load
        setPromotions([]); // Clear promotions for initial load
        setMarqueeElements([]); // Clear marquee elements for initial load
      }
      setCustomerOrders([]); // orders are per-customer — never cached
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      // GET (cacheable by browser/CDN) with the same transient-connection
      // retry the POST path had — the slow backend intermittently resets
      // fetches, and a blank storefront is far worse than a slower load.
      const data = await edgeGetWithRetry<any>('get-public-shop-data', {
        shopSlug, page: pageToFetch, limit: PRODUCTS_PER_PAGE,
      });

      if (data?.error) throw new Error(data.error);

      // page>1 responses may be a slim payload ({ products, hasMore,
      // partial }) — only the full payload carries the shop-level fields.
      let incomingDetails: ShopDetails | null = null;
      if (data.shopDetails) {
        incomingDetails = {
          id: data.shopDetails.id,
          userId: data.shopDetails.user_id, // Set the user ID here
          name: data.shopDetails.name,
          shop_name: data.shopDetails.shop_name,
          slug: data.shopDetails.slug,
          logo_url: data.shopDetails.logo_url || null, // Ensure null if empty
          favicon_url: data.shopDetails.favicon_url || null, // Ensure null if empty
          currency: data.shopDetails.currency,
          headline: data.shopDetails.headline,
          about: data.shopDetails.about,
          contact_email: data.shopDetails.contact_email,
          followers_count: data.shopDetails.followers_count,
          media_count: data.shopDetails.media_count,
          instagram_url: data.shopDetails.instagram_url, // Set Instagram URL
          storefront_type: data.shopDetails.storefront_type || 'instagram',
        } as ShopDetails;

        // Backfill branding if missing (incognito or older records) using public
        // storage URLs. The probe outcome — including "nothing found" — is cached
        // for a day so revalidations don't re-run a burst of 400ing requests and
        // block the shop paint every load. Probes run in parallel.
        if (!incomingDetails.logo_url || !incomingDetails.favicon_url) {
          const brandingKey = `branding:${shopSlug}`;
          const cachedBranding = readCache<{ logo: string | null; favicon: string | null }>(brandingKey);
          if (cachedBranding !== undefined) {
            incomingDetails.logo_url = incomingDetails.logo_url || cachedBranding.logo;
            incomingDetails.favicon_url = incomingDetails.favicon_url || cachedBranding.favicon;
          } else {
            const probe = async (key: string) => {
              const { data } = supabase.storage.from('shop-assets').getPublicUrl(key);
              try {
                const res = await fetch(data.publicUrl, { method: 'GET', headers: { 'Range': 'bytes=0-0' } });
                if (res.ok || res.status === 206) return data.publicUrl;
              } catch (e) { /* ignore */ }
              return null;
            };
            const firstHit = async (keys: string[]) =>
              (await Promise.all(keys.map(probe))).find(Boolean) ?? null;

            const [logoHit, favHit] = await Promise.all([
              incomingDetails.logo_url
                ? Promise.resolve(incomingDetails.logo_url)
                : firstHit([`${shopSlug}/logo.png`, `${shopSlug}/logo.jpg`, `${shopSlug}/logo.jpeg`]),
              incomingDetails.favicon_url
                ? Promise.resolve(incomingDetails.favicon_url)
                : firstHit([`${shopSlug}/favicon.ico`, `${shopSlug}/favicon.png`]),
            ]);
            incomingDetails.logo_url = logoHit;
            incomingDetails.favicon_url = favHit;

            // If still missing, attempt to list files in userId directory (public bucket policies required)
            if ((!incomingDetails.logo_url || !incomingDetails.favicon_url) && incomingDetails.userId) {
              try {
                const dir = incomingDetails.userId as string;
                const { data: files, error: listErr } = await supabase.storage.from('shop-assets').list(dir, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
                if (!listErr && files && files.length > 0) {
                  const imageFiles = files.filter(f => /\.(png|jpg|jpeg|webp|ico)$/i.test(f.name));
                  const makeUrl = (name: string) => supabase.storage.from('shop-assets').getPublicUrl(`${dir}/${name}`).data.publicUrl;

                  // Prefer favicon.* for favicon_url
                  if (!incomingDetails.favicon_url) {
                    const fav = imageFiles.find(f => /favicon\.(ico|png)$/i.test(f.name));
                    if (fav) incomingDetails.favicon_url = makeUrl(fav.name);
                  }

                  // Pick the most recent image for logo if still missing
                  if (!incomingDetails.logo_url && imageFiles.length > 0) {
                    incomingDetails.logo_url = makeUrl(imageFiles[0].name);
                  }
                }
              } catch (e) {
                console.warn('Branding directory list failed', e);
              }
            }
            writeCache(brandingKey, { logo: incomingDetails.logo_url, favicon: incomingDetails.favicon_url });
          }
        }

        setShopDetails(incomingDetails);

        setAppearanceSettings(data.appearanceSettings);
      }

      const incomingProducts = absorbVariants<Product>(data.products);
      const incomingRecommended = absorbVariants<Product>(data.recommendedProducts);

      if (pageToFetch === 1) {
        setProducts(incomingProducts);
        setBestSellers(data.bestSellers || []); // Set best sellers
        setRecommendedProducts(incomingRecommended); // Set recommended products
        setPromotions(data.promotions || []); // Set promotions
        setMarqueeElements(data.marqueeElements || []); // Set marquee elements
        setCustomerOrders(data.customerOrders || []); // Set customer orders
        setCapabilities({ ...DEFAULT_CAPABILITIES, ...(data.capabilities || {}) });
        // Snapshot the shop-level data for instant paint on the next reload
        // (customer orders excluded — they're per-visitor, not shop-wide).
        // Only when the shop-level fields were present — never snapshot a
        // partial payload.
        if (incomingDetails) {
          writeCache<StorefrontSnapshot>(cacheKey, {
            shopDetails: incomingDetails,
            appearanceSettings: data.appearanceSettings,
            products: incomingProducts,
            bestSellers: data.bestSellers || [],
            recommendedProducts: incomingRecommended,
            promotions: data.promotions || [],
            marqueeElements: data.marqueeElements || [],
            hasMore: data.hasMore,
            capabilities: { ...DEFAULT_CAPABILITIES, ...(data.capabilities || {}) },
          });
        }
      } else {
        // De-dupe by id so a double-trigger can't append the same page twice.
        setProducts(prevProducts => {
          const seen = new Set(prevProducts.map(p => p.id));
          return [...prevProducts, ...incomingProducts.filter((p: Product) => !seen.has(p.id))];
        });
      }
      setHasMoreProducts(data.hasMore);

    } catch (err: any) {
      console.error("Failed to fetch storefront data:", err);
      // If cached content is already on screen (or this was a "load more"),
      // keep it and fail quietly — don't replace a working page with an error.
      if (cached || pageToFetch > 1) {
        console.warn("Storefront revalidation failed; keeping displayed data.");
      } else {
        const msg = String(err?.message || '');
        // TypeError / "failed to fetch" is how a raw GET fetch surfaces a
        // dropped connection (the invoke path wraps it as FunctionsFetchError).
        const isNetwork = err?.name === 'FunctionsFetchError' || err instanceof TypeError
          || /failed to send a request|failed to fetch|load failed|network|timeout|connection/i.test(msg);
        const friendly = isNetwork
          ? "The shop is taking too long to respond. Please check your connection and refresh."
          : `Failed to load shop: ${msg || "An unknown error occurred."}`;
        showError(friendly);
        setError(friendly);
      }
    } finally {
      if (pageToFetch === 1) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [shopSlug]);

  const isFetchingMoreRef = useRef(false);
  const fetchMoreProducts = useCallback(async () => {
    // Guard synchronously (before the await) so two rapid triggers — e.g. an
    // intersection observer firing twice — can't both pass and skip/duplicate a page.
    if (isFetchingMoreRef.current || !hasMoreProducts || isLoading || isLoadingMore) return;
    isFetchingMoreRef.current = true;
    try {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      await fetchStorefrontData(nextPage);
    } finally {
      isFetchingMoreRef.current = false;
    }
  }, [currentPage, hasMoreProducts, isLoading, isLoadingMore, fetchStorefrontData]);

  // Single-product deep-link fetch: resolves instantly instead of paginating
  // the whole catalog until the product happens to appear.
  const pendingProductFetches = useRef(new Map<string, Promise<Product | null>>());
  const fetchProductById = useCallback(async (productId: string): Promise<Product | null> => {
    if (!shopSlug || !productId) return null;
    const pending = pendingProductFetches.current.get(productId);
    if (pending) return pending;
    const task = (async () => {
      try {
        // GET (cacheable) — retries: 0 mirrors the old single-attempt invoke.
        const data = await edgeGetWithRetry<any>('get-public-product', { shopSlug, productId }, { retries: 0 });
        if (data?.error) return null;
        const product: Product | null = data?.product ? absorbVariants<Product>([data.product])[0] : null;
        if (product) {
          setProducts((prev) => (prev.some((p) => p.id === product.id) ? prev : [...prev, product]));
        }
        return product;
      } catch {
        return null;
      } finally {
        pendingProductFetches.current.delete(productId);
      }
    })();
    pendingProductFetches.current.set(productId, task);
    return task;
  }, [shopSlug]);

  useEffect(() => {
    fetchStorefrontData(1); // Initial fetch on mount or shopSlug change
  }, [fetchStorefrontData]);

  const convertCurrency = useCallback((amount: number | null | undefined, fromCurrency?: string) => {
    const numericAmount = amount ?? 0;
    if (!shopDetails || !exchangeRates || !shopDetails.currency) {
      return numericAmount;
    }

    // If no fromCurrency is provided or it's the same as the shop's currency, return as is
    if (!fromCurrency || fromCurrency === shopDetails.currency) {
      return numericAmount;
    }

    // Get the rate for the source currency (from ALL to fromCurrency)
    const fromRate = exchangeRates[fromCurrency];
    // Get the rate for the target currency (from ALL to shop's currency)
    const toRate = exchangeRates[shopDetails.currency];

    // If either rate is missing, return the original amount
    if (!fromRate || !toRate) {
      console.warn(`Missing exchange rate for conversion from ${fromCurrency} to ${shopDetails.currency}`);
      return numericAmount;
    }

    // Convert from source currency to ALL, then to target currency
    // rate = (ALL/toCurrency) / (ALL/fromCurrency) = fromCurrency/toCurrency
    const rate = toRate / fromRate;
    const convertedAmount = numericAmount * rate;
    
    // Round to 2 decimal places for display
    return Math.round(convertedAmount * 100) / 100;
  }, [shopDetails, exchangeRates]);

  const contextValue: StorefrontContextType = {
    shopDetails,
    appearanceSettings,
    products,
    isLoading,
    error,
    currentPage,
    hasMoreProducts,
    fetchMoreProducts,
    fetchProductById,
    isLoadingMore,
    bestSellers, // Provide best sellers
    recommendedProducts, // Provide recommended products
    exchangeRates, // Provide exchange rates
    convertCurrency, // Provide convertCurrency
    promotions, // Provide promotions
    marqueeElements, // Provide marquee elements
    customerOrders, // Provide customer orders
    capabilities,
  };

  return (
    <StorefrontContext.Provider value={contextValue}>
      {children}
    </StorefrontContext.Provider>
  );
};

export const useStorefront = () => {
  const context = useContext(StorefrontContext);
  if (context === undefined) {
    throw new Error('useStorefront must be used within a StorefrontProvider');
  }
  return context;
};