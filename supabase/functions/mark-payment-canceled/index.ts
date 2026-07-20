/**
 * Marks the caller's own PENDING payment intent as canceled — invoked when
 * the user lands back from the RaiAccept hosted form with result=cancel (or
 * failure with no webhook settlement). Only pending rows can flip, so a
 * webhook-settled 'paid'/'failed' status always wins. Stale intents that
 * never return are swept by the expire_subscriptions cron after 24h.
 *
 * body: { paymentId } → { ok: true }
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: { user }, error: authErr } =
      await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { paymentId } = await req.json();
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(String(paymentId ?? ""))) return json({ error: "Invalid input" }, 400);

    await supabase.from("payments")
      .update({ status: "canceled" })
      .eq("id", paymentId)
      .eq("user_id", user.id)
      .eq("status", "pending");

    return json({ ok: true });
  } catch (e) {
    console.error("mark-payment-canceled:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
