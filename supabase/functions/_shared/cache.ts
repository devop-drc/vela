// Two-tier server-side cache (the "Redis role" without new infrastructure).
//
// Tier 1: per-isolate in-memory Map with TTL. Supabase reuses warm isolates, so
//         this absorbs most repeat traffic at zero latency.
// Tier 2: `edge_cache` UNLOGGED Postgres table, shared across isolates and
//         functions. Lazy expiry on read; pg_cron purges expired rows.
//
// Both tiers FAIL OPEN: any cache error falls through to the underlying fetch.
// Invalidation deletes from both tiers, but other isolates' memory tier can stay
// stale for up to its memory TTL (default 60s) — that is the accepted staleness
// ceiling of this design; keep memory TTLs short for data that must converge fast.

import { getSupabaseAdmin } from './supabaseAdmin.ts';

interface MemEntry {
  value: unknown;
  expiresAt: number;
}

const MEM_MAX_ENTRIES = 500;
const DEFAULT_MEM_TTL_S = 60;

const mem = new Map<string, MemEntry>();
const inflight = new Map<string, Promise<unknown>>();

function memGet(key: string): unknown | undefined {
  const e = mem.get(key);
  if (!e) return undefined;
  if (e.expiresAt <= Date.now()) {
    mem.delete(key);
    return undefined;
  }
  return e.value;
}

function memSet(key: string, value: unknown, ttlSeconds: number) {
  if (mem.size >= MEM_MAX_ENTRIES) {
    // Simple FIFO eviction — Map preserves insertion order.
    const oldest = mem.keys().next().value;
    if (oldest !== undefined) mem.delete(oldest);
  }
  mem.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/** Read a value from memory, then the edge_cache table. Null on miss/expired. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const hit = memGet(key);
  if (hit !== undefined) return hit as T;
  try {
    const { data } = await getSupabaseAdmin()
      .from('edge_cache')
      .select('value, expires_at')
      .eq('key', key)
      .maybeSingle();
    if (data && new Date(data.expires_at).getTime() > Date.now()) {
      memSet(key, data.value, DEFAULT_MEM_TTL_S);
      return data.value as T;
    }
  } catch (e) {
    console.error(`cacheGet(${key}) failed open:`, (e as Error).message);
  }
  return null;
}

/**
 * Write to both tiers. `ttlSeconds` governs the shared table; the memory tier
 * uses `memTtlSeconds` (default 60s) so invalidation staleness stays bounded.
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
  opts?: { memTtlSeconds?: number },
): Promise<void> {
  memSet(key, value, Math.min(opts?.memTtlSeconds ?? DEFAULT_MEM_TTL_S, ttlSeconds));
  try {
    await getSupabaseAdmin().from('edge_cache').upsert({
      key,
      value,
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    });
  } catch (e) {
    console.error(`cacheSet(${key}) failed open:`, (e as Error).message);
  }
}

/** Delete an exact key or, with `{ prefix: true }`, every key with that prefix. */
export async function cacheDelete(
  keyOrPrefix: string,
  opts?: { prefix?: boolean },
): Promise<void> {
  if (opts?.prefix) {
    for (const k of [...mem.keys()]) if (k.startsWith(keyOrPrefix)) mem.delete(k);
  } else {
    mem.delete(keyOrPrefix);
  }
  try {
    const q = getSupabaseAdmin().from('edge_cache').delete();
    if (opts?.prefix) await q.like('key', `${keyOrPrefix}%`);
    else await q.eq('key', keyOrPrefix);
  } catch (e) {
    console.error(`cacheDelete(${keyOrPrefix}) failed open:`, (e as Error).message);
  }
}

/**
 * Read-through cache with per-isolate single-flight: concurrent callers for the
 * same key share one underlying fetch instead of stampeding the source.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
  opts?: { memTtlSeconds?: number },
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const p = (async () => {
    try {
      const value = await fn();
      // Never cache null/undefined — a miss must stay a miss.
      if (value !== null && value !== undefined) {
        await cacheSet(key, value, ttlSeconds, opts);
      }
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

/**
 * Drop every cached public payload for a shop. Accepts whatever identifier the
 * write path has on hand; resolves the slug when only ids are known.
 */
export async function invalidateShopCache(ident: {
  slug?: string;
  businessId?: string;
  userId?: string;
}): Promise<void> {
  try {
    let slug = ident.slug ?? null;
    const admin = getSupabaseAdmin();

    if (!slug && ident.businessId) {
      const { data } = await admin
        .from('shop_details')
        .select('slug')
        .eq('business_id', ident.businessId)
        .maybeSingle();
      slug = data?.slug ?? null;
    }
    if (!slug && ident.userId) {
      const { data: biz } = await admin
        .from('businesses')
        .select('id')
        .eq('user_id', ident.userId)
        .maybeSingle();
      if (biz?.id) {
        const { data } = await admin
          .from('shop_details')
          .select('slug')
          .eq('business_id', biz.id)
          .maybeSingle();
        slug = data?.slug ?? null;
      }
    }
    if (!slug) return;

    await Promise.all([
      cacheDelete(`pubshop:${slug}:`, { prefix: true }),
      cacheDelete(`pubprod:${slug}:`, { prefix: true }),
    ]);
  } catch (e) {
    console.error('invalidateShopCache failed open:', (e as Error).message);
  }
}
