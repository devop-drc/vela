import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { isDemoFrame } from '@/lib/isDemoFrame';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { clearCache as clearPageCache } from '@/lib/pageCache';
import type { StorefrontType } from '@/lib/storefront';

interface ShopDetails {
  id: string; // Add business ID here
  userId: string; // Added user ID here
  name: string;
  shop_name: string;
  slug: string; // Add slug here
  logo_url: string | null; // Can be null
  favicon_url: string | null; // Can be null
  currency: string;
  headline?: string;
  about?: string;
  contact_email?: string;
  followers_count?: number;
  media_count?: number;
  instagram_url?: string; // Added Instagram URL
  username?: string; // Added Instagram username
  storefront_type?: StorefrontType; // 'instagram' | 'custom'
}

interface ExchangeRates {
  [key: string]: number;
}

interface ShopContextType {
  shopDetails: ShopDetails | null;
  isLoading: boolean;
  updateShopDetails: (details: Partial<ShopDetails>) => Promise<boolean>;
  fetchShopDetails: () => Promise<void>;
  exchangeRates: ExchangeRates | null;
  convertCurrency: (amount: number | null | undefined, fromCurrency?: string, toCurrency?: string) => number;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

// Helper to generate a URL-friendly slug
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric characters except spaces and hyphens
    .trim()
    .replace(/\s+/g, '-'); // Replace spaces with single hyphens
};

// ── Instant-hydration cache ──────────────────────────────────────────────
// Shop details + rates are persisted to localStorage so a returning user sees
// their real shop name/logo/currency IMMEDIATELY on load (no skeleton wait),
// while the network fetch revalidates in the background (SWR). Cleared on
// sign-out so a different user never sees stale data.
const SHOP_CACHE_KEY = 'vela:shopDetails:v1';
const RATES_CACHE_KEY = 'vela:exchangeRates:v1';
const readCache = <T,>(key: string): T | null => {
  try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : null; } catch { return null; }
};
const writeCache = (key: string, val: unknown) => {
  try { val == null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(val)); } catch { /* private mode / quota */ }
};

export const ShopProvider = ({ children }: { children: ReactNode }) => {
  // Hydrate synchronously from cache so returning users never wait on a skeleton.
  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(() => isDemoFrame() ? null : readCache<ShopDetails>(SHOP_CACHE_KEY));
  const [isLoading, setIsLoading] = useState(() => isDemoFrame() ? false : readCache<ShopDetails>(SHOP_CACHE_KEY) === null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(() => isDemoFrame() ? null : readCache<ExchangeRates>(RATES_CACHE_KEY));

  useEffect(() => {
    if (isDemoFrame()) { setIsLoading(false); return; } // demo/preview iframes run on mock data
    let mounted = true;
    const fetchRates = async () => {
      // Try cache table first — much faster than invoking the edge function.
      const { data: cached } = await supabase
        .from('exchange_rates_cache')
        .select('rates, last_fetched_at')
        .eq('id', 1)
        .maybeSingle();

      const fresh = (ts?: string | null) =>
        ts ? Date.now() - new Date(ts).getTime() < 24 * 60 * 60 * 1000 : false;

      if (cached?.rates && fresh(cached.last_fetched_at)) {
        if (mounted) { setExchangeRates(cached.rates as ExchangeRates); writeCache(RATES_CACHE_KEY, cached.rates); }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const invokeOptions: any = {};
      if (session?.access_token) {
        invokeOptions.headers = { Authorization: `Bearer ${session.access_token}` };
      }
      const { data, error } = await supabase.functions.invoke('exchange-rates', invokeOptions);
      if (!mounted) return;
      if (error || (data && data.error)) {
        const errorMessage = error?.message || (data && data.error) || "An unknown error occurred.";
        console.error("ShopContext: Failed to fetch exchange rates:", errorMessage);
        showError(`Could not load currency rates: ${errorMessage}`);
      } else if (data) {
        setExchangeRates(data.rates);
        writeCache(RATES_CACHE_KEY, data.rates);
      }
    };
    fetchRates();
    return () => { mounted = false; };
  }, []);

  const fetchShopDetails = useCallback(async () => {
    // Note: we deliberately do NOT flip isLoading→true here. For returning users
    // this runs as a background revalidation over cached data, and blanking to a
    // skeleton would defeat the instant-hydration cache.
    // Use the locally cached session — avoids an auth network round-trip.
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Run business + shop_details + integration check in parallel.
    const [businessRes, dbDetailsRes, integrationRes] = await Promise.all([
      supabase.from('businesses').select('id, name').eq('user_id', user.id).single(),
      // shop_details join through business is needed; do it as a second query
      // after we have business.id. But to parallelize we fetch by user via a join below.
      Promise.resolve({ data: null, error: null } as { data: any; error: any }),
      supabase.from('integrations').select('id').eq('user_id', user.id).eq('provider', 'facebook').maybeSingle(),
    ]);

    const business = businessRes.data;
    if (businessRes.error || !business) {
      console.error("ShopContext: Could not find your business:", businessRes.error);
      setIsLoading(false);
      return;
    }

    const { data: dbDetails, error: dbDetailsError } = await supabase
      .from('shop_details')
      .select('*')
      .eq('business_id', business.id)
      .single();
    if (dbDetailsError && dbDetailsError.code !== 'PGRST116') {
      console.error("ShopContext: Error fetching shop details from DB:", dbDetailsError);
    }

    const defaultShopName = `${user.user_metadata?.first_name || 'Your'} Shop`;

    // Set shop details immediately from local DB — don't block render on the
    // Instagram edge function (which is slow). IG data is augmented below.
    const initialDetails: ShopDetails = {
      id: business.id,
      userId: user.id,
      name: business.name,
      shop_name: dbDetails?.shop_name || defaultShopName,
      slug: dbDetails?.slug || generateSlug(dbDetails?.shop_name || defaultShopName),
      logo_url: dbDetails?.logo_url || null,
      favicon_url: dbDetails?.favicon_url || null,
      currency: dbDetails?.currency || 'USD',
      headline: dbDetails?.headline || '',
      about: dbDetails?.about || '',
      contact_email: dbDetails?.contact_email || user.email || '',
      instagram_url: dbDetails?.instagram_url || null,
      storefront_type: (dbDetails?.storefront_type as StorefrontType) || 'instagram',
    };

    setShopDetails(initialDetails);
    setIsLoading(false);
    writeCache(SHOP_CACHE_KEY, initialDetails);

    // Background-augment with Instagram details (non-blocking).
    if (integrationRes.data) {
      const invokeOptions: any = { body: { user_id: user.id } };
      if (session?.access_token) {
        invokeOptions.headers = { Authorization: `Bearer ${session.access_token}` };
      }
      supabase.functions.invoke('instagram-profile', invokeOptions).then(({ data: igDetails, error: igError }) => {
        if (igError || igDetails?.error) {
          console.error("ShopContext: Failed to fetch Instagram details:", igError || igDetails?.error);
          return;
        }
        if (!igDetails) return;
        setShopDetails(prev => {
          if (!prev) return prev;
          const next: ShopDetails = {
            ...prev,
            shop_name: dbDetails?.shop_name || igDetails.shop_name || prev.shop_name,
            slug: dbDetails?.slug || generateSlug(dbDetails?.shop_name || igDetails.shop_name || prev.shop_name),
            logo_url: dbDetails?.logo_url || igDetails.logo_url || prev.logo_url,
            favicon_url: dbDetails?.favicon_url || igDetails.favicon_url || prev.favicon_url,
            about: dbDetails?.about || igDetails.description || prev.about,
            followers_count: igDetails.followers_count,
            media_count: igDetails.media_count,
            instagram_url: dbDetails?.instagram_url || igDetails.instagram_url || prev.instagram_url,
            username: igDetails.username || prev.username,
          };
          writeCache(SHOP_CACHE_KEY, next);
          return next;
        });
      });
    }
  }, []);

  useEffect(() => {
    if (isDemoFrame()) { setIsLoading(false); return; } // demo/preview iframes run on mock data
    fetchShopDetails();

    // Refetch on auth state changes so the dashboard hydrates after login
    // without a full page reload, and clears stale data on logout.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchShopDetails();
      } else if (event === 'SIGNED_OUT') {
        setShopDetails(null);
        setIsLoading(false);
        writeCache(SHOP_CACHE_KEY, null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchShopDetails]);

  const updateShopDetails = async (details: Partial<ShopDetails>) => {
    // shopDetails.id IS the business id (set in fetchShopDetails) — reuse it
    // instead of re-resolving user → business on every save (2 round trips).
    let businessId = shopDetails?.id;
    if (!businessId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { showError("You must be logged in."); return false; }
      const { data: business } = await supabase.from('businesses').select('id').eq('user_id', user.id).single();
      if (!business) { showError("Could not find your business."); return false; }
      businessId = business.id;
    }
    const business = { id: businessId };

    let newSlug = details.shop_name ? generateSlug(details.shop_name) : shopDetails?.slug;

    // Check if the new slug is already taken by another business
    if (newSlug && newSlug !== shopDetails?.slug) { // Only check if slug is new or changed
      const { data: existingShop, error: slugCheckError } = await supabase
        .from('shop_details')
        .select('business_id')
        .eq('slug', newSlug)
        .not('business_id', 'eq', business.id) // Exclude current business
        .maybeSingle();

      if (slugCheckError) {
        showError(`Failed to check shop name availability: ${slugCheckError.message}`);
        return false;
      }
      if (existingShop) {
        showError(`The shop name "${details.shop_name}" is already taken. Please choose a different name.`);
        return false;
      }
    }

    const payload = { ...details, slug: newSlug, business_id: business.id };

    const { error } = await supabase.from('shop_details').upsert(payload, { onConflict: 'business_id' });
    
    if (error) {
      showError(`Failed to update settings: ${error.message}`);
      console.error("ShopContext: Error updating shop details:", error);
      return false;
    }

    // Apply optimistically so toggles (e.g. storefront type) feel instant,
    // then revalidate in the background instead of blocking on a refetch.
    setShopDetails((prev) => (prev ? { ...prev, ...details, slug: newSlug || prev.slug } : prev));
    // The public storefront hydrates from a per-slug snapshot cache — drop it
    // so the merchant's next storefront visit reflects the change (type
    // switches, name, logo…) instead of painting the stale snapshot.
    const slugsToClear = new Set([shopDetails?.slug, newSlug].filter(Boolean) as string[]);
    slugsToClear.forEach((slug) => clearPageCache(`storefront:${slug}`));
    void fetchShopDetails();
    return true;
  };

  const convertCurrency = useCallback((amount: number | null | undefined, fromCurrency: string | null = 'ALL', toCurrency?: string) => {
    const numericAmount = amount ?? 0;
    // Coerce a null/empty source currency to ALL (products store prices in ALL).
    // A default parameter only applies to `undefined`, not `null`, so do it explicitly.
    const from = fromCurrency || 'ALL';
    // Ensure targetCurrency is always a valid string, defaulting to shopDetails.currency or 'USD'
    const targetCurrency = toCurrency || shopDetails?.currency || 'USD';


    // Crucial: Ensure shopDetails and exchangeRates are available for conversion
    if (!shopDetails || !exchangeRates) {
      return numericAmount;
    }

    // If source and target currencies are the same, no conversion needed
    if (from === targetCurrency) {
      return numericAmount;
    }

    const fromRate = exchangeRates[from];
    const toRate = exchangeRates[targetCurrency];

    if (!fromRate || !toRate) {
      console.warn(`convertCurrency: Missing exchange rate for conversion from ${from} to ${targetCurrency}. Returning original amount.`, { amount, fromCurrency, toCurrency, exchangeRates });
      return numericAmount;
    }

    // Rates are ALL-based: rate[X] means 1 ALL = X of currency X
    // To convert from A to B: amount_in_B = amount_in_A * (rate[B] / rate[A])
    const convertedAmount = numericAmount * (toRate / fromRate);
    
    return Math.round(convertedAmount * 100) / 100;
  }, [shopDetails, exchangeRates]); // Add shopDetails to dependencies

  return (
    <ShopContext.Provider value={{ shopDetails, isLoading, updateShopDetails, fetchShopDetails, exchangeRates, convertCurrency }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};