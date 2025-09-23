import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, Session } from '@supabase/supabase-js';

interface SyncJob {
  id: string;
  status: 'starting' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  total: number;
  message: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
  summary?: any;
}

interface SyncContextType {
  activeJob: SyncJob | null;
  isSyncing: boolean;
  dismissJob: () => void;
  startNewSync: (jobId: string) => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [activeJob, setActiveJob] = useState<SyncJob | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setActiveJob(null);
      return;
    }

    let channel: RealtimeChannel | null = null;
    let isMounted = true;
    const userId = session.user.id;

    const setupSync = async () => {
      const { data: initialJob } = await supabase
        .from('sync_jobs')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['starting', 'in_progress', 'completed', 'failed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!isMounted) return;

      const dismissedJobId = sessionStorage.getItem('dismissed_sync_job_id');
      if (initialJob && initialJob.id !== dismissedJobId) {
        setActiveJob(initialJob as SyncJob);
      }

      channel = supabase.channel(`sync_jobs:${userId}:${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sync_jobs', filter: `user_id=eq.${userId}` },
          (payload) => {
            const newJob = payload.new as SyncJob;
            sessionStorage.removeItem('dismissed_sync_job_id');
            setActiveJob(newJob);
          }
        )
        .subscribe();
    };

    setupSync();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [session]);

  const startNewSync = async (jobId: string) => {
    const { data: newJob, error } = await supabase
      .from('sync_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error) {
      console.error("Failed to fetch newly created sync job:", error);
      return;
    }

    if (newJob) {
      sessionStorage.removeItem('dismissed_sync_job_id');
      setActiveJob(newJob as SyncJob);
    }
  };

  const dismissJob = () => {
    if (activeJob) {
        sessionStorage.setItem('dismissed_sync_job_id', activeJob.id);
    }
    setActiveJob(null);
  };

  return (
    <SyncContext.Provider value={{ activeJob, isSyncing: !!activeJob && ['starting', 'in_progress'].includes(activeJob.status), dismissJob, startNewSync }}>
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