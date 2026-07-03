// Per-product review summary (count + average) with request batching: every
// card that asks for a rating in the same tick is folded into ONE
// `product_reviews` query. Results are cached for the session (product_reviews
// is public-read, so this works on the storefront and the dashboard alike).

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReviewSummary {
  count: number;
  avg: number;
}

const cache = new Map<string, ReviewSummary>();
const pending = new Set<string>();
const listeners = new Map<string, Set<(s: ReviewSummary) => void>>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  flushTimer = null;
  const ids = Array.from(pending);
  pending.clear();
  if (ids.length === 0) return;
  const { data, error } = await supabase
    .from('product_reviews')
    .select('product_id, rating')
    .in('product_id', ids);
  const sums = new Map<string, { total: number; count: number }>();
  if (!error) {
    for (const r of data ?? []) {
      const s = sums.get(r.product_id) ?? { total: 0, count: 0 };
      s.total += r.rating;
      s.count += 1;
      sums.set(r.product_id, s);
    }
  }
  for (const id of ids) {
    const s = sums.get(id);
    const summary: ReviewSummary = s ? { count: s.count, avg: s.total / s.count } : { count: 0, avg: 0 };
    cache.set(id, summary);
    listeners.get(id)?.forEach((fn) => fn(summary));
  }
}

/** Invalidate one product (e.g. after a new review/reply) so it refetches. */
export function invalidateProductRating(productId: string) {
  cache.delete(productId);
}

export function useProductRating(productId: string | undefined): ReviewSummary | null {
  const [summary, setSummary] = useState<ReviewSummary | null>(productId ? cache.get(productId) ?? null : null);

  useEffect(() => {
    if (!productId) return;
    const cached = cache.get(productId);
    if (cached) { setSummary(cached); return; }
    let subs = listeners.get(productId);
    if (!subs) { subs = new Set(); listeners.set(productId, subs); }
    subs.add(setSummary);
    pending.add(productId);
    if (!flushTimer) flushTimer = setTimeout(flush, 30);
    return () => { subs!.delete(setSummary); };
  }, [productId]);

  return summary;
}
