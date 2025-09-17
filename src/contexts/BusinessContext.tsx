import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface Business {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

interface BusinessContextType {
  business: Business | null;
  isLoading: boolean;
  createBusiness: (name: string) => Promise<void>;
  refetch: () => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider = ({ children }: { children: ReactNode }) => {
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    return () => subscription.unsubscribe();
  }, []);

  const fetchBusiness = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      setBusiness(null);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Error fetching business:", error);
    }
    setBusiness(data);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  const createBusiness = async (name: string) => {
    if (!user) throw new Error("User must be logged in to create a business.");
    const { data, error } = await supabase
      .from('businesses')
      .insert({ name, user_id: user.id })
      .select()
      .single();
    
    if (error) throw error;
    
    setBusiness(data);
  };

  return (
    <BusinessContext.Provider value={{ business, isLoading, createBusiness, refetch: fetchBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};