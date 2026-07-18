import { createContext, useCallback, useContext, useEffect, useMemo, useRef, ReactNode } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';

// Single shared realtime channel for the whole admin (PERF_AUDIT.md §3.3):
// one `hub:{businessId}` channel replaces the per-component channels for
// orders / order_disputes / products. Consumers register handlers via
// subscribe(); handlers get the raw postgres_changes payload and filter
// eventType themselves.

export type HubTable = 'orders' | 'order_disputes' | 'products';
export type HubPayload = RealtimePostgresChangesPayload<Record<string, unknown>>;
type HubHandler = (payload: HubPayload) => void;

interface RealtimeHubContextType {
  subscribe: (table: HubTable, handler: HubHandler) => () => void;
}

const RealtimeHubContext = createContext<RealtimeHubContextType | undefined>(undefined);

export const RealtimeHubProvider = ({ children }: { children: ReactNode }) => {
  const { shopDetails } = useShop();
  const businessId = shopDetails?.id;

  // Handler registry lives in a ref so subscribe/unsubscribe never touches the
  // channel (adding postgres_changes callbacks after subscribe() throws).
  const handlersRef = useRef<Record<HubTable, Set<HubHandler>>>({
    orders: new Set(),
    order_disputes: new Set(),
    products: new Set(),
  });

  useEffect(() => {
    if (!businessId) return;

    const dispatch = (table: HubTable) => (payload: HubPayload) => {
      handlersRef.current[table].forEach((handler) => handler(payload));
    };

    const channel = supabase
      .channel(`hub:${businessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` }, dispatch('orders'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_disputes', filter: `business_id=eq.${businessId}` }, dispatch('order_disputes'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `business_id=eq.${businessId}` }, dispatch('products'))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  const subscribe = useCallback((table: HubTable, handler: HubHandler) => {
    handlersRef.current[table].add(handler);
    return () => {
      handlersRef.current[table].delete(handler);
    };
  }, []);

  const value = useMemo(() => ({ subscribe }), [subscribe]);

  return (
    <RealtimeHubContext.Provider value={value}>
      {children}
    </RealtimeHubContext.Provider>
  );
};

export const useRealtimeHub = () => {
  const context = useContext(RealtimeHubContext);
  if (context === undefined) {
    throw new Error('useRealtimeHub must be used within a RealtimeHubProvider');
  }
  return context;
};
