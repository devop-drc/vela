// Single-flight exchange-rate loader shared by every provider that needs
// rates (CurrencyContext, ShopContext, StorefrontContext). Before this helper
// each context fetched independently on mount: 3 reads of
// `exchange_rates_cache` per page load and, when stale, up to 3 racing calls
// to the external exchange-rates edge function. Now the first caller does the
// work and everyone else awaits the same promise.
//
// Freshness model:
//   • module-level resolved value — authoritative for the session.
//   • pgcache SWR mirror (localStorage) — lets providers hydrate state
//     synchronously on first render, before the network resolves.
//   • cache table pre-check → edge-function fallback — same logic the
//     contexts used to duplicate, extracted verbatim.

import { supabase } from '@/integrations/supabase/client';
import { readCache, writeCache } from '@/lib/pageCache';

export type Rates = Record<string, number>;

// Same key the contexts already used — rates are global, so either surface
// warming the cache benefits the other (per pageCache user-scoping, admin and
// anon visits each keep their own slot).
export const RATES_CACHE_KEY = 'vela:exchangeRates:v1';

let resolved: Rates | null = null;
let inFlight: Promise<Rates> | null = null;

/** Synchronous read of the freshest known rates (session value first, then
    the persisted SWR mirror) — for initial useState hydration so prices render
    in the correct currency on the very first frame. */
export function readCachedRates(): Rates | null {
  return resolved ?? readCache<Rates>(RATES_CACHE_KEY) ?? null;
}

/**
 * Load exchange rates (ALL → code) once per session. Concurrent callers share
 * one in-flight request; later callers resolve instantly from the session
 * value. Throws only when no rates could be obtained at all (no fresh cache,
 * edge function failed, no stale rows to fall back on) — callers decide how
 * to surface that.
 */
export function getExchangeRates(): Promise<Rates> {
  if (resolved) return Promise.resolve(resolved);
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      // 1) Cache table pre-check — one cheap read, much faster than invoking
      //    the edge function.
      const { data: cached } = await supabase
        .from('exchange_rates_cache')
        .select('rates, last_fetched_at')
        .eq('id', 1)
        .maybeSingle();

      const isFresh = cached?.last_fetched_at
        && Date.now() - new Date(cached.last_fetched_at).getTime() < 24 * 60 * 60 * 1000;

      if (cached?.rates && isFresh) {
        resolved = cached.rates as Rates;
        writeCache(RATES_CACHE_KEY, resolved);
        return resolved;
      }

      // 2) Fallback to the edge function (which refreshes the cache table).
      const { data, error } = await supabase.functions.invoke('exchange-rates');
      if (error || (data && data.error)) {
        const message = error?.message || (data && data.error) || 'An unknown error occurred.';
        if (cached?.rates) {
          // Stale beats nothing — serve yesterday's rates rather than none.
          console.warn('exchangeRates: refresh failed, serving stale cached rates:', message);
          resolved = cached.rates as Rates;
          return resolved;
        }
        throw new Error(message);
      }
      if (!data?.rates) throw new Error('Exchange-rates function returned no rates.');
      resolved = data.rates as Rates;
      writeCache(RATES_CACHE_KEY, resolved);
      return resolved;
    } finally {
      // Clear the gate either way: on success later callers hit `resolved`;
      // on failure the next caller may retry.
      inFlight = null;
    }
  })();

  return inFlight;
}
