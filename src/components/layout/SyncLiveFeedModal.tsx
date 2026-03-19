import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Package, Zap, SkipForward, Loader2, CheckCircle, XCircle, ImageOff } from "lucide-react";
import { SyncJob, ProductPayload, SkippedItem } from "@/types/sync";
import { AnimatePresence, motion } from "framer-motion";

const ProductRow = ({ item, type }: { item: ProductPayload; type: 'created' | 'updated' }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
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
        <p className="text-sm font-medium truncate">{item.name || 'Untitled'}</p>
        <Badge
          variant="outline"
          className={`shrink-0 text-[10px] h-5 ${type === 'created' ? 'border-emerald-300 text-emerald-600 bg-emerald-50' : 'border-blue-300 text-blue-600 bg-blue-50'}`}
        >
          {type === 'created' ? 'New' : 'Updated'}
        </Badge>
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
  </motion.div>
);

const SkippedRow = ({ item }: { item: SkippedItem }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
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
  </motion.div>
);

interface SyncLiveFeedModalProps {
  job: SyncJob | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SyncLiveFeedModal = ({ job, isOpen, onClose }: SyncLiveFeedModalProps) => {
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
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : job.status === 'completed' ? (
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            Live Sync Feed
            {isRunning && (
              <Badge variant="outline" className="ml-auto text-[10px] animate-pulse">
                Live
              </Badge>
            )}
          </DialogTitle>
          {/* Stats bar */}
          <div className="flex gap-2 pt-1">
            <Badge variant="secondary" className="text-[10px] h-5 gap-1 bg-emerald-500/10 text-emerald-600 border-0">
              <Package className="h-2.5 w-2.5" />{createdItems.length} created
            </Badge>
            <Badge variant="secondary" className="text-[10px] h-5 gap-1 bg-blue-500/10 text-blue-600 border-0">
              <Zap className="h-2.5 w-2.5" />{updatedItems.length} updated
            </Badge>
            <Badge variant="secondary" className="text-[10px] h-5 gap-1 bg-muted text-muted-foreground border-0">
              <SkipForward className="h-2.5 w-2.5" />{skippedItems.length} skipped
            </Badge>
            <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
              {totalProcessed} / {job.total || '?'} processed
            </span>
          </div>
        </DialogHeader>

        <Tabs defaultValue="products" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="shrink-0 w-full grid grid-cols-3">
            <TabsTrigger value="products" className="text-xs">
              Products ({allProducts.length})
            </TabsTrigger>
            <TabsTrigger value="created" className="text-xs">
              Created ({createdItems.length})
            </TabsTrigger>
            <TabsTrigger value="skipped" className="text-xs">
              Skipped ({skippedItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="flex-1 min-h-0 mt-2">
            <ScrollArea className="h-[50vh]">
              <div className="space-y-2 pr-3">
                <AnimatePresence mode="popLayout">
                  {allProducts.length === 0 && isRunning && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                    >
                      <Loader2 className="h-8 w-8 animate-spin mb-3" />
                      <p className="text-sm">Waiting for AI analysis results...</p>
                      <p className="text-xs mt-1">Products will appear here as they're processed</p>
                    </motion.div>
                  )}
                  {allProducts.length === 0 && !isRunning && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Package className="h-8 w-8 mb-3" />
                      <p className="text-sm">No products were created or updated</p>
                    </div>
                  )}
                  {allProducts.map((item, i) => (
                    <ProductRow key={item.instagram_post_id || i} item={item} type={item._type} />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="created" className="flex-1 min-h-0 mt-2">
            <ScrollArea className="h-[50vh]">
              <div className="space-y-2 pr-3">
                {createdItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Package className="h-8 w-8 mb-3" />
                    <p className="text-sm">{isRunning ? 'Products will appear as they\'re created...' : 'No new products created'}</p>
                  </div>
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
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <SkipForward className="h-8 w-8 mb-3" />
                    <p className="text-sm">{isRunning ? 'Skipped posts will appear here...' : 'No posts were skipped'}</p>
                  </div>
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
