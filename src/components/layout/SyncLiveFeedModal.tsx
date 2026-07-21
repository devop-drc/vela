import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui-app/StatusBadge";
import { EmptyState } from "@/components/ui-app/EmptyState";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Package, Zap, SkipForward, CheckCircle, XCircle, ImageOff } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useCountUp } from "@/lib/anim";
import { SyncJob, ProductPayload, SkippedItem } from "@/types/sync";
import { Reveal } from "@/lib/anim";
import { useTranslation } from "react-i18next";

/** Small count-up number for the sync stat badges. */
const CountUp = ({ value }: { value: number }) => {
  const ref = useCountUp<HTMLSpanElement>(value, { duration: 0.4 });
  return <span ref={ref} className="tabular-nums">{value}</span>;
};

const ProductRow = ({ item, type }: { item: ProductPayload; type: 'created' | 'updated' }) => {
  const { t } = useTranslation();
  return (
  <Reveal from="right"
    className="flex gap-3 p-2.5 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
  >
    <div className="h-14 w-14 rounded-md overflow-hidden bg-muted shrink-0 border">
      {item.thumbnail_url || item.media_url ? (
        <img src={item.thumbnail_url || item.media_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full flex items-center justify-center"><ImageOff className="h-5 w-5 text-muted-foreground" /></div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium truncate">{item.name || t('sync.untitled', 'Untitled')}</p>
        <StatusBadge tone={type === 'created' ? 'success' : 'info'} size="sm" className="shrink-0">
          {type === 'created' ? t('sync.label_new') : t('sync.label_updated')}
        </StatusBadge>
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        {item.category && (
          <span className="text-[11px] text-muted-foreground">{item.category}</span>
        )}
        {item.details?.type && (
          <>
            <span className="text-[11px] text-muted-foreground">&middot;</span>
            <span className="text-[11px] text-muted-foreground">{String(item.details.type)}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1">
        {item.price != null && (
          <span className="text-xs font-semibold">{item.price} {item.currency || 'ALL'}</span>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="flex gap-1 overflow-hidden">
            {item.tags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-[9px] h-4 px-1">{tag}</Badge>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{item.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
      {/* Specs preview */}
      {item.details && Object.keys(item.details).filter(k => k !== 'type' && k !== 'Brand').length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {Object.entries(item.details)
            .filter(([k]) => k !== 'type' && k !== 'Brand')
            .slice(0, 4)
            .map(([key, val]) => (
              <span key={key} className="text-[10px] text-muted-foreground">
                <span className="capitalize">{key.replace(/_/g, ' ')}</span>: <span className="text-foreground">{Array.isArray(val) ? val.join(', ') : String(val)}</span>
              </span>
            ))}
        </div>
      )}
    </div>
  </Reveal>
  );
};

const SkippedRow = ({ item }: { item: SkippedItem }) => (
  <Reveal from="right"
    className="flex gap-3 p-2.5 rounded-lg border bg-card"
  >
    <div className="h-10 w-10 rounded-md overflow-hidden bg-muted shrink-0 border">
      {item.thumbnail_url ? (
        <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover opacity-50" />
      ) : (
        <div className="h-full w-full flex items-center justify-center"><SkipForward className="h-4 w-4 text-muted-foreground" /></div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm truncate text-muted-foreground">{item.name}</p>
      <p className="text-[11px] text-muted-foreground/70 mt-0.5">{item.reason}</p>
    </div>
  </Reveal>
);

interface SyncLiveFeedModalProps {
  job: SyncJob | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SyncLiveFeedModal = ({ job, isOpen, onClose }: SyncLiveFeedModalProps) => {
  const { t } = useTranslation();
  if (!job) return null;

  const summary = job.summary;
  const createdItems: ProductPayload[] = summary?.created_items || [];
  const updatedItems: ProductPayload[] = summary?.updated_items || [];
  const skippedItems: SkippedItem[] = summary?.skipped_items || [];
  const allProducts = [
    ...createdItems.map(i => ({ ...i, _type: 'created' as const })),
    ...updatedItems.map(i => ({ ...i, _type: 'updated' as const })),
  ];
  const totalProcessed = allProducts.length + skippedItems.length;
  const isRunning = job.status === 'in_progress' || job.status === 'starting';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {isRunning ? (
              <Spinner className="h-4 w-4 text-primary" />
            ) : job.status === 'completed' ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            {t('sync.live_feed_title')}
            {isRunning && (
              <Badge variant="outline" className="ml-auto text-[10px] animate-pulse">
                {t('sync.live')}
              </Badge>
            )}
          </DialogTitle>
          {/* Stats bar */}
          <div className="flex flex-wrap gap-2 pt-1">
            <StatusBadge tone="success" size="sm" icon={<Package />}>
              <CountUp value={createdItems.length} /> {t('sync.created')}
            </StatusBadge>
            <StatusBadge tone="info" size="sm" icon={<Zap />}>
              <CountUp value={updatedItems.length} /> {t('sync.updated')}
            </StatusBadge>
            <StatusBadge tone="neutral" size="sm" icon={<SkipForward />}>
              <CountUp value={skippedItems.length} /> {t('sync.skipped')}
            </StatusBadge>
            <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
              {totalProcessed} / {job.total || '?'} {t('sync.processed')}
            </span>
          </div>
        </DialogHeader>

        <Tabs defaultValue="products" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="shrink-0 w-full grid grid-cols-3">
            <TabsTrigger value="products" className="text-xs">
              {t('sync.tab_products')} ({allProducts.length})
            </TabsTrigger>
            <TabsTrigger value="created" className="text-xs">
              {t('sync.tab_created')} ({createdItems.length})
            </TabsTrigger>
            <TabsTrigger value="skipped" className="text-xs">
              {t('sync.tab_skipped')} ({skippedItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="flex-1 min-h-0 mt-2">
            <ScrollArea className="h-[50vh]">
              <div className="space-y-2 pr-3">
                  {allProducts.length === 0 && isRunning && (
                    <Reveal from="fade"
                      className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                    >
                      <Spinner className="h-8 w-8 mb-3" />
                      <p className="text-sm">{t('sync.waiting_ai')}</p>
                      <p className="text-xs mt-1">{t('sync.waiting_ai_desc')}</p>
                    </Reveal>
                  )}
                  {allProducts.length === 0 && !isRunning && (
                    <EmptyState compact icon={Package} title={t('sync.no_products_processed')} />
                  )}
                  {allProducts.map((item, i) => (
                    <ProductRow key={item.instagram_post_id || i} item={item} type={item._type} />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="created" className="flex-1 min-h-0 mt-2">
            <ScrollArea className="h-[50vh]">
              <div className="space-y-2 pr-3">
                {createdItems.length === 0 ? (
                  <EmptyState compact icon={Package} title={isRunning ? t('sync.created_appearing') : t('sync.no_created')} />
                ) : (
                  createdItems.map((item, i) => (
                    <ProductRow key={item.instagram_post_id || i} item={item} type="created" />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="skipped" className="flex-1 min-h-0 mt-2">
            <ScrollArea className="h-[50vh]">
              <div className="space-y-2 pr-3">
                {skippedItems.length === 0 ? (
                  <EmptyState compact icon={SkipForward} title={isRunning ? t('sync.skipped_appearing') : t('sync.no_skipped')} />
                ) : (
                  skippedItems.map((item, i) => (
                    <SkippedRow key={i} item={item} />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
