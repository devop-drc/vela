import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface SyncJob {
  id: string;
  status: 'starting' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  total: number;
  message: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}

interface SyncContextType {
  activeJob: SyncJob | null;
  isSyncing: boolean;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [activeJob, setActiveJob] = useState<SyncJob | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel | undefined;
    let timeoutId: NodeJS.Timeout;

    const setupChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch any active job on initial load
        const { data: initialJob } = await supabase
          .from('sync_jobs')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['starting', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (initialJob) setActiveJob(initialJob as SyncJob);

        channel = supabase.channel('sync_jobs_user_' + user.id)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'sync_jobs', filter: `user_id=eq.${user.id}` },
            (payload) => {
              const job = payload.new as SyncJob;
              if (job.status === 'in_progress' || job.status === 'starting') {
                setActiveJob(job);
              } else {
                // Keep completed/failed job visible for a few seconds
                setActiveJob(job);
                timeoutId = setTimeout(() => {
                  setActiveJob(null);
                }, 8000);
              }
            }
          )
          .subscribe();
      }
    };

    setupChannel();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <SyncContext.Provider value={{ activeJob, isSyncing: !!activeJob && ['starting', 'in_progress'].includes(activeJob.status) }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};