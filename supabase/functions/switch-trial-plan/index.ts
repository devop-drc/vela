/**
 * Switches the tier of a RUNNING trial (no payment involved). The remaining
 * trial time is recalculated proportionally, so tier-hopping can never mint
 * extra days:
 *
 *   consumed  u = elapsed / (old_end - old_start)      (clamped 0..1)
 *   new_end     = now + (1 - u) * new_plan.trial_days
 *   new_start   = new_end - new_plan.trial_days        (keeps u invariant)
 *
 * Downgrade guard: switching to a tier whose product limit is below the
 * account's active product count is refused with 409 { error: "over_limit" }
 * — the UI then shows which tiers fit (see _shared/planGuard.ts for why).
 *
 * body: { planId } → { trial_ends_at } | 409 over_limit | 400 errors
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    const { planId } = await req.json();
    if (!planId) return json({ error: "Invalid input" }, 400);

    const { data: plans } = await supabase.from("plans")
      .select("id, name, product_limit, trial_days, is_active, display_order")
      .eq("is_active", true);
    const plan = (plans as PlanRow[] | null)?.find((p) => p.id === planId);
    if (!plan) return json({ error: "Unknown plan" }, 400);

    const { data: sub } = await supabase.from("subscriptions")
      .select("id, plan_id, status, trial_started_at, trial_ends_at")
      .eq("user_id", user.id).maybeSingle();
    if (!sub) return json({ error: "No subscription" }, 400);
    if (sub.status !== "trialing") return json({ error: "not_trialing" }, 400);
    if (sub.plan_id === planId) return json({ error: "already_on_plan" }, 400);

    // Anti-exploit: usage must fit inside the target tier.
    const guard = await checkPlanFits(supabase, user.id, plan, (plans ?? []) as PlanRow[]);
    if (!guard.ok) {
      return json({
        error: "over_limit",
        productCount: guard.productCount,
        limit: guard.limit,
        allowedPlanIds: guard.allowedPlanIds,
      }, 409);
    }

    // Proportional time recalculation.
    const now = Date.now();
    const end = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : now;
    if (end <= now) return json({ error: "trial_expired" }, 400);
    const start = sub.trial_started_at
      ? new Date(sub.trial_started_at).getTime()
      : end - 7 * 86400000; // legacy rows: assume the old 7-day window
    const total = Math.max(1, end - start);
    const u = Math.min(1, Math.max(0, (now - start) / total));

    const newDays = plan.trial_days ?? 7;
    const newEnd = new Date(now + (1 - u) * newDays * 86400000);
    const newStart = new Date(newEnd.getTime() - newDays * 86400000);

    const { error: updErr } = await supabase.from("subscriptions").update({
      plan_id: planId,
      trial_ends_at: newEnd.toISOString(),
      trial_started_at: newStart.toISOString(),
    }).eq("id", sub.id).eq("status", "trialing"); // status re-checked = no race with expiry
    if (updErr) throw updErr;

    return json({ trial_ends_at: newEnd.toISOString() });
  } catch (e) {
    console.error("switch-trial-plan:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
