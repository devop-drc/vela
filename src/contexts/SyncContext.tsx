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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setActiveJob(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let channel: RealtimeChannel | undefined;
    let timeoutId: NodeJS.Timeout;
    const userId = session?.user?.id;

    const setupChannel = async () => {
      if (userId) {
        const { data: initialJob } = await supabase
          .from('sync_jobs')
          .select('*')
          .eq('user_id', userId)
          .in('status', ['starting', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        setActiveJob(initialJob as SyncJob | null);

        channel = supabase.channel('sync_jobs_user_' + userId)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'sync_jobs', filter: `user_id=eq.${userId}` },
            (payload) => {
              const job = payload.new as SyncJob;
              if (job.status === 'in_progress' || job.status === 'starting') {
                setActiveJob(job);
              } else {
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
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [session?.user?.id]);

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