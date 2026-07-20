// Owner-side reviews manager — lists every review for a product and lets the
// shop owner write/edit a public reply. Replies go through the ownership-
// checked reply_to_review() RPC (owners can never alter the customer's rating
// or comment).

import { useEffect, useState } from 'react';
import { Star, Send, MessageSquare } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui-app';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { invalidateProductRating } from '@/hooks/useProductRating';
import { useTranslation } from 'react-i18next';

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
      <Star key={s} className={cn('h-4 w-4', s <= value ? 'fill-warning text-warning' : 'text-muted-foreground/30')} />
    ))}
  </span>
);

export const ProductReviewsManager = ({ open, onOpenChange, productId, productName }: Props) => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReviews(null);
    // Owner-scoped RPC: customer emails are PII and not readable via the
    // public table grants — only the owning shop gets them through here.
    supabase
      .rpc('get_product_reviews_owner', { p_product_id: productId })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { showError(t('reviews_mgr.load_failed')); setReviews([]); return; }
        setReviews((data ?? []) as Review[]);
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
      showSuccess(reply.trim() ? t('reviews_mgr.reply_published') : t('reviews_mgr.reply_removed'));
    } catch (e: any) {
      showError(e.message || t('reviews_mgr.save_failed'));
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
            <MessageSquare className="h-5 w-5" /> {t('reviews_mgr.title', { name: productName })}
          </DialogTitle>
          <DialogDescription>
            {reviews?.length
              ? <span className="inline-flex items-center gap-2"><Stars value={Math.round(avg)} /> {t('reviews_mgr.summary', { avg: avg.toFixed(1), count: reviews.length })}</span>
              : t('reviews_mgr.verified_desc')}
          </DialogDescription>
        </DialogHeader>

        {reviews === null ? (
          <div className="flex justify-center py-10"><Spinner className="h-6 w-6 text-muted-foreground" /></div>
        ) : reviews.length === 0 ? (
          <EmptyState
            compact
            icon={MessageSquare}
            title={t('reviews_mgr.no_reviews')}
            description={t('reviews_mgr.no_reviews_desc')}
          />
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-lg border p-4">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.customer_name || t('reviews_mgr.verified_customer')}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{r.customer_email} · {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <Stars value={r.rating} />
                </div>
                {r.comment && <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>}

                <div className="mt-3 space-y-2">
                  <Textarea
                    value={drafts[r.id] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                    placeholder={t('reviews_mgr.reply_placeholder')}
                    rows={2}
                    maxLength={2000}
                    className="text-sm"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {r.replied_at ? t('reviews_mgr.replied_on', { date: new Date(r.replied_at).toLocaleDateString() }) : t('reviews_mgr.no_reply')}
                    </span>
                    <Button
                      size="sm"
                      disabled={savingId === r.id || (drafts[r.id] ?? '') === (r.reply_text ?? '')}
                      onClick={() => saveReply(r.id)}
                    >
                      {savingId === r.id
                        ? <><Spinner className="mr-1.5 h-3.5 w-3.5" /> {t('reviews_mgr.saving')}</>
                        : <><Send className="mr-1.5 h-3.5 w-3.5" /> {r.reply_text ? t('reviews_mgr.update_reply') : t('reviews_mgr.reply')}</>}
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
