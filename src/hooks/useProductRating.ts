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

// `product_reviews.product_id` is a uuid column. Placeholder / sample / demo
// products (e.g. the Studio preview's stand-ins, or mock ids like "d1") carry
// non-uuid ids; sending those to `.in('product_id', …)` makes PostgREST 400
// ("invalid input syntax for type uuid"). They can't have real reviews anyway,
// so resolve them to an empty summary without hitting the network.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function flush() {
  flushTimer = null;
  const ids = Array.from(pending);
  pending.clear();
  if (ids.length === 0) return;
  const validIds = ids.filter((id) => UUID_RE.test(id));
  const sums = new Map<string, { total: number; count: number }>();
  if (validIds.length > 0) {
    const { data, error } = await supabase
      .from('product_reviews')
      .select('product_id, rating')
      .in('product_id', validIds);
    if (!error) {
      for (const r of data ?? []) {
        const s = sums.get(r.product_id) ?? { total: 0, count: 0 };
        s.total += r.rating;
        s.count += 1;
        sums.set(r.product_id, s);
      }
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
