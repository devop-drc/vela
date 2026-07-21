// Tiny stale-while-revalidate cache for page data. Pages seed their initial
// state from here so navigating back shows content INSTANTLY (no spinner),
// then revalidate in the background and write the fresh result back.
//
// Two tiers:
//   • in-memory Map — survives client-side navigation within a session.
//   • localStorage mirror — survives full reloads / new tabs (bounded TTL).
//
// Keys are namespaced per logged-in user so one account never sees another's
// cached data. Everything is best-effort: any storage error degrades to "no
// cache" (a normal fetch), never throws.

const MEM = new Map<string, unknown>();
const LS_PREFIX = 'pgcache:';
// Bump when a cached shape changes so old snapshots are ignored, not misread.
const VERSION = 'v1';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

interface Envelope<T> { v: string; t: number; data: T; }

/** Read the current session's user id SYNCHRONOUSLY from the Supabase auth
    token in localStorage. Every cache entry is scoped by this so one account
    can never read another's snapshot — even on the very first synchronous
    render, before any async auth listener has had a chance to run. */
// Small stable string hash (djb2) — used only as a fail-CLOSED fallback so two
// different sessions never share a cache slot even if the token can't be parsed.
const hash = (s: string): string => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

function currentUserId(): string {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const ref = url?.match(/https?:\/\/([^.]+)\./)?.[1];
  if (!ref) return 'anon';
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(`sb-${ref}-auth-token`);
  } catch {
    return 'anon';
  }
  if (!raw) return 'anon'; // genuinely logged out
  try {
    let json = raw;
    // supabase-js ≥2.x may store the session base64url-encoded with a prefix.
    if (json.startsWith('base64-')) {
      const b64 = json.slice('base64-'.length).replace(/-/g, '+').replace(/_/g, '/');
      json = decodeURIComponent(escape(atob(b64)));
    }
    const parsed = JSON.parse(json);
    const id = parsed?.user?.id ?? parsed?.currentSession?.user?.id;
    if (id) return id;
  } catch {
    /* fall through to hash fallback */
  }
  // A session token exists but we couldn't read its id — isolate by hashing the
  // token so distinct sessions still get distinct slots (fail closed).
  return `t_${hash(raw)}`;
}

// Scope the storage/memory key by the current user. A different (or logged-out)
// user resolves to a different slot, so cross-user reads return a clean miss.
const scoped = (key: string) => `${key}::${currentUserId()}`;
const lsKey = (key: string) => `${LS_PREFIX}${key}`;

/** Read a cached snapshot (memory first, then localStorage). Returns undefined
    on miss, expiry, or version mismatch. */
export function readCache<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | undefined {
  const sk = scoped(key);
  if (MEM.has(sk)) return MEM.get(sk) as T;
  try {
    const raw = localStorage.getItem(lsKey(sk));
    if (!raw) return undefined;
    const env = JSON.parse(raw) as Envelope<T>;
    if (env.v !== VERSION || Date.now() - env.t > ttlMs) {
      localStorage.removeItem(lsKey(sk));
      return undefined;
    }
    MEM.set(sk, env.data); // promote to memory for the rest of the session
    return env.data;
  } catch {
    return undefined;
  }
}

/** Store a snapshot in memory + localStorage. */
export function writeCache<T>(key: string, data: T): void {
  const sk = scoped(key);
  MEM.set(sk, data);
  try {
    localStorage.setItem(lsKey(sk), JSON.stringify({ v: VERSION, t: Date.now(), data } as Envelope<T>));
  } catch {
    // Quota exceeded / disabled storage — memory tier still works this session.
  }
}

/** Drop one key (e.g. after a mutation that invalidates a snapshot). */
export function clearCache(key: string): void {
  const sk = scoped(key);
  MEM.delete(sk);
  try { localStorage.removeItem(lsKey(sk)); } catch { /* ignore */ }
}

/** Drop every entry whose key starts with `prefix` (e.g. 'storefront:' after a
    design save, to invalidate all of a shop's page snapshots at once). Best-
    effort; over-clearing only forces a harmless refetch. */
export function clearCacheByPrefix(prefix: string): void {
  for (const k of Array.from(MEM.keys())) {
    if (k.startsWith(prefix)) MEM.delete(k);
  }
  try {
    const lsNeedle = `${LS_PREFIX}${prefix}`;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(lsNeedle)) localStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}

/** Wipe every page-cache entry (call on sign-out so the next user starts clean). */
export function clearAllPageCache(): void {
  MEM.clear();
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX)) localStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}
