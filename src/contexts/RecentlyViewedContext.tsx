import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

export interface RecentlyViewedProduct {
  id: string;
  name: string;
  media_url: string;
  price: number;
  currency: string;
  shopSlug: string;
  viewedAt: string;
}

interface RecentlyViewedContextType {
  recentlyViewed: RecentlyViewedProduct[];
  addRecentlyViewed: (product: Omit<RecentlyViewedProduct, 'viewedAt'>) => void;
  clearRecentlyViewed: () => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextType | undefined>(undefined);

const RECENTLY_VIEWED_STORAGE_KEY = 'storefront_recently_viewed';
const MAX_RECENTLY_VIEWED = 5; // Limit to 5 recently viewed products

export const RecentlyViewedProvider = ({ children }: { children: ReactNode }) => {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(recentlyViewed));
    }
  }, [recentlyViewed]);

  const addRecentlyViewed = useCallback((product: Omit<RecentlyViewedProduct, 'viewedAt'>) => {
    setRecentlyViewed(prev => {
      // Remove if already exists to move it to the front
      const filtered = prev.filter(item => item.id !== product.id);
      const newProduct = { ...product, viewedAt: new Date().toISOString() };
      return [newProduct, ...filtered].slice(0, MAX_RECENTLY_VIEWED);
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    setRecentlyViewed([]);
  }, []);

  const contextValue: RecentlyViewedContextType = {
    recentlyViewed,
    addRecentlyViewed,
    clearRecentlyViewed,
  };

  return (
    <RecentlyViewedContext.Provider value={contextValue}>
      {children}
    </RecentlyViewedContext.Provider>
  );
};

export const useRecentlyViewed = () => {
  const context = useContext(RecentlyViewedContext);
  if (context === undefined) {
    throw new Error('useRecentlyViewed must be used within a RecentlyViewedProvider');
  }
  return context;
};