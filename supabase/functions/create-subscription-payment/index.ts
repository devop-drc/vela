/**
 * Starts a subscription payment via RaiAccept (two-step: order entry →
 * payment session → hosted form URL). recurringModel=ONE_CLICK_CHECKOUT
 * tokenizes the card for renewals.
 *
 * body: { planId, cycle: 'monthly'|'annual', returnUrl, trialSetup?: boolean }
 * trialSetup=true → zero-amount card verification (per docs): stores the
 * card without charging; the webhook then starts the 7-day trial.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildOrderPayload, createOrderEntry, createPaymentSession } from "../_shared/raiaccept.ts";
import { checkPlanFits, type PlanRow } from "../_shared/planGuard.ts";

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

    const { planId, cycle, returnUrl, trialSetup } = await req.json();
    if (!planId || !["monthly", "annual"].includes(cycle)) return json({ error: "Invalid input" }, 400);

    const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).single();
    if (!plan) return json({ error: "Unknown plan" }, 400);

    const amountAll = trialSetup
      ? 0 // card verification only — trial starts on webhook confirmation
      : cycle === "annual"
        ? plan.price_all * (12 - plan.annual_free_months)
        : plan.price_all;

    const { data: sub } = await supabase.from("subscriptions")
      .select("id, status, trial_started_at").eq("user_id", user.id).maybeSingle();

    // One trial per account — a consumed/running trial can never be
    // restarted through a fresh trial_setup checkout.
    if (trialSetup && sub && (sub.status !== "incomplete" || sub.trial_started_at != null)) {
      return json({ error: "trial_already_used" }, 400);
    }

    // Anti-exploit: the target tier must fit the account's current usage
    // (e.g. 200 products synced on a Business trial → Starter is refused).
    const { data: allPlans } = await supabase.from("plans")
      .select("id, name, product_limit, trial_days, is_active, display_order")
      .eq("is_active", true);
    const guard = await checkPlanFits(supabase, user.id, plan as PlanRow, (allPlans ?? []) as PlanRow[]);
    if (!guard.ok) {
      return json({
        error: "over_limit",
        productCount: guard.productCount,
        limit: guard.limit,
        allowedPlanIds: guard.allowedPlanIds,
      }, 409);
    }

    // Payment intent first — its uuid doubles as the unique merchantOrderReference.
    const { data: payment, error: payErr } = await supabase.from("payments").insert({
      user_id: user.id,
      subscription_id: sub?.id ?? null,
      amount_all: amountAll,
      type: trialSetup ? "trial_setup" : "initial",
      payload: { planId, cycle },
    }).select("id").single();
    if (payErr) throw payErr;

    // SECURITY: returnUrl feeds the gateway's redirect targets — validate it
    // against our own origins so this can't become an open redirect.
    const ALLOWED_ORIGINS = new Set([
      "https://instantshop.al",
      "https://www.instantshop.al",
      ...(Deno.env.get("APP_ORIGINS")?.split(",").map((s) => s.trim()).filter(Boolean) ?? []),
      ...(Deno.env.get("ENVIRONMENT") === "development" ? ["http://localhost:5173"] : []),
    ]);
    let base = "https://instantshop.al/billing";
    if (typeof returnUrl === "string") {
      try {
        const u = new URL(returnUrl);
        if (ALLOWED_ORIGINS.has(u.origin)) base = `${u.origin}${u.pathname}`;
      } catch { /* keep default */ }
    }
    const payload = buildOrderPayload({
      amountAll,
      description: `InstantShop ${plan.name} (${cycle})`,
      merchantOrderReference: payment.id,
      email: user.email,
      customerReference: user.id,
      successUrl: `${base}?result=success&ref=${payment.id}`,
      cancelUrl: `${base}?result=cancel&ref=${payment.id}`,
      failUrl: `${base}?result=failure&ref=${payment.id}`,
      notificationUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/raiaccept-webhook`,
    });

    const { orderIdentification } = await createOrderEntry(payload);
    const { url } = await createPaymentSession(orderIdentification, payload);

    await supabase.from("payments")
      .update({ raiaccept_order_id: orderIdentification })
      .eq("id", payment.id);

    return json({ url, orderIdentification });
  } catch (e) {
    console.error("create-subscription-payment:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
