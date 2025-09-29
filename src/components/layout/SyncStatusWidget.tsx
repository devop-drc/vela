import { useState, useEffect } from 'react';
import { useSync } from '@/contexts/syncContext';
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
import { AnalysisResult, Attribute } from '@/types/analysis';

const formatTime = (ms: number) => {
  if (ms < 0 || !isFinite(ms) || isNaN(ms)) return '...';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

const AnalysisDetails = ({ analysisResult }: { analysisResult: AnalysisResult | null }) => {
    if (!analysisResult) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground text-center py-2">
                AI is analyzing...
            </motion.div>
        );
    }

    if (!analysisResult.isProductPost) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground text-center py-2">
                AI determined this is not a product post.
            </motion.div>
        );
    }

    const mainDetails = [
        { label: "Name", value: analysisResult.productName },
        { label: "Category", value: analysisResult.categoryName },
        { label: "Type", value: analysisResult.typeName },
        { label: "Price", value: analysisResult.price ? `${analysisResult.price} ${analysisResult.currency || ''}`.trim() : null },
    ].filter(d => d.value);

    const attributes = analysisResult.attributes || [];
    const options = attributes.filter((attr: Attribute) => attr.isOption);
    const specifications = attributes.filter((attr: Attribute) => !attr.isOption);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
    };

    const itemVariants = {
        hidden: { y: 10, opacity: 0 },
        visible: { y: 0, opacity: 1 },
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-2">
            <div>{mainDetails.map(detail => (<motion.div key={detail.label} variants={itemVariants} className="flex justify-between items-center text-sm"><span className="text-muted-foreground">{detail.label}</span><span className="font-medium text-right">{detail.value}</span></motion.div>))}</div>
            
            {options.length > 0 && (
                <div className="pt-1">
                    <Label className="text-xs">Options</Label>
                    <div className="space-y-1 mt-1">
                        {options.map((opt) => (
                            <motion.div 
                                key={opt.name} 
                                variants={itemVariants} 
                                className="flex justify-between items-center text-sm"
                            >
                                <span className="text-muted-foreground capitalize">
                                    {opt.name.replace(/_/g, ' ')}
                                </span>
                                <span className="font-medium text-right">
                                    {Array.isArray(opt.value) ? opt.value.join(', ') : opt.value}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
            {specifications.length > 0 && (
                <div className="pt-1">
                    <Label className="text-xs">Specifications</Label>
                    <div className="space-y-1 mt-1">
                        {specifications.map((spec) => (
                            <motion.div 
                                key={spec.name} 
                                variants={itemVariants} 
                                className="flex justify-between items-center text-sm"
                            >
                                <span className="text-muted-foreground capitalize">
                                    {spec.name.replace(/_/g, ' ')}
                                </span>
                                <span className="font-medium text-right">
                                    {Array.isArray(spec.value) ? spec.value.join(', ') : spec.value}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

interface StatusInfo {
  [key: string]: {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    label: string;
  };
}

export const SyncStatusWidget = () => {
  const { activeJob, dismissJob } = useSync();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isAborting, setIsAborting] = useState(false);

  useEffect(() => {
    if (!activeJob || !['in_progress', 'starting'].includes(activeJob.status)) {
      setElapsedTime(0);
      return;
    }

    const startTime = new Date(activeJob.created_at).getTime();
    const updateElapsed = () => {
      setElapsedTime(Date.now() - startTime);
    };
    updateElapsed();

    const intervalId = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeJob]);

  const handleAbort = async () => {
    if (!activeJob) return;
    setIsAborting(true);
    const { error } = await supabase
      .from('sync_jobs')
      .update({ status: 'failed', message: 'Sync aborted by user.' })
      .eq('id', activeJob.id);

    if (error) {
      showError(`Failed to abort sync: ${error.message}`);
    } else {
      showSuccess("Sync aborted.");
    }
    setIsAborting(false);
  };

  const isVisible = activeJob !== null;
  const isRunning = activeJob?.status === 'in_progress' || activeJob?.status === 'starting';
  const isFinished = activeJob?.status === 'completed' || activeJob?.status === 'failed';

  const statusInfo: StatusInfo = {
    starting: { icon: Loader2, color: 'text-yellow-500', label: 'Starting...' },
    in_progress: { icon: Loader2, color: 'text-blue-500', label: 'Syncing...' },
    completed: { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
    failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' }
  };

  const currentStatus = statusInfo[activeJob?.status || 'starting'];
  const Icon = currentStatus.icon;
  
  const percentage = activeJob && activeJob.total > 0 
    ? Math.round((activeJob.progress / activeJob.total) * 100) 
    : (activeJob?.status === 'completed' ? 100 : 0);

  const timeRemaining = (() => {
    if (!isRunning || !activeJob || activeJob.progress === 0 || elapsedTime === 0) return null;
    const totalTimeEstimate = (elapsedTime / activeJob.progress) * activeJob.total;
    const remaining = totalTimeEstimate - elapsedTime;
    return `ETA: ${formatTime(remaining)}`;
  })();

  const totalTime = isFinished && activeJob 
    ? formatTime(new Date(activeJob.updated_at).getTime() - new Date(activeJob.created_at).getTime()) 
    : formatTime(elapsedTime);

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
          >
            <Card className="shadow-lg">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-base font-semibold">Product Sync</h3>
                        <p className="text-sm text-muted-foreground -mt-1">{activeJob?.total ? `${activeJob.total} items` : currentStatus.label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-muted-foreground tabular-nums">{totalTime}</span>
                        <Icon className={`h-5 w-5 flex-shrink-0 ${currentStatus.color} ${isRunning ? 'animate-spin' : ''}`} />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{activeJob?.message || 'Initializing...'}</span>
                      <span>{timeRemaining}</span>
                    </div>
                    <Progress value={percentage} indicatorClassName="bg-primary" />
                </div>

                {isFinished ? (
                  <div className="flex gap-2 pt-2">
                    <Button className="flex-1" onClick={() => setIsSummaryOpen(true)}><Info className="mr-2 h-4 w-4" />Summary</Button>
                    <Button size="icon" variant="ghost" onClick={dismissJob} className="h-9 w-9 flex-shrink-0"><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="pt-2">
                    <Button variant="destructive" className="w-full" onClick={handleAbort} disabled={isAborting}>
                      {isAborting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}Abort Sync
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
}