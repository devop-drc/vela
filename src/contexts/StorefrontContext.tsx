import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { DesignSettings } from './AppearanceContext'; // Re-use DesignSettings type

interface ShopDetails {
  id: string;
  name: string;
  shop_name: string;
  slug: string; // Include slug in ShopDetails
  logo_url: string;
  favicon_url: string;
  currency: string;
  headline?: string;
  about?: string;
  contact_email?: string;
  followers_count?: number;
  media_count?: number;
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

      setShopDetails(data.shopDetails);
      setAppearanceSettings(data.appearanceSettings);

      if (pageToFetch === 1) {
        setProducts(data.products);
        setBestSellers(data.bestSellers || []); // Set best sellers
        setRecommendedProducts(data.recommendedProducts || []); // Set recommended products
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