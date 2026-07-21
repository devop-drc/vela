// Busts the public storefront's server-side edge cache for the calling
// merchant. The Storefront Studio saves design_settings with a plain
// client-side upsert (no edge function in that path), so nothing else
// invalidates the `pubshop:*` / `pubprod:*` cache entries that bundle the
// merchant's appearance settings — a design change would otherwise wait out
// the 5-minute page-cache TTL before appearing on the live /shop storefront.
// The client calls this after a successful design save.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from "../_shared/cors.ts";
import { invalidateShopCache } from "../_shared/cache.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Identity comes from the caller's JWT, never from trusted input — a
    // merchant can only ever invalidate their own shop's cache.
    const bearer = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(bearer);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await invalidateShopCache({ userId: user.id });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    // Fail soft — a missed invalidation just means the change appears a little
    // later; it must never surface as a save error to the merchant.
    console.error('invalidate-shop-cache failed:', (e as Error).message);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
