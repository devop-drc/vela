import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { DesignSettings } from './AppearanceContext'; // Re-use DesignSettings type
import { StorefrontAnnouncement } from '@/types/storefront';

interface ShopDetails {
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
  interval_repetitions?: number | null; // New field
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

interface StorefrontContextType {
  shopDetails: ShopDetails | null;
  appearanceSettings: DesignSettings | null;
  products: Product[];
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  hasMoreProducts: boolean;
  fetchMoreProducts: () => Promise<void>;
  isLoadingMore: boolean;
  bestSellers: TopProduct[]; // New: Best selling products
  recommendedProducts: Product[]; // New: Recommended products
  exchangeRates: ExchangeRates | null; // Add exchangeRates to context type
  convertCurrency: (amount: number | null | undefined, fromCurrency?: string) => number; // Add convertCurrency
  promotions: Promotion[]; // New: Active promotions
  marqueeElements: StorefrontAnnouncement[]; // New: Marquee elements
}

const StorefrontContext = createContext<StorefrontContextType | undefined>(undefined);

// Helper to generate a URL-friendly slug
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric characters except spaces and hyphens
    .trim()
    .replace(/\s+/g, '-'); // Replace spaces with single hyphens
};

const PRODUCTS_PER_PAGE = 12; // Define a constant for limit

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

  // Fetch exchange rates once on mount
  useEffect(() => {
    const fetchRates = async () => {
      const { data, error } = await supabase.functions.invoke('exchange-rates');
      if (error || (data && data.error)) {
        const errorMessage = error?.message || (data && data.error) || "An unknown error occurred.";
        console.error("Failed to fetch exchange rates for storefront:", errorMessage);
        showError(`Could not load currency rates for storefront: ${errorMessage}`);
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

    if (pageToFetch === 1) {
      setIsLoading(true);
      setProducts([]); // Clear products for initial load
      setHasMoreProducts(true); // Assume more until proven otherwise
      setCurrentPage(1);
      setBestSellers([]); // Clear best sellers for initial load
      setRecommendedProducts([]); // Clear recommended products for initial load
      setPromotions([]); // Clear promotions for initial load
      setMarqueeElements([]); // Clear marquee elements for initial load
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('get-public-shop-data', {
        body: { shopSlug, page: pageToFetch, limit: PRODUCTS_PER_PAGE },
      });

      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);

      console.log("Fetched shopDetails from get-public-shop-data:", data.shopDetails); // Debug log
      console.log("Fetched appearanceSettings from get-public-shop-data:", data.appearanceSettings); // Debug log

      setShopDetails({
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
      });
      setAppearanceSettings(data.appearanceSettings);

      if (pageToFetch === 1) {
        setProducts(data.products);
        setBestSellers(data.bestSellers || []); // Set best sellers
        setRecommendedProducts(data.recommendedProducts || []); // Set recommended products
        setPromotions(data.promotions || []); // Set promotions
        setMarqueeElements(data.marqueeElements || []); // Set marquee elements
      } else {
        setProducts(prevProducts => [...prevProducts, ...data.products]);
      }
      setHasMoreProducts(data.hasMore);

    } catch (err: any) {
      console.error("Failed to fetch storefront data:", err);
      showError(`Failed to load shop: ${err.message || "An unknown error occurred."}`);
      setError(err.message || "An unknown error occurred.");
    } finally {
      if (pageToFetch === 1) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [shopSlug]);

  const fetchMoreProducts = useCallback(async () => {
    if (!hasMoreProducts || isLoading || isLoadingMore) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await fetchStorefrontData(nextPage);
  }, [currentPage, hasMoreProducts, isLoading, isLoadingMore, fetchStorefrontData]);

  useEffect(() => {
    fetchStorefrontData(1); // Initial fetch on mount or shopSlug change
  }, [fetchStorefrontData]);

  const convertCurrency = useCallback((amount: number | null | undefined, fromCurrency?: string, toCurrency?: string) => {
    const numericAmount = amount ?? 0;
    // Ensure targetCurrency is always a valid string, defaulting to shopDetails.currency or 'USD'
    const targetCurrency = toCurrency || shopDetails?.currency || 'USD'; 

    console.log("convertCurrency: Initiating conversion.", { amount, fromCurrency, toCurrency, targetCurrency, shopDetails, exchangeRates });

    // Crucial: Ensure shopDetails and exchangeRates are available for conversion
    if (!shopDetails || !exchangeRates) {
      console.log("convertCurrency: Missing shopDetails or exchangeRates. Returning original amount.", { amount, fromCurrency, toCurrency, shopDetails, exchangeRates });
      return numericAmount;
    }

    // If source and target currencies are the same, no conversion needed
    if (fromCurrency === targetCurrency) {
      console.log("convertCurrency: Source and target currencies are the same. Returning original amount.", { amount, fromCurrency, toCurrency, convertedAmount: numericAmount });
      return numericAmount;
    }

    const fromRate = exchangeRates[fromCurrency];
    const toRate = exchangeRates[targetCurrency];

    if (!fromRate || !toRate) {
      console.warn(`convertCurrency: Missing exchange rate for conversion from ${fromCurrency} to ${targetCurrency}. Returning original amount.`, { amount, fromCurrency, toCurrency, exchangeRates });
      return numericAmount;
    }

    // Rates are ALL-based: rate[X] means 1 ALL = X of currency X
    // To convert from A to B: amount_in_B = amount_in_A * (rate[B] / rate[A])
    const convertedAmount = numericAmount * (toRate / fromRate);
    
    console.log(`convertCurrency: Converting ${numericAmount} ${fromCurrency} to ${targetCurrency}. Rates: ${fromCurrency}=${fromRate}, ${targetCurrency}=${toRate}. Converted: ${convertedAmount.toFixed(2)}`);
    return Math.round(convertedAmount * 100) / 100;
  }, [shopDetails, exchangeRates]); // Add shopDetails to dependencies

  const contextValue: StorefrontContextType = {
    shopDetails,
    appearanceSettings,
    products,
    isLoading,
    error,
    currentPage,
    hasMoreProducts,
    fetchMoreProducts,
    isLoadingMore,
    bestSellers, // Provide best sellers
    recommendedProducts, // Provide recommended products
    exchangeRates, // Provide exchange rates
    convertCurrency, // Provide convertCurrency
    promotions, // Provide promotions
    marqueeElements, // Provide marquee elements
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