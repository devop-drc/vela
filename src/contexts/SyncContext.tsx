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
}

interface SyncContextType {
  activeJob: SyncJob | null;
  isSyncing: boolean;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [activeJob, setActiveJob] = useState<SyncJob | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // 1. Listen for authentication state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setActiveJob(null); // Clear job on logout
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Set up the real-time channel only when a session exists
  useEffect(() => {
    let channel: RealtimeChannel | undefined;
    let timeoutId: NodeJS.Timeout;

    const setupChannel = async () => {
      if (session?.user) {
        // Fetch any active job on initial load or user change
        const { data: initialJob } = await supabase
          .from('sync_jobs')
          .select('*')
          .eq('user_id', session.user.id)
          .in('status', ['starting', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        setActiveJob(initialJob as SyncJob | null);

        channel = supabase.channel('sync_jobs_user_' + session.user.id)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'sync_jobs', filter: `user_id=eq.${session.user.id}` },
            (payload) => {
              const job = payload.new as SyncJob;
              if (job.status === 'in_progress' || job.status === 'starting') {
                setActiveJob(job);
              } else {
                // Keep completed/failed job visible for a few seconds
                setActiveJob(job);
                if (timeoutId) clearTimeout(timeoutId);
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
  }, [session]); // Re-run this effect whenever the session changes

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