import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In a real application, this would fetch from a live API like the ECB or Open Exchange Rates.
// For this demo, we are using mocked, static rates with USD as the base.
const MOCKED_RATES = {
  "USD": 1.00,
  "EUR": 0.92,
  "GBP": 0.79,
  "JPY": 157.25,
  "CAD": 1.37,
  "AUD": 1.50,
  "ALL": 93.50, // Albanian Lek
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Here you would typically have logic to fetch and cache fresh rates.
    // For example:
    // const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    // const data = await response.json();
    // const rates = data.rates;

    return new Response(JSON.stringify({ rates: MOCKED_RATES }), {
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