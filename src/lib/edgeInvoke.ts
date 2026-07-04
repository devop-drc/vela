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
