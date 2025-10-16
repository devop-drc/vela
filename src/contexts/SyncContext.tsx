import { useState, useEffect, ReactNode, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, Session } from '@supabase/supabase-js';
import { SyncJob, SyncContextType } from '@/types/sync';
import { SyncContext } from './syncContext';

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
        .maybeSingle();
      
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
            const newJobData = payload.new as SyncJob;
            const dismissedJobId = sessionStorage.getItem('dismissed_sync_job_id');

            if (newJobData.id === dismissedJobId && ['completed', 'failed'].includes(newJobData.status)) {
              return; // Do not show a job that has been explicitly dismissed.
            }

            setActiveJob(prevJob => {
              // If there's no previous job or the incoming job is different, just set the new job.
              if (!prevJob || prevJob.id !== newJobData.id) {
                return newJobData;
              }

              // If it's the same job, merge the states to prevent stale data.
              // This creates a new object, guaranteeing a re-render.
              return {
                ...prevJob,
                ...newJobData,
                // Explicitly handle the analysis_result to prevent staleness.
                // If the new payload doesn't have an analysis_result, it means we've moved to the next item.
                analysis_result: newJobData.analysis_result || null,
              };
            });

            // If a job becomes active again, clear any dismissal flag for it.
            if (['starting', 'in_progress'].includes(newJobData.status)) {
              sessionStorage.removeItem('dismissed_sync_job_id');
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
      // We only set to null if the job is finished. If it's running, let the user abort.
      if (['completed', 'failed'].includes(activeJob.status)) {
        setActiveJob(null);
      }
    }
  };

  return (
    <SyncContext.Provider value={{ activeJob, isSyncing: !!activeJob && ['starting', 'in_progress'].includes(activeJob.status), dismissJob, startNewSync }}>
      {children}
    </SyncContext.Provider>
  );
};

// useSync hook has been moved to @/hooks/useSync
export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};s