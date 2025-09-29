import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle, AlertTriangle, RefreshCw, SkipForward, PlusCircle } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "../ui/badge";
import { SyncJob, ProductPayload } from "@/types/sync";

const ProductSummaryCard = ({ item, type }: { item: ProductPayload, type: 'created' | 'updated' }) => (
  <div className="flex items-start gap-4 p-3 border rounded-lg bg-background">
    <img src={item.thumbnail_url || item.media_url} alt={item.name} className="h-20 w-20 rounded-md object-cover bg-muted" />
    <div className="flex-1">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold leading-tight">{item.name}</p>
          <p className="text-sm text-muted-foreground">{item.category} &middot; {item.details?.type}</p>
        </div>
        <Badge variant="outline" className={`mt-1 ${type === 'created' ? "border-emerald-300 text-emerald-700" : "border-blue-300 text-blue-700"}`}>
          {type === 'created' ? <PlusCircle className="mr-1.5 h-3 w-3" /> : <RefreshCw className="mr-1.5 h-3 w-3" />}
          {type === 'created' ? 'Created' : 'Updated'}
        </Badge>
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

interface SkippedItem {
  name: string;
  reason: string;
  thumbnail_url?: string;
}

export const SyncSummaryModal = ({ job, isOpen, onClose }: { job: SyncJob | null; isOpen: boolean; onClose: () => void; }) => {
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
            {isSuccess ? <CheckCircle className="h-6 w-6 text-emerald-500" /> : <AlertTriangle className="h-6 w-6 text-destructive" />}
            Sync {isSuccess ? 'Completed' : 'Failed'}
          </DialogTitle>
          <DialogDescription>
            {isSuccess ? 'Here is a summary of the sync process.' : 'The sync process failed. See the error message below.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isSuccess ? (
            <Accordion type="single" collapsible className="w-full" defaultValue="created">
              <AccordionItem value="created" disabled={createdItems.length === 0}>
                <AccordionTrigger><div className="flex items-center gap-2"><PlusCircle className="h-4 w-4 text-emerald-600" /> Created ({createdItems.length})</div></AccordionTrigger>
                <AccordionContent><ScrollArea className="h-64 pr-3"><div className="space-y-2">{createdItems.map((item, i) => <ProductSummaryCard key={i} item={item} type="created" />)}</div></ScrollArea></AccordionContent>
              </AccordionItem>
              <AccordionItem value="updated" disabled={updatedItems.length === 0}>
                <AccordionTrigger><div className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-blue-600" /> Updated ({updatedItems.length})</div></AccordionTrigger>
                <AccordionContent><ScrollArea className="h-64 pr-3"><div className="space-y-2">{updatedItems.map((item, i) => <ProductSummaryCard key={i} item={item} type="updated" />)}</div></ScrollArea></AccordionContent>
              </AccordionItem>
              <AccordionItem value="skipped" disabled={skippedItems.length === 0}>
                <AccordionTrigger><div className="flex items-center gap-2"><SkipForward className="h-4 w-4 text-slate-600" /> Skipped ({skippedItems.length})</div></AccordionTrigger>
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
              <p className="font-semibold">Error Message:</p>
              <p className="text-sm">{job.message}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};