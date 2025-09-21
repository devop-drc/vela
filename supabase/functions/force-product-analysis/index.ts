import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { caption } = await req.json();
    if (!caption) {
      throw new Error("Caption is required.");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: analysisData, error: analysisError } = await supabase.functions.invoke('ai-product-analyzer', {
      body: { caption: caption },
    });

    if (analysisError) throw analysisError;
    if (analysisData.error) throw new Error(analysisData.error);

    const productDetails = analysisData.isProductPost ? analysisData.product : {
        name: "New Product",
        category: "generic",
        description: caption,
        price: 0,
        currency: "USD",
        tags: [],
        details: { type: "generic" }
    };

    return new Response(JSON.stringify(productDetails), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});