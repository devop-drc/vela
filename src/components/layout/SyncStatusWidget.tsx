import { useState, useEffect } from 'react';
import { useSync } from '@/contexts/SyncContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
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
  const [eta, setEta] = useState('...');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  useEffect(() => {
    if (activeJob?.status === 'in_progress' || activeJob?.status === 'starting') {
      if (!startTime) setStartTime(Date.now());
      
      if (activeJob.progress > 0) {
        const elapsed = Date.now() - (startTime || Date.now());
        const timePerItem = elapsed / activeJob.progress;
        const remainingItems = activeJob.total - activeJob.progress;
        const etaMs = timePerItem * remainingItems;
        setEta(formatTime(etaMs));
      }
    } else {
      setStartTime(null);
    }
  }, [activeJob, startTime]);

  const isVisible = activeJob !== null;
  const isFinished = activeJob?.status === 'completed' || activeJob?.status === 'failed';
  const percentage = activeJob && activeJob.total > 0 ? (activeJob.progress / activeJob.total) * 100 : (activeJob?.status === 'completed' ? 100 : 0);

  const statusInfo = {
    starting: { icon: Loader2, color: 'text-muted-foreground', text: 'Starting...' },
    in_progress: { icon: Loader2, color: 'text-muted-foreground', text: 'Syncing...' },
    completed: { icon: CheckCircle, color: 'text-emerald-500', text: 'Sync Complete' },
    failed: { icon: XCircle, color: 'text-destructive', text: 'Sync Failed' },
  };

  const currentStatus = statusInfo[activeJob?.status || 'starting'];
  const Icon = currentStatus.icon;

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
                expanded: { width: 360 }
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <Card className="shadow-lg overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {activeJob?.thumbnail_url && (
                      <motion.img 
                        src={activeJob.thumbnail_url} 
                        alt="Post thumbnail" 
                        className="h-12 w-12 rounded-md object-cover bg-muted flex-shrink-0"
                        variants={{
                          collapsed: { scale: 1 },
                          expanded: { scale: 1.15 }
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      />
                    )}
                    <div className="flex-1 space-y-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold truncate">Product Syncing</h3>
                        <Icon className={`h-4 w-4 flex-shrink-0 ${currentStatus.color} ${!isFinished ? 'animate-spin' : ''}`} />
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{activeJob?.progress || 0} / {activeJob?.total || 0}</span>
                        {!isFinished && <span>ETA: {eta}</span>}
                      </div>
                      <motion.div
                        variants={{
                          collapsed: { opacity: 0, height: 0, marginTop: 0 },
                          expanded: { opacity: 1, height: 'auto', marginTop: '4px' }
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <p className="text-xs text-muted-foreground pt-1 border-t border-dashed">
                          {activeJob?.message || 'Initializing...'}
                        </p>
                      </motion.div>
                    </div>
                  </div>
                  {isFinished && (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" className="flex-1" onClick={() => setIsSummaryOpen(true)}>Details</Button>
                      <Button size="sm" variant="ghost" onClick={dismissJob}>Dismiss</Button>
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