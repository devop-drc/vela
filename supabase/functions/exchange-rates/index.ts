import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get('EXCHANGE_RATE_API_KEY');
    if (!API_KEY) {
      throw new Error("Exchange Rate API key is not configured in Supabase secrets.");
    }

    // Using USD as the base currency as it's most common for free API tiers
    // and contains all necessary conversion rates.
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`);
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates. Status: ${response.status}`);
    }

    const data = await response.json();
    if (data.result === 'error') {
      throw new Error(`Exchange Rate API Error: ${data['error-type']}`);
    }

    const rates = data.conversion_rates;

    return new Response(JSON.stringify({ rates }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});