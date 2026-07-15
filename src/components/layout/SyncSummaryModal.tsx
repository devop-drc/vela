import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle, AlertTriangle, RefreshCw, SkipForward, PlusCircle } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "../ui/badge";
import { StatusBadge } from "@/components/ui-app/StatusBadge";
import { SyncJob, ProductPayload } from "@/types/sync";
import { useTranslation } from "react-i18next";

const ProductSummaryCard = ({ item, type }: { item: ProductPayload, type: 'created' | 'updated' }) => {
  const { t } = useTranslation();
  return (
  <div className="flex items-start gap-4 p-3 border rounded-lg bg-background">
    <img src={item.thumbnail_url || item.media_url} alt={item.name} className="h-20 w-20 rounded-md object-cover bg-muted" />
    <div className="flex-1">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold leading-tight">{item.name}</p>
          <p className="text-sm text-muted-foreground">{item.category} &middot; {item.details?.type}</p>
        </div>
        <StatusBadge
          tone={type === 'created' ? 'success' : 'info'}
          size="md"
          className="mt-1"
          icon={type === 'created' ? <PlusCircle /> : <RefreshCw />}
        >
          {type === 'created' ? t('sync.label_created') : t('sync.label_updated')}
        </StatusBadge>
      </div>
      {item.price && <p className="text-sm text-muted-foreground mt-1">{item.price} {item.currency}</p>}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {item.tags.map((tag: string) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
        </div>
      )}
    </div>
  </div>
  );
};

interface SkippedItem {
  name: string;
  reason: string;
  thumbnail_url?: string;
}

export const SyncSummaryModal = ({ job, isOpen, onClose }: { job: SyncJob | null; isOpen: boolean; onClose: () => void; }) => {
  const { t } = useTranslation();
  if (!job) return null;

  const summary = job.summary || {};
  const isSuccess = job.status === 'completed';
  const createdItems: ProductPayload[] = summary.created_items || [];
  const updatedItems: ProductPayload[] = summary.updated_items || [];
  const skippedItems: SkippedItem[] = summary.skipped_items || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSuccess ? <CheckCircle className="h-6 w-6 text-success" /> : <AlertTriangle className="h-6 w-6 text-destructive" />}
            {isSuccess ? t('sync.completed_title') : t('sync.failed_title')}
          </DialogTitle>
          <DialogDescription>
            {isSuccess ? t('sync.summary_desc') : t('sync.failed_desc')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isSuccess ? (
            <Accordion type="single" collapsible className="w-full" defaultValue="created">
              <AccordionItem value="created" disabled={createdItems.length === 0}>
                <AccordionTrigger><div className="flex items-center gap-2"><PlusCircle className="h-4 w-4 text-success" /> {t('sync.label_created')} ({createdItems.length})</div></AccordionTrigger>
                <AccordionContent><ScrollArea className="h-64 pr-3"><div className="space-y-2">{createdItems.map((item, i) => <ProductSummaryCard key={i} item={item} type="created" />)}</div></ScrollArea></AccordionContent>
              </AccordionItem>
              <AccordionItem value="updated" disabled={updatedItems.length === 0}>
                <AccordionTrigger><div className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-info" /> {t('sync.label_updated')} ({updatedItems.length})</div></AccordionTrigger>
                <AccordionContent><ScrollArea className="h-64 pr-3"><div className="space-y-2">{updatedItems.map((item, i) => <ProductSummaryCard key={i} item={item} type="updated" />)}</div></ScrollArea></AccordionContent>
              </AccordionItem>
              <AccordionItem value="skipped" disabled={skippedItems.length === 0}>
                <AccordionTrigger><div className="flex items-center gap-2"><SkipForward className="h-4 w-4 text-muted-foreground" /> {t('sync.label_skipped')} ({skippedItems.length})</div></AccordionTrigger>
                <AccordionContent><ScrollArea className="h-64 pr-3"><div className="space-y-3">{skippedItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 text-sm border rounded-lg bg-background">
                    <img src={item.thumbnail_url} alt="Skipped post" className="h-16 w-16 rounded-md object-cover bg-muted" />
                    <div className="flex-1 pt-1">
                      <p className="font-semibold truncate leading-tight">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
                    </div>
                  </div>
                ))}</div></ScrollArea></AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : (
            <div className="p-4 border rounded-lg bg-destructive/10 text-destructive">
              <p className="font-semibold">{t('sync.error_message')}</p>
              <p className="text-sm">{job.message}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};