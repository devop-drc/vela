import { useState, useEffect, useMemo } from 'react';
import { useSync } from '@/contexts/syncContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui-app/StatusBadge';
import { CheckCircle, XCircle, X, Info, Bug, Zap, Clock, Package, SkipForward, AlertTriangle, List } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useCountUp } from '@/lib/anim';
import { SyncSummaryModal } from './SyncSummaryModal';
import { SyncLiveFeedModal } from './SyncLiveFeedModal';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

const formatTime = (ms: number) => {
  if (ms < 0 || !isFinite(ms) || isNaN(ms)) return '--:--';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

/** Small count-up number for the live/finished sync stat badges. */
const CountUp = ({ value }: { value: number }) => {
  const ref = useCountUp<HTMLSpanElement>(value, { duration: 0.5 });
  return <span ref={ref} className="tabular-nums">{value}</span>;
};

export const SyncStatusWidget = () => {
  const { t } = useTranslation();
  const { activeJob, dismissJob } = useSync();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isLiveFeedOpen, setIsLiveFeedOpen] = useState(false);
  const [isAborting, setIsAborting] = useState(false);
  const [showDevLog, setShowDevLog] = useState(false);
  const [devLogs, setDevLogs] = useState<string[]>([]);
  const [prevMessage, setPrevMessage] = useState('');

  // Track message changes as dev logs
  useEffect(() => {
    if (activeJob?.message && activeJob.message !== prevMessage) {
      setPrevMessage(activeJob.message);
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setDevLogs(prev => [`[${timestamp}] ${activeJob.message}`, ...prev].slice(0, 50));
    }
  }, [activeJob?.message]);

  // Reset logs on new sync
  useEffect(() => {
    if (activeJob?.status === 'starting') {
      setDevLogs([]);
      setPrevMessage('');
    }
  }, [activeJob?.status]);

  useEffect(() => {
    if (!activeJob || !['in_progress', 'starting'].includes(activeJob.status)) {
      return;
    }
    const startTime = new Date(activeJob.created_at).getTime();
    const update = () => setElapsedTime(Date.now() - startTime);
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [activeJob?.id, activeJob?.status]);

  const handleAbort = async () => {
    if (!activeJob) return;
    setIsAborting(true);
    const { error } = await supabase
      .from('sync_jobs')
      .update({ status: 'failed', message: 'Sync aborted by user.' })
      .eq('id', activeJob.id);
    if (error) showError(t('sync.abort_failed', { message: error.message }));
    else showSuccess(t('sync.aborted'));
    setIsAborting(false);
  };

  const isVisible = activeJob !== null;
  const isRunning = activeJob?.status === 'in_progress' || activeJob?.status === 'starting';
  const isFinished = activeJob?.status === 'completed' || activeJob?.status === 'failed';
  const isSuccess = activeJob?.status === 'completed';

  const percentage = useMemo(() => {
    if (!activeJob) return 0;
    if (activeJob.status === 'completed') return 100;
    if (activeJob.total > 0) return Math.round((activeJob.progress / activeJob.total) * 100);
    return 0;
  }, [activeJob?.progress, activeJob?.total, activeJob?.status]);

  const eta = useMemo(() => {
    if (!isRunning || !activeJob || activeJob.progress === 0 || elapsedTime === 0) return null;
    const msPerItem = elapsedTime / activeJob.progress;
    const remaining = msPerItem * (activeJob.total - activeJob.progress);
    return formatTime(remaining);
  }, [isRunning, activeJob?.progress, activeJob?.total, elapsedTime]);

  const totalTime = isFinished && activeJob
    ? formatTime(new Date(activeJob.updated_at).getTime() - new Date(activeJob.created_at).getTime())
    : formatTime(elapsedTime);

  const summary = activeJob?.summary;
  const liveStats = useMemo(() => {
    if (!summary) return null;
    return {
      created: summary.created || 0,
      updated: summary.updated || 0,
      skipped: summary.skipped || 0,
      cached: summary.cache_hits || 0,
    };
  }, [summary]);

  // Inline analysis preview from the current post
  const analysis = activeJob?.analysis_result;
  const analysisPreview = useMemo(() => {
    if (!analysis || !analysis.isProductPost) return null;
    return {
      name: analysis.productName,
      category: analysis.categoryName,
      price: analysis.price ? `${analysis.price} ${analysis.currency || ''}`.trim() : null,
    };
  }, [analysis]);

  if (!isVisible) return (
    <>
      <SyncSummaryModal job={activeJob} isOpen={isSummaryOpen} onClose={() => setIsSummaryOpen(false)} />
      <SyncLiveFeedModal job={activeJob} isOpen={isLiveFeedOpen} onClose={() => setIsLiveFeedOpen(false)} />
    </>
  );

  return (
    <>
      <SyncSummaryModal job={activeJob} isOpen={isSummaryOpen} onClose={() => setIsSummaryOpen(false)} />
      <SyncLiveFeedModal job={activeJob} isOpen={isLiveFeedOpen} onClose={() => setIsLiveFeedOpen(false)} />
      <AnimatePresence>
        <motion.div
          layout
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-24 left-4 z-40 w-[calc(100vw-2rem)] sm:w-80 md:bottom-4"
        >
          <Card className="shadow-xl border-border/50 backdrop-blur-sm">
            <CardContent className="p-3 space-y-2.5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isRunning ? (
                    <div className="relative">
                      <Spinner className="h-4 w-4 text-primary" />
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-info rounded-full animate-pulse" />
                    </div>
                  ) : isSuccess ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm font-semibold">
                    {isRunning ? t('sync.syncing') : isSuccess ? t('sync.complete') : t('sync.failed')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-muted-foreground tabular-nums">{totalTime}</span>
                  {isFinished && (
                    <Button size="icon" variant="ghost" onClick={dismissJob} className="h-6 w-6">
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <Progress value={percentage} className="h-1.5" />
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                    {activeJob?.message || t('sync.initializing')}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums shrink-0">
                    {activeJob.total > 0 && (
                      <span>{activeJob.progress}/{activeJob.total}</span>
                    )}
                    {eta && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />{eta}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Live stats counters */}
              {isRunning && activeJob.progress > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {(liveStats?.created ?? 0) > 0 && (
                    <StatusBadge tone="success" size="sm" icon={<Package />}>
                      <CountUp value={liveStats!.created} /> {t('sync.new')}
                    </StatusBadge>
                  )}
                  {(liveStats?.updated ?? 0) > 0 && (
                    <StatusBadge tone="info" size="sm" icon={<Zap />}>
                      <CountUp value={liveStats!.updated} /> {t('sync.updated')}
                    </StatusBadge>
                  )}
                  {(liveStats?.skipped ?? 0) > 0 && (
                    <StatusBadge tone="neutral" size="sm" icon={<SkipForward />}>
                      <CountUp value={liveStats!.skipped} /> {t('sync.skipped')}
                    </StatusBadge>
                  )}
                  {(liveStats?.cached ?? 0) > 0 && (
                    <StatusBadge tone="warning" size="sm" icon={<Zap />}>
                      <CountUp value={liveStats!.cached} /> {t('sync.cached')}
                    </StatusBadge>
                  )}
                </div>
              )}

              {/* Current post preview (compact) */}
              {isRunning && activeJob?.thumbnail_url && analysisPreview && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2.5 p-2 rounded-md bg-muted/50 border border-border/50"
                >
                  <img
                    src={activeJob.thumbnail_url}
                    alt=""
                    className="h-10 w-10 rounded object-cover bg-muted shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{analysisPreview.name || t('sync.analyzing')}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {analysisPreview.category && (
                        <span className="text-[10px] text-muted-foreground">{analysisPreview.category}</span>
                      )}
                      {analysisPreview.price && (
                        <span className="text-[10px] font-medium">{analysisPreview.price}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Finished stats */}
              {isFinished && summary && (
                <div className="flex gap-1.5 flex-wrap">
                  <StatusBadge tone="success" size="sm" icon={<Package />}>
                    <CountUp value={summary.created} /> {t('sync.created')}
                  </StatusBadge>
                  <StatusBadge tone="info" size="sm" icon={<Zap />}>
                    <CountUp value={summary.updated} /> {t('sync.updated')}
                  </StatusBadge>
                  <StatusBadge tone="neutral" size="sm" icon={<SkipForward />}>
                    <CountUp value={summary.skipped} /> {t('sync.skipped')}
                  </StatusBadge>
                </div>
              )}

              {/* Failed error message */}
              {activeJob?.status === 'failed' && activeJob.message && (
                <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20">
                  <div className="flex gap-1.5 items-start">
                    <AlertTriangle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                    <p className="text-[11px] text-destructive leading-tight">{activeJob.message}</p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-1.5">
                {isFinished ? (
                  <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => setIsSummaryOpen(true)}>
                    <Info className="mr-1.5 h-3 w-3" />{t('sync.summary')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 h-7 text-xs"
                    onClick={handleAbort}
                    disabled={isAborting}
                  >
                    {isAborting ? <Spinner className="mr-1.5 h-3 w-3" /> : <XCircle className="mr-1.5 h-3 w-3" />}
                    {t('sync.abort')}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2 shrink-0"
                  onClick={() => setIsLiveFeedOpen(true)}
                  title={t('sync.live_feed')}
                  aria-label={t('sync.live_feed')}
                >
                  <List className="h-3 w-3" />
                </Button>
                {import.meta.env.DEV && (
                  <Button
                    size="icon"
                    variant={showDevLog ? 'secondary' : 'ghost'}
                    className="h-7 w-7 shrink-0"
                    onClick={() => setShowDevLog(v => !v)}
                    title={t('sync.dev_log')}
                    aria-label={t('sync.dev_log')}
                  >
                    <Bug className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Dev log panel — DEV only, never shipped to the merchant UI */}
              {import.meta.env.DEV && (
                <AnimatePresence>
                  {showDevLog && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-2 rounded-md bg-foreground text-background/90 font-mono text-[10px] leading-relaxed max-h-40 overflow-y-auto border border-border">
                        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-background/20">
                          <span className="text-background/50 uppercase tracking-wider text-[9px] font-bold">{t('sync.dev_log')}</span>
                          <span className="text-background/40">{devLogs.length} entries</span>
                        </div>
                        {devLogs.length === 0 ? (
                          <p className="text-background/40">{t('sync.waiting')}</p>
                        ) : (
                          devLogs.map((log, i) => (
                            <div key={i} className={`py-0.5 ${i === 0 ? 'text-background' : 'text-background/60'}`}>
                              {log}
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </>
  );
};
