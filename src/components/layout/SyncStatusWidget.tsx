import { useState, useEffect } from 'react';
import { useSync } from '@/contexts/SyncContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, X, Info } from 'lucide-react';
import { SyncSummaryModal } from './SyncSummaryModal';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';

const formatTime = (ms: number) => {
  if (ms < 0 || !isFinite(ms) || isNaN(ms)) return '...';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

const AnalysisDetails = ({ analysisResult }: { analysisResult: any }) => {
    if (!analysisResult || !analysisResult.isProductPost) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground text-center py-2">
                AI determined this is not a product post.
            </motion.div>
        );
    }

    const details = [
        { label: "Name", value: analysisResult.productName },
        { label: "Category", value: analysisResult.categoryName },
        { label: "Type", value: analysisResult.typeName },
        { label: "Price", value: analysisResult.price ? `${analysisResult.price} ${analysisResult.currency || ''}`.trim() : null },
    ].filter(d => d.value);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { y: 10, opacity: 0 },
        visible: { y: 0, opacity: 1 },
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-1">
            {details.map(detail => (
                <motion.div key={detail.label} variants={itemVariants} className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">{detail.label}</span>
                    <span className="font-medium text-right">{detail.value}</span>
                </motion.div>
            ))}
        </motion.div>
    );
};

export const SyncStatusWidget = () => {
  const { activeJob, dismissJob } = useSync();
  const [elapsedTime, setElapsedTime] = useState('0m 00s');
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isAborting, setIsAborting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [subProgress, setSubProgress] = useState(0);

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

  useEffect(() => {
    let timer: number;
    if (activeJob && (activeJob.status === 'in_progress' || activeJob.status === 'starting')) {
        setSubProgress(0);
        const duration = 3000;
        const startTime = Date.now();
        
        const update = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(100, (elapsed / duration) * 100);
            setSubProgress(progress);
            if (progress < 100) {
                timer = requestAnimationFrame(update);
            }
        };
        timer = requestAnimationFrame(update);
    }
    return () => cancelAnimationFrame(timer);
  }, [activeJob?.progress]);

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

  return (
    <>
      <SyncSummaryModal job={activeJob} isOpen={isSummaryOpen} onClose={() => setIsSummaryOpen(false)} />
      <AnimatePresence>
        {isVisible && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-4 left-4 z-50 w-80"
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
          >
            <Card className="shadow-lg overflow-hidden relative">
              <AnimatePresence>
                {isHovered && isRunning && activeJob?.thumbnail_url && (
                  <motion.div layoutId="sync-thumbnail" className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 p-1 bg-background/80 backdrop-blur-lg rounded-lg shadow-lg">
                    <img src={activeJob.thumbnail_url} alt="Post thumbnail" className="h-20 w-20 rounded-md object-cover" />
                  </motion.div>
                )}
              </AnimatePresence>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start gap-3">
                  {isRunning && activeJob?.thumbnail_url && !isHovered && (
                    <motion.div layoutId="sync-thumbnail">
                      <img src={activeJob.thumbnail_url} alt="Post thumbnail" className="h-10 w-10 rounded-md object-cover" />
                    </motion.div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between"><h3 className="text-sm font-semibold truncate">Product Syncing</h3><Icon className={`h-4 w-4 flex-shrink-0 ${currentStatus.color} ${isRunning ? 'animate-spin' : ''}`} /></div>
                    <div className="flex justify-between text-xs text-muted-foreground"><span>{activeJob?.progress || 0} / {activeJob?.total || 0}</span><span>{isFinished ? `Finished in ${totalTime}` : elapsedTime}</span></div>
                  </div>
                </div>
                <AnimatePresence>
                  {isHovered && isRunning && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2 space-y-2">
                      {activeJob?.current_post_caption && (<div className="space-y-1"><Label className="text-xs">Current Post</Label><ScrollArea className="h-16 p-2 border rounded-md"><p className="text-xs text-muted-foreground whitespace-pre-wrap">{activeJob.current_post_caption}</p></ScrollArea></div>)}
                      <div className="space-y-1"><Label className="text-xs">AI Analysis</Label><Progress value={subProgress} className="h-1" />{activeJob?.analysis_result && subProgress > 50 && (<div className="pt-1"><AnalysisDetails analysisResult={activeJob.analysis_result} /></div>)}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="pt-1 space-y-1"><Label className="text-xs">Overall Progress</Label><Progress value={percentage} className="h-1.5" /></div>
                {isFinished ? (<div className="flex gap-2 pt-1"><Button size="sm" className="flex-1" onClick={() => setIsSummaryOpen(true)}><Info className="mr-2 h-4 w-4" />Details</Button><Button size="icon" variant="ghost" onClick={dismissJob} className="h-8 w-8 flex-shrink-0"><X className="h-4 w-4" /></Button></div>) : (<div className="pt-1"><Button size="sm" variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleAbort} disabled={isAborting}>{isAborting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}Abort Sync</Button></div>)}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};