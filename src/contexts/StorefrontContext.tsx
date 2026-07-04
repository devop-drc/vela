import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { invokeWithRetry } from '@/lib/edgeInvoke';
import { readCache, writeCache } from '@/lib/pageCache';
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
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null); // New state for exchange rates
  const [promotions, setPromotions] = useState<Promotion[]>([]); // New state for promotions
  const [marqueeElements, setMarqueeElements] = useState<StorefrontAnnouncement[]>([]); // New state for marquee elements
  const [customerOrders, setCustomerOrders] = useState<OrderDetails[]>([]); // New state for customer orders

  // Fetch exchange rates once on mount — cache table first (one cheap read),
  // edge function only on a stale/missing cache. Same pattern as ShopContext.
  useEffect(() => {
    const fetchRates = async () => {
      const { data: cached } = await supabase
        .from('exchange_rates_cache')
        .select('rates, last_fetched_at')
        .eq('id', 1)
        .maybeSingle();
      const isFresh = cached?.last_fetched_at
        && Date.now() - new Date(cached.last_fetched_at).getTime() < 24 * 60 * 60 * 1000;
      if (cached?.rates && isFresh) {
        setExchangeRates(cached.rates as ExchangeRates);
        return;
      }
      const { data, error } = await supabase.functions.invoke('exchange-rates');
      if (error || (data && data.error)) {
        const errorMessage = error?.message || (data && data.error) || "An unknown error occurred.";
        console.error("Failed to fetch exchange rates for storefront:", errorMessage);
        if (cached?.rates) setExchangeRates(cached.rates as ExchangeRates); // stale beats nothing
      } else if (data) {
        setExchangeRates(data.rates);
      }
    };
    fetchRates();
  }, []);

  const fetchStorefrontData = useCallback(async (pageToFetch: number = 1) => {
    if (!shopSlug) {
      setError("Shop slug is missing from the URL.");
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }

    const cacheKey = `storefront:${shopSlug}`;
    if (pageToFetch === 1) {
      // Instant paint from the last successful load so a reload isn't a 13s
      // blank screen against the slow backend; we still revalidate below.
      const cached = readCache<StorefrontSnapshot>(cacheKey);
      if (cached) {
        setShopDetails(cached.shopDetails);
        setAppearanceSettings(cached.appearanceSettings);
        setProducts(cached.products);
        setBestSellers(cached.bestSellers);
        setRecommendedProducts(cached.recommendedProducts);
        setPromotions(cached.promotions);
        setMarqueeElements(cached.marqueeElements);
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
      // Retry transient connection drops — the slow backend intermittently
      // resets fetches, and a blank storefront is far worse than a slower load.
      const data = await invokeWithRetry<any>('get-public-shop-data', {
        body: { shopSlug, page: pageToFetch, limit: PRODUCTS_PER_PAGE },
      });

      if (data?.error) throw new Error(data.error);

      const incomingDetails = {
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

      // Backfill branding if missing (incognito or older records) using public storage URLs
      if (!incomingDetails.logo_url || !incomingDetails.favicon_url) {
          const candidates = [
            { key: `${shopSlug}/logo.png` },
            { key: `${shopSlug}/logo.jpg` },
            { key: `${shopSlug}/logo.jpeg` },
          ];
          const favCandidates = [
            { key: `${shopSlug}/favicon.ico` },
            { key: `${shopSlug}/favicon.png` },
          ];
          const probe = async (key: string) => {
            const { data } = supabase.storage.from('shop-assets').getPublicUrl(key);
            try {
              const res = await fetch(data.publicUrl, { method: 'GET', headers: { 'Range': 'bytes=0-0' } });
              if (res.ok || res.status === 206) return data.publicUrl;
            } catch (e) { /* ignore */ }
            return null;
          };
          if (!incomingDetails.logo_url) {
            for (const c of candidates) {
              const url = await probe(c.key);
              if (url) { incomingDetails.logo_url = url; break; }
            }
          }
          if (!incomingDetails.favicon_url) {
            for (const c of favCandidates) {
              const url = await probe(c.key);
              if (url) { incomingDetails.favicon_url = url; break; }
            }
          }

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
      }

      setShopDetails(incomingDetails);

      setAppearanceSettings(data.appearanceSettings);

      if (pageToFetch === 1) {
        setProducts(data.products);
        setBestSellers(data.bestSellers || []); // Set best sellers
        setRecommendedProducts(data.recommendedProducts || []); // Set recommended products
        setPromotions(data.promotions || []); // Set promotions
        setMarqueeElements(data.marqueeElements || []); // Set marquee elements
        setCustomerOrders(data.customerOrders || []); // Set customer orders
        // Snapshot the shop-level data for instant paint on the next reload
        // (customer orders excluded — they're per-visitor, not shop-wide).
        writeCache<StorefrontSnapshot>(cacheKey, {
          shopDetails: incomingDetails,
          appearanceSettings: data.appearanceSettings,
          products: data.products || [],
          bestSellers: data.bestSellers || [],
          recommendedProducts: data.recommendedProducts || [],
          promotions: data.promotions || [],
          marqueeElements: data.marqueeElements || [],
          hasMore: data.hasMore,
        });
      } else {
        // De-dupe by id so a double-trigger can't append the same page twice.
        setProducts(prevProducts => {
          const seen = new Set(prevProducts.map(p => p.id));
          return [...prevProducts, ...(data.products || []).filter((p: Product) => !seen.has(p.id))];
        });
      }
      setHasMoreProducts(data.hasMore);

    } catch (err: any) {
      console.error("Failed to fetch storefront data:", err);
      // Distinguish a genuine "shop not found" from the backend being slow/
      // unreachable, so a temporary hiccup reads as retryable, not broken.
      const msg = String(err?.message || '');
      const isNetwork = err?.name === 'FunctionsFetchError' || /failed to send a request|network|timeout|connection/i.test(msg);
      const friendly = isNetwork
        ? "The shop is taking too long to respond. Please check your connection and refresh."
        : `Failed to load shop: ${msg || "An unknown error occurred."}`;
      showError(friendly);
      setError(friendly);
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
        const { data, error } = await supabase.functions.invoke('get-public-product', {
          body: { shopSlug, productId },
        });
        if (error || data?.error) return null;
        const product: Product | null = data?.product ?? null;
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