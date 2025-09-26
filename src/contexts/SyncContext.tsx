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
  current_post_caption?: string;
  ai_analysis_message?: string;
  analysis_result?: any;
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
  const userId = session?.user?.id;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } = {} } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setActiveJob(null);
      return;
    }

    let channel: RealtimeChannel | null = null;

    const setupSync = async () => {
      const { data: initialJob, error } = await supabase
        .from('sync_jobs')
        .select('*')
        .eq('user_id', userId)
        .or('status.eq.starting,status.eq.in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error("Error fetching initial sync job:", error);
      } else if (initialJob) {
        setActiveJob(initialJob as SyncJob);
      }

      channel = supabase.channel(`sync_jobs:${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sync_jobs', filter: `user_id=eq.${userId}` },
          (payload) => {
            const newJob = payload.new as SyncJob;
            const dismissedJobId = sessionStorage.getItem('dismissed_sync_job_id');

            // If the new job is currently active (starting or in_progress), always show it.
            // The dismissedJobId only applies to completed/failed jobs.
            if (['starting', 'in_progress'].includes(newJob.status)) {
                setActiveJob(newJob);
                sessionStorage.removeItem('dismissed_sync_job_id'); // Clear dismissal if job becomes active again
            } else if (newJob.id === dismissedJobId) {
                // If it's a completed/failed job that was dismissed, keep it dismissed.
                return;
            } else {
                // For other completed/failed jobs, show them if no job is currently active.
                setActiveJob(newJob);
            }
          }
        )
        .subscribe();
    };
    
    setupSync();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

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