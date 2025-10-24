import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to create a Supabase client with the service role key to bypass RLS
const getSupabaseAdmin = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

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
      return new Response(JSON.stringify({ rates: cachedData.rates, source: 'cache' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 3. Fetch new rates from ExchangeRate-API (which uses USD as base)
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

    // 4. Convert USD-based rates to ALL-based rates
    const allToUsdRate = 1 / usdBasedRates['ALL']; // 1 ALL = X USD
    const allBasedRates: { [key: string]: number } = {};

    for (const currencyCode in usdBasedRates) {
      if (Object.prototype.hasOwnProperty.call(usdBasedRates, currencyCode)) {
        // Rate from ALL to currencyCode = (Rate from USD to currencyCode) / (Rate from USD to ALL)
        allBasedRates[currencyCode] = usdBasedRates[currencyCode] * allToUsdRate;
      }
    }
    allBasedRates['ALL'] = 1; // 1 ALL = 1 ALL

    // 5. Update the cache in the database
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

    // 6. Return the newly fetched ALL-based rates
    return new Response(JSON.stringify({ rates: allBasedRates, source: 'live' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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