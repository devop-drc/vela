import { useState, useEffect } from 'react';
import { useSync } from '@/contexts/SyncContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const formatTime = (ms: number) => {
  if (ms < 0 || !isFinite(ms)) return '...';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

export const SyncStatusWidget = () => {
  const { activeJob } = useSync();
  const [eta, setEta] = useState('...');

  useEffect(() => {
    if (activeJob && activeJob.status === 'in_progress' && activeJob.progress > 0) {
      const startTime = new Date(activeJob.created_at).getTime();
      const now = Date.now();
      const elapsed = now - startTime;
      const timePerItem = elapsed / activeJob.progress;
      const remainingItems = activeJob.total - activeJob.progress;
      const etaMs = timePerItem * remainingItems;
      setEta(formatTime(etaMs));
    } else {
      setEta('...');
    }
  }, [activeJob]);

  const isVisible = activeJob !== null;
  const percentage = activeJob && activeJob.total > 0 ? (activeJob.progress / activeJob.total) * 100 : 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="fixed bottom-4 left-4 z-50 w-80"
        >
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
              {activeJob?.status === 'in_progress' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {activeJob?.status === 'completed' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
              {activeJob?.status === 'failed' && <XCircle className="h-4 w-4 text-destructive" />}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {activeJob?.thumbnail_url && (
                  <img src={activeJob.thumbnail_url} alt="Post thumbnail" className="h-16 w-16 rounded-md object-cover bg-muted" />
                )}
                <div className="flex-1 space-y-1">
                  <p className="text-xs text-muted-foreground line-clamp-2">{activeJob?.message}</p>
                  <Progress value={percentage} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{activeJob?.progress || 0} / {activeJob?.total || 0}</span>
                    <span>ETA: {eta}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};