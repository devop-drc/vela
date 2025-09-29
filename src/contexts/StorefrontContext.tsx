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
}

interface StorefrontContextType {
  shopDetails: ShopDetails | null;
  appearanceSettings: DesignSettings | null;
  products: Product[];
  isLoading: boolean;
  error: string | null;
}

const StorefrontContext = createContext<StorefrontContextType | undefined>(undefined);

export const StorefrontProvider = ({ children }: { children: ReactNode }) => {
  const { shopSlug } = useParams<{ shopSlug: string }>(); // Change to shopSlug
  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null);
  const [appearanceSettings, setAppearanceSettings] = useState<DesignSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStorefrontData = useCallback(async () => {
    if (!shopSlug) { // Use shopSlug here
      setError("Shop slug is missing from the URL.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('get-public-shop-data', {
        body: { shopSlug }, // Pass shopSlug to the edge function
      });

      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);

      setShopDetails(data.shopDetails);
      setAppearanceSettings(data.appearanceSettings);
      setProducts(data.products);

    } catch (err: any) {
      console.error("Failed to fetch storefront data:", err);
      showError(`Failed to load shop: ${err.message || "An unknown error occurred."}`);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [shopSlug]); // Depend on shopSlug

  useEffect(() => {
    fetchStorefrontData();
  }, [fetchStorefrontData]);

  const contextValue: StorefrontContextType = {
    shopDetails,
    appearanceSettings,
    products,
    isLoading,
    error,
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