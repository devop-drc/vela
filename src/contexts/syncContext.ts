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
  const [activeImportJob, setActiveImportJob] = useState<SyncJob | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const isImportJob = (j: SyncJob | null | undefined) => j?.summary?.job_kind === 'import';

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
        .limit(4);

      if (error) {
        console.error('Error fetching active job:', error);
        return;
      }

      const syncJob = (data || []).find((j: SyncJob) => !isImportJob(j)) ?? null;
      const importJob = (data || []).find((j: SyncJob) => isImportJob(j)) ?? null;
      setActiveJob(syncJob);
      setActiveImportJob(importJob);
      setIsSyncing(Boolean(syncJob));
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
            // Shallow copy so React detects a state change; import jobs get
            // their own slot so they never hijack the sync display.
            const job = { ...payload.new } as SyncJob;
            if (isImportJob(job)) {
              setActiveImportJob(job);
            } else {
              setActiveJob(job);
              setIsSyncing(['starting', 'in_progress'].includes(job.status));
            }
          } else if (payload.eventType === 'DELETE') {
            const gone = payload.old as { id?: string };
            setActiveJob((j) => (j && j.id === gone?.id ? null : j));
            setActiveImportJob((j) => (j && j.id === gone?.id ? null : j));
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

  const dismissImportJob = useCallback(() => {
    setActiveImportJob(null);
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
    activeImportJob,
    isSyncing,
    dismissJob,
    dismissImportJob,
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
