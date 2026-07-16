// Per-product review summary (count + average) with request batching: every
// card that asks for a rating in the same tick is folded into ONE
// `product_reviews` query. Results are cached for the session (product_reviews
// is public-read, so this works on the storefront and the dashboard alike).
//
// A localStorage mirror makes summaries paint on the first frame after a
// reload; disk-served entries are marked stale and re-fetched once in the
// background (stale-while-revalidate).

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { readCache, writeCache } from '@/lib/pageCache';

export interface ReviewSummary {
  count: number;
  avg: number;
}

const LS_KEY = 'product-ratings:v1';
const MAX_PERSISTED = 500;

const cache = new Map<string, ReviewSummary>();
// Ids hydrated from localStorage — served instantly but re-fetched once.
const staleIds = new Set<string>();
const pending = new Set<string>();
const listeners = new Map<string, Set<(s: ReviewSummary) => void>>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

// Hydrate once at module load (synchronous, so first render already has data).
(() => {
  const persisted = readCache<Record<string, ReviewSummary>>(LS_KEY);
  if (!persisted) return;
  for (const [id, summary] of Object.entries(persisted)) {
    cache.set(id, summary);
    staleIds.add(id);
  }
})();

const schedulePersist = () => {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const bounded = Array.from(cache.entries()).slice(-MAX_PERSISTED);
    writeCache(LS_KEY, Object.fromEntries(bounded));
  }, 500);
};

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
    if (error) {
      // Keep any cached (possibly stale) entries instead of zeroing them out.
      ids.forEach((id) => staleIds.delete(id));
      return;
    }
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
    staleIds.delete(id);
    listeners.get(id)?.forEach((fn) => fn(summary));
  }
  schedulePersist();
}

const enqueue = (id: string) => {
  pending.add(id);
  if (!flushTimer) flushTimer = setTimeout(flush, 30);
};

/** Ensure an id is either cached-fresh or queued; returns the current value. */
const ensure = (id: string): ReviewSummary | undefined => {
  const hit = cache.get(id);
  if (hit === undefined) {
    enqueue(id);
  } else if (staleIds.has(id)) {
    staleIds.delete(id);
    enqueue(id); // serve stale now, refresh in background
  }
  return hit;
};

/** Invalidate one product (e.g. after a new review/reply) so it refetches. */
export function invalidateProductRating(productId: string) {
  cache.delete(productId);
  staleIds.delete(productId);
}

/**
 * Batch variant: review summaries for a whole product list (rating filters and
 * rating sorts). Uncached ids are folded into the same single flush query the
 * per-card hook uses; results arrive together as one map.
 */
export function useProductRatings(productIds: string[]): Record<string, ReviewSummary> {
  const [map, setMap] = useState<Record<string, ReviewSummary>>({});
  const idsKey = productIds.join(',');

  useEffect(() => {
    let alive = true;
    const ids = idsKey ? idsKey.split(',') : [];
    const apply = () => {
      if (!alive) return;
      const next: Record<string, ReviewSummary> = {};
      for (const id of ids) {
        const s = cache.get(id);
        if (s) next[id] = s;
      }
      setMap(next);
    };
    const unsubs: Array<() => void> = [];
    for (const id of ids) {
      let subs = listeners.get(id);
      if (!subs) { subs = new Set(); listeners.set(id, subs); }
      const fn = () => apply();
      subs.add(fn);
      unsubs.push(() => subs!.delete(fn));
      ensure(id);
    }
    apply();
    return () => { alive = false; unsubs.forEach((u) => u()); };
  }, [idsKey]);

  return map;
}

export function useProductRating(productId: string | undefined): ReviewSummary | null {
  const [summary, setSummary] = useState<ReviewSummary | null>(productId ? cache.get(productId) ?? null : null);

  useEffect(() => {
    if (!productId) return;
    let subs = listeners.get(productId);
    if (!subs) { subs = new Set(); listeners.set(productId, subs); }
    subs.add(setSummary);
    const hit = ensure(productId);
    if (hit) setSummary(hit);
    return () => { subs!.delete(setSummary); };
  }, [productId]);

  return summary;
}
