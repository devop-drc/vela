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
      // 2. Return cached data if it's fresh
      return new Response(JSON.stringify({ rates: cachedData.rates, source: 'cache' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 3. Fetch new rates if cache is stale or non-existent
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

    const newRates = data.conversion_rates;

    // Add a fallback for ALL (Albanian Lek) if not provided by the API
    // Assuming 1 USD = 93.5 ALL as a reasonable approximation if not present
    if (!newRates['ALL']) {
      newRates['ALL'] = 93.5; 
      console.log("Added fallback rate for ALL (Albanian Lek).");
    }

    // 4. Update the cache in the database
    const { error: upsertError } = await supabaseAdmin
      .from('exchange_rates_cache')
      .upsert({
        id: 1,
        rates: newRates,
        last_fetched_at: new Date().toISOString(),
      });

    if (upsertError) {
      // Log the error but still return the new rates to the user
      console.error("Failed to update exchange rate cache:", upsertError);
    }

    // 5. Return the newly fetched rates
    return new Response(JSON.stringify({ rates: newRates, source: 'live' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Exchange Rate Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});