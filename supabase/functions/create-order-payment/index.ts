/**
 * Starts a RaiAccept hosted-form payment for a storefront ORDER (one-off
 * purchase — no card tokenization). Called right after create-order placed the
 * order with payment_method 'card' / payment_status 'processing'.
 *
 * body: { orderId, shopSlug, returnUrl }
 * → { url } — the hosted payment form; the raiaccept-webhook settles the
 *   order's payment_status after API re-verification.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildOrderPayload, createOrderEntry, createPaymentSession } from "../_shared/raiaccept.ts";

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

    const { orderId, shopSlug, returnUrl } = await req.json();
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(String(orderId ?? "")) || !shopSlug) return json({ error: "Invalid input" }, 400);

    // The order must belong to the given shop, be a card order, and not be
    // settled yet. Amounts come from OUR db row, never from the client.
    const { data: shop } = await supabase.from("shop_details")
      .select("business_id, shop_name, businesses(user_id)")
      .eq("slug", shopSlug).single();
    if (!shop) return json({ error: "Shop not found" }, 404);

    const { data: order } = await supabase.from("orders")
      .select("id, business_id, total_amount, customer_email, payment_method, payment_status")
      .eq("id", orderId).eq("business_id", shop.business_id).single();
    if (!order) return json({ error: "Order not found" }, 404);
    if (order.payment_method === "cash_on_delivery") return json({ error: "Order is cash on delivery" }, 400);
    if (order.payment_status === "paid") return json({ error: "Order is already paid" }, 400);

    const ownerUserId = (shop as any).businesses?.user_id ?? null;
    const amountAll = Math.round(Number(order.total_amount)); // stored in ALL; RaiAccept wants whole ALL
    if (!amountAll || amountAll <= 0) return json({ error: "Order total is invalid" }, 400);

    // Payment intent row — its uuid is the unique merchantOrderReference the
    // webhook uses to find and settle this attempt.
    const { data: payment, error: payErr } = await supabase.from("payments").insert({
      user_id: ownerUserId,
      amount_all: amountAll,
      type: "order",
      payload: { orderId: order.id, shopSlug },
    }).select("id").single();
    if (payErr) throw payErr;

    // Validate returnUrl against our own origins (defense against open redirect).
    const ALLOWED_ORIGINS = new Set([
      "https://instantshop.al",
      "https://www.instantshop.al",
      ...(Deno.env.get("APP_ORIGINS")?.split(",").map((s) => s.trim()).filter(Boolean) ?? []),
      ...(Deno.env.get("ENVIRONMENT") === "development" ? ["http://localhost:5173"] : []),
    ]);
    let base = `https://instantshop.al/shop/${shopSlug}/orders`;
    if (typeof returnUrl === "string") {
      try {
        const u = new URL(returnUrl);
        if (ALLOWED_ORIGINS.has(u.origin)) base = `${u.origin}${u.pathname}`;
      } catch { /* keep default */ }
    }

    const payload = buildOrderPayload({
      amountAll,
      description: `${shop.shop_name || "Shop"} order #${String(order.id).slice(0, 8)}`,
      merchantOrderReference: payment.id,
      email: order.customer_email,
      customerReference: order.id, // unused in oneOff mode but required by the type
      oneOff: true,
      successUrl: `${base}?orderId=${order.id}&payment=success`,
      cancelUrl: `${base}?orderId=${order.id}&payment=cancelled`,
      failUrl: `${base}?orderId=${order.id}&payment=failed`,
      notificationUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/raiaccept-webhook`,
    });

    const { orderIdentification } = await createOrderEntry(payload);
    const { url } = await createPaymentSession(orderIdentification, payload);

    await supabase.from("payments")
      .update({ raiaccept_order_id: orderIdentification })
      .eq("id", payment.id);

    return json({ url });
  } catch (e) {
    console.error("create-order-payment:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
