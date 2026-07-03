/**
 * RaiAccept notification webhook. Per docs: webhooks are status updates, NOT
 * final confirmation — we re-verify via Retrieve-order-transactions before
 * settling. statusCode "0000" = success. Deliveries may repeat (up to 3
 * retries), so settlement is idempotent.
 *
 * Payload shape: { transaction: { transactionId, statusCode, transactionType,
 * ... }, order: { orderIdentification, invoice: { merchantOrderReference } },
 * card: { cardToken, maskedCardNumber }, ... }
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getOrderTransactions } from "../_shared/raiaccept.ts";

const ok = () => new Response("ok", { status: 200 });

const periodEnd = (cycle: string, from: Date) => {
  const d = new Date(from);
  if (cycle === "annual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
};

serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId: string | undefined =
      body?.order?.orderIdentification ?? body?.orderIdentification;
    if (!orderId) return ok();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: payment } = await supabase.from("payments")
      .select("id, user_id, amount_all, type, payload, status")
      .eq("raiaccept_order_id", orderId).maybeSingle();
    if (!payment || payment.status === "paid") return ok(); // unknown / already settled

    // SECURITY: the webhook body is unauthenticated — it is only ever a
    // trigger. Settlement requires verification against the RaiAccept API.
    // If verification is unavailable we do NOT settle: we ack and let the
    // gateway retry (≤3×); the payment stays pending for reconciliation.
    let verifiedSuccess = false;
    let verifiedFailure = false;
    let txId: string | null = null;
    let verifiedCardToken: string | null = null;
    try {
      const txRes = await getOrderTransactions(orderId);
      const txs: any[] = Array.isArray(txRes) ? txRes : txRes?.transactions ?? [];
      const purchases = txs.filter((t) =>
        String(t?.transactionType ?? "PURCHASE").toUpperCase() === "PURCHASE");
      const okTx = purchases.find((t) => {
        if (String(t?.statusCode ?? "") !== "0000") return false;
        // The verified transaction must match OUR payment intent.
        const amt = Number(t?.transactionAmount ?? t?.amount ?? NaN);
        return Number.isNaN(amt) || amt === Number(payment.amount_all);
      });
      if (okTx) {
        verifiedSuccess = true;
        txId = okTx.transactionId ?? null;
        verifiedCardToken = okTx?.card?.cardToken ?? okTx?.cardToken ?? null;
      } else if (purchases.length > 0) {
        verifiedFailure = true; // transactions exist, none successful+matching
      }
    } catch (e) {
      console.error("verification unavailable — not settling:", e);
      return ok(); // ack so RaiAccept retries; never settle on body alone
    }

    // Card token: prefer the verified source. Accept the body's token only
    // when the body also proves knowledge of our unguessable payment uuid.
    const bodyRefMatches =
      String(body?.order?.invoice?.merchantOrderReference ?? "") === String(payment.id);
    const cardToken: string | null =
      verifiedCardToken ?? (bodyRefMatches ? body?.card?.cardToken ?? null : null);
    const { planId, cycle } = (payment.payload ?? {}) as { planId?: string; cycle?: string };
    const now = new Date();

    if (verifiedSuccess) {
      await supabase.from("payments").update({
        status: "paid",
        raiaccept_transaction_id: txId,
        payload: { ...(payment.payload ?? {}), webhook: body },
      }).eq("id", payment.id);

      if (payment.type === "trial_setup") {
        // Card verified (zero-amount) → start the 7-day trial.
        await supabase.from("subscriptions").update({
          plan_id: planId ?? "pro",
          status: "trialing",
          billing_cycle: cycle === "annual" ? "annual" : "monthly",
          trial_ends_at: new Date(now.getTime() + 7 * 86400000).toISOString(),
          raiaccept_customer_ref: payment.user_id,
          ...(cardToken ? { raiaccept_card_token: cardToken } : {}),
        }).eq("user_id", payment.user_id);
      } else {
        // Real charge → active period.
        await supabase.from("subscriptions").update({
          plan_id: planId ?? "pro",
          status: "active",
          billing_cycle: cycle === "annual" ? "annual" : "monthly",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd(cycle ?? "monthly", now).toISOString(),
          raiaccept_customer_ref: payment.user_id,
          ...(cardToken ? { raiaccept_card_token: cardToken } : {}),
        }).eq("user_id", payment.user_id);
      }
    } else if (verifiedFailure) {
      await supabase.from("payments").update({
        status: "failed",
        payload: { ...(payment.payload ?? {}), webhook: body },
      }).eq("id", payment.id);
      if (payment.type === "renewal") {
        await supabase.from("subscriptions").update({ status: "past_due" })
          .eq("user_id", payment.user_id);
      }
    }
    // No transactions yet → leave pending; a later webhook/retry settles it.
    return ok();
  } catch (e) {
    console.error("raiaccept-webhook:", e);
    return ok(); // always ack — RaiAccept retries and we re-verify anyway
  }
});
