import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ShopDetails {
  shop_name: string;
  logo_url: string;
  favicon_url: string;
}

interface ShopContextType {
  shopDetails: ShopDetails | null;
  isLoading: boolean;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider = ({ children }: { children: ReactNode }) => {
  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchShopDetails = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('instagram-profile');
      if (error || data.error) {
        console.error("Failed to fetch shop details:", error || data.error);
        setShopDetails({
          shop_name: 'InstaShopify',
          logo_url: '',
          favicon_url: '/favicon.ico',
        });
      } else {
        setShopDetails(data);
      }
      setIsLoading(false);
    };

    fetchShopDetails();
  }, []);

  return (
    <ShopContext.Provider value={{ shopDetails, isLoading }}>
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