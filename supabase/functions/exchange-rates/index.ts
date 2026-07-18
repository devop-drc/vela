import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { cached } from "../_shared/cache.ts";

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // external refresh interval

// Reads the DB-cached rates or refreshes them from the external API when the
// 24h window has lapsed. Runs behind cached()'s single-flight, so concurrent
// stale requests no longer race the external API with duplicate fetches.
const getRates = async (): Promise<{ rates: Record<string, number>; source: string }> => {
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Check for cached rates
  const { data: cachedData, error: cacheError } = await supabaseAdmin
    .from('exchange_rates_cache')
    .select('rates, last_fetched_at')
    .eq('id', 1)
    .single();

  if (cacheError && cacheError.code !== 'PGRST116') { // PGRST116 = no rows found
    throw cacheError;
  }

  if (cachedData && (new Date().getTime() - new Date(cachedData.last_fetched_at).getTime()) < CACHE_DURATION_MS) {
    return { rates: cachedData.rates, source: 'cache' };
  }

  // 2. Fetch new rates from ExchangeRate-API (which uses USD as base)
  const API_KEY = Deno.env.get('EXCHANGE_RATE_API_KEY');
  if (!API_KEY) {
    throw new Error("Exchange Rate API key is not configured in Supabase secrets.");
  }

  const response = await fetch(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`);
  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rates. Status: ${response.status}`);
  }

  const data = await response.json();
  if (data.result === 'error') {
    throw new Error(`Exchange Rate API Error: ${data['error-type']}`);
  }

  const usdBasedRates = data.conversion_rates;

  // Ensure ALL is present, add fallback if needed
  if (!usdBasedRates['ALL']) {
    usdBasedRates['ALL'] = 93.5; // Fallback rate: 1 USD = 93.5 ALL
  }

  // 3. Convert USD-based rates to ALL-based rates
  const allToUsdRate = 1 / usdBasedRates['ALL']; // 1 ALL = X USD
  const allBasedRates: { [key: string]: number } = {};

  for (const currencyCode in usdBasedRates) {
    if (Object.prototype.hasOwnProperty.call(usdBasedRates, currencyCode)) {
      // Rate from ALL to currencyCode = (Rate from USD to currencyCode) / (Rate from USD to ALL)
      allBasedRates[currencyCode] = usdBasedRates[currencyCode] * allToUsdRate;
    }
  }
  allBasedRates['ALL'] = 1; // 1 ALL = 1 ALL

  // 4. Update the cache in the database
  const { error: upsertError } = await supabaseAdmin
    .from('exchange_rates_cache')
    .upsert({
      id: 1,
      rates: allBasedRates,
      last_fetched_at: new Date().toISOString(),
    });

  if (upsertError) {
    console.error("Exchange Rate Function: Failed to update exchange rate cache:", upsertError);
  }

  return { rates: allBasedRates, source: 'live' };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Memory-tier cache (1h) absorbs the exchange_rates_cache read entirely on
    // warm isolates; the DB row keeps its own 24h freshness window inside.
    // The edge_cache tier is skipped here on purpose — the rates already have
    // a dedicated table; a second jsonb copy would add nothing.
    const result = await cached('rates:ALL', 3600, getRates, { memTtlSeconds: 3600 });

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        // Rates refresh daily; let browsers hold them for an hour.
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
      status: 200,
    });
  } catch (error) {
    console.error('Exchange Rate Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
