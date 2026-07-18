// Resilient wrapper around supabase.functions.invoke. The backend is slow
// enough under load that browser fetches to Edge Functions intermittently drop
// or reset the connection (surfaced as FunctionsFetchError: "Failed to send a
// request"). Those are transient — a short retry usually succeeds. Real
// application errors (the function returned { error }) are NOT retried; they're
// returned to the caller unchanged.

import { supabase } from '@/integrations/supabase/client';

const isTransientNetworkError = (err: any): boolean => {
  if (!err) return false;
  const name = err.name || err.constructor?.name || '';
  const msg = String(err.message || err);
  return name === 'FunctionsFetchError'
    || /failed to send a request/i.test(msg)
    || /network|fetch failed|load failed|connection|timeout/i.test(msg);
};

interface Options {
  body?: unknown;
  headers?: Record<string, string>;
  /** Extra attempts after the first (default 2 → up to 3 tries total). */
  retries?: number;
  /** Base backoff; grows linearly per attempt (default 700ms). */
  baseDelayMs?: number;
}

/** Invoke an edge function, retrying only transient connection failures. */
export async function invokeWithRetry<T = any>(
  fn: string,
  { body, headers, retries = 2, baseDelayMs = 700 }: Options = {}
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(fn, {
        body: body as any,
        ...(headers ? { headers } : {}),
      });
      if (error) throw error; // network/HTTP-level failure → maybe retry below
      return data as T;        // includes any { error } payload for the caller to handle
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isTransientNetworkError(err)) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * (attempt + 1)));
    }
  }
  throw lastErr;
}

// ── GET path for public reads ────────────────────────────────────────────────
// invoke() always POSTs, which is uncacheable. Public read functions
// (get-public-shop-data, get-public-product) also accept GET with query params
// and reply with Cache-Control headers, so browsers/CDNs can cache them.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export type EdgeGetParams = Record<string, string | number | undefined>;

/**
 * GET an edge function with query params. Parses JSON; throws on network
 * failure, non-2xx status (using the body's { error } message when present),
 * or a non-JSON body. Sends both `apikey` and a Bearer of the publishable key
 * so it works whether or not the deployed function still verifies JWTs.
 */
export async function edgeGet<T = any>(fnName: string, params: EdgeGetParams = {}): Promise<T> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) qs.set(key, String(value));
  });
  const query = qs.toString();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}${query ? `?${query}` : ''}`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error || ''; } catch { /* non-JSON error body */ }
    throw new Error(detail || `Edge function ${fnName} failed with status ${res.status}`);
  }
  return await res.json() as T; // includes any { error } payload for the caller to handle
}

// Deployed-function lag: until the GET-capable functions are live, GETs 404 /
// error. We then fall back to the POST invoke path so the storefront keeps
// working — warned once per session, not per call.
let warnedGetFallback = false;

/**
 * GET with the same transient-retry semantics as invokeWithRetry, falling
 * back to the POST invoke path (with `params` as the body) if the GET fails
 * outright — deploy-order-proof while the server side rolls out.
 */
export async function edgeGetWithRetry<T = any>(
  fnName: string,
  params: EdgeGetParams = {},
  { retries = 2, baseDelayMs = 700 }: Pick<Options, 'retries' | 'baseDelayMs'> = {}
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await edgeGet<T>(fnName, params);
    } catch (err) {
      lastErr = err;
      // fetch() rejects with a TypeError on network failure — treat as transient.
      const transient = err instanceof TypeError || isTransientNetworkError(err);
      if (attempt === retries || !transient) break;
      await new Promise((r) => setTimeout(r, baseDelayMs * (attempt + 1)));
    }
  }
  // GET exhausted (or failed non-transiently, e.g. the deployed function
  // doesn't accept GET yet) → POST fallback with identical semantics.
  if (!warnedGetFallback) {
    warnedGetFallback = true;
    console.warn(`edgeGet: GET ${fnName} failed, falling back to POST invoke for this session.`, lastErr);
  }
  return invokeWithRetry<T>(fnName, { body: params, retries, baseDelayMs });
}
