import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { isDemoFrame } from '@/lib/isDemoFrame';
import { SyncContextType, SyncJob } from '@/types/sync';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const SyncContext = createContext<SyncContextType | undefined>(undefined);

interface SyncProviderProps {
  children: ReactNode;
}

export const SyncProvider = ({ children }: SyncProviderProps) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (isDemoFrame()) return; // demo/preview iframes run on mock data
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  const [activeJob, setActiveJob] = useState<SyncJob | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch active sync jobs for the current user
  const fetchActiveJob = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sync_jobs')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['starting', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching active job:', error);
        return;
      }

      const activeJob = data?.[0];

      if (activeJob) {
        setActiveJob(activeJob);
        setIsSyncing(true);
      } else {
        setActiveJob(null);
        setIsSyncing(false);
      }
    } catch (error) {
      console.error('Error in fetchActiveJob:', error);
      setIsSyncing(false);
    }
  }, [user]);

  // Set up real-time subscription for sync jobs
  useEffect(() => {
    if (isDemoFrame()) return; // demo/preview iframes run on mock data
    if (!user) return;

    // Initial fetch
    fetchActiveJob();

    // Set up real-time subscription
    const subscription = supabase
      .channel(`sync-jobs:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_jobs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (['INSERT', 'UPDATE'].includes(payload.eventType)) {
            // Create a shallow copy to ensure React detects a state change
            const job = { ...payload.new } as SyncJob;
            setActiveJob(job);
            setIsSyncing(['starting', 'in_progress'].includes(job.status));
          } else if (payload.eventType === 'DELETE') {
            setActiveJob(null);
            setIsSyncing(false);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, fetchActiveJob]);

  const dismissJob = useCallback(() => {
    setActiveJob(null);
  }, []);

  const startNewSync = useCallback(async (jobId: string) => {
    // Optimistic: show the widget immediately with a placeholder job
    setIsSyncing(true);
    setActiveJob({
      id: jobId,
      user_id: user?.id || '',
      status: 'starting',
      progress: 0,
      total: 0,
      message: 'Initiating sync...',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    // Real-time subscription will replace this with actual data from DB
  }, [user]);

  const contextValue: SyncContextType = {
    activeJob,
    isSyncing,
    dismissJob,
    startNewSync
  };

  return React.createElement(SyncContext.Provider, { value: contextValue }, children);
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
