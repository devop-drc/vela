import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface ShopDetails {
  shop_name: string;
  logo_url: string;
  favicon_url: string;
  currency: string;
  headline?: string;
  about?: string;
  contact_email?: string;
  followers_count?: number;
  media_count?: number;
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
  convertCurrency: (amount: number | null | undefined) => number;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider = ({ children }: { children: ReactNode }) => {
  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      const { data, error } = await supabase.functions.invoke('exchange-rates');
      if (error || data.error) {
        console.error("Failed to fetch exchange rates", error || data.error);
        showError("Could not load currency conversion rates.");
      } else {
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

    const { data: business } = await supabase.from('businesses').select('id').eq('user_id', user.id).single();
    if (!business) {
      setIsLoading(false);
      return;
    }

    const { data: dbDetails } = await supabase.from('shop_details').select('*').eq('business_id', business.id).single();
    const { data: igDetails, error: igError } = await supabase.functions.invoke('instagram-profile');
    if (igError || igDetails.error) {
      console.error("Failed to fetch Instagram details:", igError || igDetails.error);
    }

    const finalDetails: ShopDetails = {
      shop_name: dbDetails?.shop_name || igDetails?.shop_name || 'Your Shop',
      logo_url: igDetails?.logo_url || '',
      favicon_url: igDetails?.favicon_url || '/favicon.ico',
      currency: dbDetails?.currency || 'USD',
      headline: dbDetails?.headline || '',
      about: dbDetails?.about || igDetails?.description || '',
      contact_email: dbDetails?.contact_email || user.email || '',
      followers_count: igDetails?.followers_count,
      media_count: igDetails?.media_count,
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

    const { error } = await supabase.from('shop_details').upsert({ ...details, business_id: business.id }, { onConflict: 'business_id' });
    
    if (error) {
      showError(`Failed to update settings: ${error.message}`);
      return false;
    } else {
      await fetchShopDetails();
      return true;
    }
  };

  const convertCurrency = (amount: number | null | undefined) => {
    const numericAmount = amount ?? 0;
    if (!shopDetails || !exchangeRates || !shopDetails.currency) {
      return numericAmount;
    }
    const rate = exchangeRates[shopDetails.currency];
    if (!rate) {
      return numericAmount;
    }
    return numericAmount * rate;
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