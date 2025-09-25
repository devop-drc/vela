import { useState, useEffect } from 'react';
import { useSync } from '@/contexts/SyncContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, X, Info, Sparkles } from 'lucide-react';
import { SyncSummaryModal } from './SyncSummaryModal';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { ScrollArea } from '../ui/scroll-area';

const formatTime = (ms: number) => {
  if (ms < 0 || !isFinite(ms) || isNaN(ms)) return '...';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

export const SyncStatusWidget = () => {
  const { activeJob, dismissJob } = useSync();
  const [elapsedTime, setElapsedTime] = useState('0m 00s');
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isAborting, setIsAborting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let interval: number | undefined;
    if (activeJob && (activeJob.status === 'in_progress' || activeJob.status === 'starting')) {
      const startTime = new Date(activeJob.created_at).getTime();
      setElapsedTime(formatTime(Date.now() - startTime));
      interval = setInterval(() => {
        setElapsedTime(formatTime(Date.now() - startTime));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeJob]);

  const handleAbort = async () => {
    if (!activeJob) return;
    setIsAborting(true);
    const { error } = await supabase.from('sync_jobs').update({ status: 'failed', message: 'Sync aborted by user.' }).eq('id', activeJob.id);
    if (error) showError(`Failed to abort sync: ${error.message}`);
    else showSuccess("Sync aborted.");
    setIsAborting(false);
  };

  const isVisible = activeJob !== null;
  const isRunning = activeJob?.status === 'in_progress' || activeJob?.status === 'starting';
  const isFinished = activeJob?.status === 'completed' || activeJob?.status === 'failed';
  const percentage = activeJob && activeJob.total > 0 ? (activeJob.progress / activeJob.total) * 100 : (activeJob?.status === 'completed' ? 100 : 0);

  const statusInfo = {
    starting: { icon: Loader2, color: 'text-muted-foreground' },
    in_progress: { icon: Loader2, color: 'text-muted-foreground' },
    completed: { icon: CheckCircle, color: 'text-emerald-500' },
    failed: { icon: XCircle, color: 'text-destructive' },
  };
  const currentStatus = statusInfo[activeJob?.status || 'starting'];
  const Icon = currentStatus.icon;
  const totalTime = isFinished ? formatTime(new Date(activeJob.updated_at).getTime() - new Date(activeJob.created_at).getTime()) : '...';
  const summary = activeJob?.summary || {};

  return (
    <>
      <SyncSummaryModal job={activeJob} isOpen={isSummaryOpen} onClose={() => setIsSummaryOpen(false)} />
      <AnimatePresence>
        {isVisible && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-4 z-50 w-80"
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
          >
            <Card className="shadow-lg overflow-hidden">
              <AnimatePresence>
                {isHovered && isRunning && activeJob?.thumbnail_url && (
                  <motion.div layout="position" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <img src={activeJob.thumbnail_url} alt="Post thumbnail" className="h-40 w-full object-cover" />
                  </motion.div>
                )}
              </AnimatePresence>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold truncate">Product Syncing</h3>
                  <Icon className={`h-4 w-4 flex-shrink-0 ${currentStatus.color} ${isRunning ? 'animate-spin' : ''}`} />
                </div>
                <AnimatePresence>
                  {isHovered && isRunning && activeJob?.current_post_caption && (
                    <motion.div layout="position" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      <ScrollArea className="h-20 my-2"><p className="text-xs text-muted-foreground whitespace-pre-wrap">{activeJob.current_post_caption}</p></ScrollArea>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Progress value={percentage} className="h-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{activeJob?.progress || 0} / {activeJob?.total || 0}</span>
                  <span>{isFinished ? `Finished in ${totalTime}` : elapsedTime}</span>
                </div>
                <AnimatePresence>
                  {isHovered && isRunning && activeJob?.ai_analysis_message && (
                    <motion.div layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-2 border-t border-dashed flex items-center gap-2 text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      <p>{activeJob.ai_analysis_message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                {isFinished && (
                  <div className="pt-2 border-t border-dashed">
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span>Created:</span> <span className="font-medium">{summary.created || 0}</span></div>
                      <div className="flex justify-between"><span>Updated:</span> <span className="font-medium">{summary.updated || 0}</span></div>
                      <div className="flex justify-between"><span>Skipped:</span> <span className="font-medium">{summary.skipped || 0}</span></div>
                    </div>
                  </div>
                )}
                {isFinished ? (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1" onClick={() => setIsSummaryOpen(true)}><Info className="mr-2 h-4 w-4" />Details</Button>
                    <Button size="icon" variant="ghost" onClick={dismissJob} className="h-8 w-8 flex-shrink-0"><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="pt-1">
                    <Button size="sm" variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleAbort} disabled={isAborting}>
                      {isAborting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                      Abort Sync
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};