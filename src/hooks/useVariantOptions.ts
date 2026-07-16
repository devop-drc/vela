// Batched per-product variant options. Real purchase options live in the
// `product_variants` table (public-read for Active products), NOT in
// products.details — so cards, quick view, the detail page and the shop-page
// facets all read from here. Mirrors useProductRating's request batching:
// every product that asks in the same tick folds into ONE query.
//
// Freshness model (stale-while-revalidate):
//   • memory cache — authoritative for the session.
//   • localStorage mirror — survives reloads so options paint on first frame;
//     entries served from disk are marked stale and re-fetched once in the
//     background.
//   • primeVariantOptions() — seeds entries from a server payload that already
//     embeds variants (get-public-shop-data), skipping the round trip entirely.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { readCache, writeCache } from '@/lib/pageCache';
import { normalizeKey } from '@/components/filters/filterVisibility';

export interface VariantLite {
  option_values: Record<string, string>;
  inventory: number;
  price_difference: number;
  is_default: boolean;
}

export interface VariantOptions {
  /** option name → distinct values across active variants, insertion-ordered. */
  options: Record<string, string[]>;
  variants: VariantLite[];
}

export const EMPTY_VARIANT_OPTIONS: VariantOptions = { options: {}, variants: [] };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LS_KEY = 'variant-options:v1';
const MAX_PERSISTED = 300;

const cache = new Map<string, VariantOptions>();
// Ids hydrated from localStorage — served instantly but re-fetched once.
const staleIds = new Set<string>();
const pending = new Set<string>();
const listeners = new Map<string, Set<() => void>>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

// Hydrate once at module load (synchronous, so first render already has data).
(() => {
  const persisted = readCache<Record<string, VariantOptions>>(LS_KEY);
  if (!persisted) return;
  for (const [id, summary] of Object.entries(persisted)) {
    cache.set(id, summary);
    staleIds.add(id);
  }
})();

/** Debounced write-back of the (bounded) cache to localStorage. */
const schedulePersist = () => {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const entries = Array.from(cache.entries());
    // Keep the most recently inserted entries (Map preserves insertion order).
    const bounded = entries.slice(-MAX_PERSISTED);
    writeCache(LS_KEY, Object.fromEntries(bounded));
  }, 500);
};

/** option_values with combination_key fallback ("Color:Black|RAM:12GB") —
    same normalization the Stock page uses. */
const rowOptionValues = (row: any): Record<string, string> => {
  const direct = row.option_values || {};
  if (Object.keys(direct).length > 0) return direct;
  const out: Record<string, string> = {};
  (row.combination_key || '').split('|').forEach((part: string) => {
    const idx = part.indexOf(':');
    if (idx > 0) out[part.slice(0, idx)] = part.slice(idx + 1);
  });
  return out;
};

const buildSummary = (variants: VariantLite[]): VariantOptions => {
  if (variants.length === 0) return EMPTY_VARIANT_OPTIONS;
  const options: Record<string, string[]> = {};
  for (const v of variants) {
    for (const [name, value] of Object.entries(v.option_values)) {
      if (!value) continue;
      const existingKey = Object.keys(options).find((k) => normalizeKey(k) === normalizeKey(name)) ?? name;
      const list = options[existingKey] ?? [];
      if (!list.includes(value)) list.push(value);
      options[existingKey] = list;
    }
  }
  return { options, variants };
};

const parseRows = (rows: any[]): VariantLite[] =>
  (rows || [])
    .filter((r) => r.is_active !== false)
    .map((r) => ({
      option_values: rowOptionValues(r),
      inventory: r.inventory ?? 0,
      price_difference: Number(r.price_difference) || 0,
      is_default: !!r.is_default,
    }));

const commit = (id: string, summary: VariantOptions) => {
  cache.set(id, summary);
  staleIds.delete(id);
  listeners.get(id)?.forEach((fn) => fn());
};

/**
 * Seed entries straight from a server payload that embeds product_variants
 * (e.g. get-public-shop-data) — no client round trip needed. `rows` being
 * undefined means "not provided", which leaves any existing entry untouched.
 */
export function primeVariantOptions(productId: string, rows: any[] | null | undefined): void {
  if (!productId || rows === undefined || rows === null) return;
  commit(productId, buildSummary(parseRows(rows)));
  schedulePersist();
}

async function flush() {
  flushTimer = null;
  const ids = Array.from(pending);
  pending.clear();
  if (ids.length === 0) return;
  const validIds = ids.filter((id) => UUID_RE.test(id));
  const byProduct = new Map<string, any[]>();
  if (validIds.length > 0) {
    const { data, error } = await supabase
      .from('product_variants')
      .select('product_id, combination_key, option_values, inventory, price_difference, is_active, is_default')
      .in('product_id', validIds);
    if (error) {
      // Network hiccup: keep any cached (possibly stale) entries rather than
      // committing empties that would wrongly demote "choose options" buttons.
      ids.forEach((id) => staleIds.delete(id));
      return;
    }
    for (const row of data ?? []) {
      const list = byProduct.get(row.product_id) ?? [];
      list.push(row);
      byProduct.set(row.product_id, list);
    }
  }
  for (const id of ids) {
    commit(id, buildSummary(parseRows(byProduct.get(id) ?? [])));
  }
  schedulePersist();
}

const enqueue = (id: string) => {
  pending.add(id);
  if (!flushTimer) flushTimer = setTimeout(flush, 30);
};

const subscribe = (id: string, fn: () => void) => {
  let subs = listeners.get(id);
  if (!subs) { subs = new Set(); listeners.set(id, subs); }
  subs.add(fn);
  return () => { subs!.delete(fn); };
};

/** Ensure an id is either cached-fresh or queued; returns current value. */
const ensure = (id: string): VariantOptions | undefined => {
  const hit = cache.get(id);
  if (hit === undefined) {
    enqueue(id);
  } else if (staleIds.has(id)) {
    staleIds.delete(id);
    enqueue(id); // serve stale now, refresh in background
  }
  return hit;
};

/** Variant options for a whole product list (shop-page facets & filtering). */
export function useVariantOptionsMap(productIds: string[]): Record<string, VariantOptions> {
  const [map, setMap] = useState<Record<string, VariantOptions>>({});
  const idsKey = productIds.join(',');

  useEffect(() => {
    let alive = true;
    const ids = idsKey ? idsKey.split(',') : [];
    const apply = () => {
      if (!alive) return;
      const next: Record<string, VariantOptions> = {};
      for (const id of ids) {
        const s = cache.get(id);
        if (s && s.variants.length > 0) next[id] = s;
      }
      setMap(next);
    };
    const unsubs = ids.map((id) => subscribe(id, apply));
    ids.forEach((id) => ensure(id));
    apply();
    return () => { alive = false; unsubs.forEach((u) => u()); };
  }, [idsKey]);

  return map;
}

/** Variant options for a single product (card / quick view / detail page). */
export function useVariantOptionsFor(productId: string | undefined): VariantOptions {
  const [summary, setSummary] = useState<VariantOptions>(() =>
    (productId && cache.get(productId)) || EMPTY_VARIANT_OPTIONS
  );

  useEffect(() => {
    if (!productId) return;
    const unsub = subscribe(productId, () => setSummary(cache.get(productId) ?? EMPTY_VARIANT_OPTIONS));
    const hit = ensure(productId);
    if (hit) setSummary(hit);
    return unsub;
  }, [productId]);

  return productId ? summary : EMPTY_VARIANT_OPTIONS;
}

/**
 * Merge detail-based option entries with variant-table options into one
 * [name, values[]] list. Variant options win on name collisions (they carry
 * the real, purchasable combinations).
 */
export function mergeOptionEntries(
  detailEntries: Array<[string, string[]]>,
  variantOptions: Record<string, string[]>
): Array<[string, string[]]> {
  const out: Array<[string, string[]]> = [];
  const seen = new Set<string>();
  Object.entries(variantOptions).forEach(([k, vals]) => {
    if (vals.length === 0) return;
    out.push([k, vals]);
    seen.add(normalizeKey(k));
  });
  detailEntries.forEach(([k, vals]) => {
    if (vals.length === 0 || seen.has(normalizeKey(k))) return;
    out.push([k, vals]);
    seen.add(normalizeKey(k));
  });
  return out;
}
