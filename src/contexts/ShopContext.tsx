import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

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
  convertCurrency: (amount: number | null | undefined, fromCurrency?: string) => number;
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

export const ShopProvider = ({ children }: { children: ReactNode }) => {
  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      const { data, error } = await supabase.functions.invoke('exchange-rates');
      if (error || (data && data.error)) {
        const errorMessage = error?.message || (data && data.error) || "An unknown error occurred.";
        console.error("Failed to fetch exchange rates:", errorMessage);
        showError(`Could not load currency rates: ${errorMessage}`);
      } else if (data) {
        setExchangeRates(data.rates);
      }
    };
    fetchRates();
  }, []);

  const fetchShopDetails = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses').select('id').eq('user_id', user.id).single();
    if (businessError || !business) {
      console.error("Could not find your business:", businessError);
      setIsLoading(false);
      return;
    }

    const { data: dbDetails } = await supabase.from('shop_details').select('*').eq('business_id', business.id).single();
    const { data: igDetails, error: igError } = await supabase.functions.invoke('instagram-profile', { body: { user_id: user.id } });
    if (igError || igDetails.error) {
      console.error("Failed to fetch Instagram details:", igError || igDetails.error);
    }

    const finalDetails: ShopDetails = {
      id: business.id, // Set the business ID here
      userId: user.id, // Set the user ID here
      shop_name: dbDetails?.shop_name || igDetails?.shop_name || 'Your Shop',
      slug: dbDetails?.slug || generateSlug(dbDetails?.shop_name || igDetails?.shop_name || 'your-shop'), // Use existing slug or generate
      logo_url: dbDetails?.logo_url || null, // Always pull from DB, which is now populated by storage
      favicon_url: dbDetails?.favicon_url || null, // Always pull from DB, which is now populated by storage
      currency: dbDetails?.currency || 'USD',
      headline: dbDetails?.headline || '',
      about: dbDetails?.about || igDetails?.description || '',
      contact_email: dbDetails?.contact_email || user.email || '',
      followers_count: igDetails?.followers_count,
      media_count: igDetails?.media_count,
      instagram_url: dbDetails?.instagram_url || igDetails?.instagram_url || null, // Prioritize DB, then IG
      username: igDetails?.username || null,
    };

    setShopDetails(finalDetails);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchShopDetails();
  }, [fetchShopDetails]);

  const updateShopDetails = async (details: Partial<ShopDetails>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showError("You must be logged in."); return false; }

    const { data: business } = await supabase.from('businesses').select('id').eq('user_id', user.id).single();
    if (!business) { showError("Could not find your business."); return false; }

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
      return false;
    } else {
      await fetchShopDetails();
      return true;
    }
  };

  const convertCurrency = (amount: number | null | undefined, fromCurrency?: string) => {
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
  };

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