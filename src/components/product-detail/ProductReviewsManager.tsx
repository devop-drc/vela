// Owner-side reviews manager — lists every review for a product and lets the
// shop owner write/edit a public reply. Replies go through the ownership-
// checked reply_to_review() RPC (owners can never alter the customer's rating
// or comment).

import { useEffect, useState } from 'react';
import { Star, Loader2, Send, MessageSquare } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { invalidateProductRating } from '@/hooks/useProductRating';

interface Review {
  id: string;
  customer_name: string | null;
  customer_email: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reply_text: string | null;
  replied_at: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
}

const Stars = ({ value }: { value: number }) => (
  <span className="inline-flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={cn('h-4 w-4', s <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
    ))}
  </span>
);

export const ProductReviewsManager = ({ open, onOpenChange, productId, productName }: Props) => {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReviews(null);
    supabase
      .from('product_reviews')
      .select('id, customer_name, customer_email, rating, comment, created_at, reply_text, replied_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { showError('Could not load reviews.'); setReviews([]); return; }
        setReviews(data as Review[]);
        setDrafts(Object.fromEntries((data ?? []).map((r: any) => [r.id, r.reply_text ?? ''])));
      });
    return () => { cancelled = true; };
  }, [open, productId]);

  const saveReply = async (reviewId: string) => {
    setSavingId(reviewId);
    try {
      const reply = drafts[reviewId] ?? '';
      const { error } = await supabase.rpc('reply_to_review', { p_review_id: reviewId, p_reply: reply });
      if (error) throw error;
      setReviews((prev) => (prev ?? []).map((r) => (r.id === reviewId ? { ...r, reply_text: reply.trim() || null, replied_at: reply.trim() ? new Date().toISOString() : null } : r)));
      invalidateProductRating(productId);
      showSuccess(reply.trim() ? 'Reply published.' : 'Reply removed.');
    } catch (e: any) {
      showError(e.message || 'Could not save the reply.');
    } finally {
      setSavingId(null);
    }
  };

  const avg = reviews?.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Reviews — {productName}
          </DialogTitle>
          <DialogDescription>
            {reviews?.length
              ? <span className="inline-flex items-center gap-2"><Stars value={Math.round(avg)} /> {avg.toFixed(1)} average · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}. Replies are shown publicly on your storefront.</span>
              : 'Verified-purchase reviews for this product.'}
          </DialogDescription>
        </DialogHeader>

        {reviews === null ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : reviews.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No reviews yet — customers can review from “My Orders” once their order is fulfilled.</p>
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-lg border p-4">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.customer_name || 'Verified customer'}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{r.customer_email} · {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <Stars value={r.rating} />
                </div>
                {r.comment && <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>}

                <div className="mt-3 space-y-2">
                  <Textarea
                    value={drafts[r.id] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                    placeholder="Write a public reply…"
                    rows={2}
                    maxLength={2000}
                    className="text-sm"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {r.replied_at ? `Replied ${new Date(r.replied_at).toLocaleDateString()}` : 'No reply yet'}
                    </span>
                    <Button
                      size="sm"
                      disabled={savingId === r.id || (drafts[r.id] ?? '') === (r.reply_text ?? '')}
                      onClick={() => saveReply(r.id)}
                    >
                      {savingId === r.id
                        ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving…</>
                        : <><Send className="mr-1.5 h-3.5 w-3.5" /> {r.reply_text ? 'Update reply' : 'Reply'}</>}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
