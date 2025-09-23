import { useState, useEffect } from 'react';
import { useSync } from '@/contexts/SyncContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, X, Info } from 'lucide-react';
import { SyncSummaryModal } from './SyncSummaryModal';

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

  useEffect(() => {
    let interval: number | undefined;
    if (activeJob && (activeJob.status === 'in_progress' || activeJob.status === 'starting')) {
      const startTime = new Date(activeJob.created_at).getTime();
      
      // Set initial time immediately to avoid 1s delay
      setElapsedTime(formatTime(Date.now() - startTime));
      
      interval = setInterval(() => {
        setElapsedTime(formatTime(Date.now() - startTime));
      }, 1000);
    }
    
    // Cleanup function
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeJob?.id, activeJob?.status, activeJob?.created_at]); // More stable dependencies

  const isVisible = activeJob !== null;
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-4 z-50"
          >
            <motion.div 
              whileHover="expanded" 
              initial="collapsed"
              animate="collapsed"
              variants={{
                collapsed: { width: 280 },
                expanded: { width: 400 }
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <Card className="shadow-lg overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {activeJob?.thumbnail_url && (
                      <motion.div
                        className="h-16 w-16 rounded-lg bg-muted flex-shrink-0"
                        variants={{
                          collapsed: { scale: 1, x: '0%', y: '0%' },
                          expanded: { scale: 1.4, x: '20%', y: '15%' }
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        <img 
                          src={activeJob.thumbnail_url} 
                          alt="Post thumbnail" 
                          className="h-full w-full object-cover rounded-md"
                        />
                      </motion.div>
                    )}
                    <div className="flex-1 space-y-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold truncate">Product Syncing</h3>
                        <Icon className={`h-4 w-4 flex-shrink-0 ${currentStatus.color} ${!isFinished ? 'animate-spin' : ''}`} />
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{activeJob?.progress || 0} / {activeJob?.total || 0}</span>
                        <span>{isFinished ? `Finished in ${totalTime}` : elapsedTime}</span>
                      </div>
                      <motion.div
                        className="overflow-hidden"
                        variants={{
                          collapsed: { opacity: 0, height: 0, marginTop: 0 },
                          expanded: { opacity: 1, height: 'auto', marginTop: '8px' }
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        {isFinished ? (
                          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                            <div><p className="font-bold">{summary.created || 0}</p><p className="text-xs">Created</p></div>
                            <div><p className="font-bold">{summary.updated || 0}</p><p className="text-xs">Updated</p></div>
                            <div><p className="font-bold">{summary.skipped || 0}</p><p className="text-xs">Skipped</p></div>
                          </div>
                        ) : (
                          <div className="space-y-1 pt-2 border-t border-dashed">
                            <p className="text-xs font-semibold">AI Status:</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {activeJob?.message || 'Initializing...'}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    </div>
                  </div>
                  {isFinished && (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" className="flex-1" onClick={() => setIsSummaryOpen(true)}><Info className="mr-2 h-4 w-4" />Details</Button>
                      <Button size="icon" variant="ghost" onClick={dismissJob} className="h-8 w-8 flex-shrink-0">
                          <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};