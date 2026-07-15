/**
 * Admin API — service-role data access for the /admin panel. RLS is strictly
 * per-owner, so cross-user reads (and auth.users emails) must go through
 * here. Every call verifies the caller's JWT AND their admin role.
 *
 * actions:
 *  overview                     → totals + MRR (ALL) + signups
 *  users { page?, search? }     → paginated user list (email + shop + sub)
 *  user { userId }              → full detail + payments + counts
 *  extend_trial { userId, days }→ (re)start/extend a trial
 *  set_status { userId, status }→ 'canceled' | 'expired' | 'active'
 *  set_plan { userId, planId, endDate, billingCycle? }
 *                               → manually assign a plan, active until endDate
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PER_PAGE = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Authenticate + authorize the caller.
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user }, error: authErr } = await db.auth.getUser(jwt);
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);
    const { data: role } = await db.from("user_roles")
      .select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    /* ── enrich a set of user ids with app data ─────────────────────── */
    const enrich = async (ids: string[]) => {
      const [profiles, shops, subs] = await Promise.all([
        db.from("profiles").select("id, first_name, last_name, phone_number").in("id", ids),
        db.from("businesses").select("user_id, created_at, shop_details(shop_name, slug, storefront_type, media_count)").in("user_id", ids),
        db.from("subscriptions").select("user_id, plan_id, status, billing_cycle, trial_ends_at, current_period_end").in("user_id", ids),
      ]);
      const pMap = new Map((profiles.data ?? []).map((p: any) => [p.id, p]));
      const bMap = new Map((shops.data ?? []).map((b: any) => [b.user_id, b]));
      const sMap = new Map((subs.data ?? []).map((s: any) => [s.user_id, s]));
      return { pMap, bMap, sMap };
    };

    const rowFor = (u: any, maps: Awaited<ReturnType<typeof enrich>>) => {
      const p = maps.pMap.get(u.id);
      const b = maps.bMap.get(u.id);
      const shop = Array.isArray(b?.shop_details) ? b?.shop_details[0] : b?.shop_details;
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        name: [p?.first_name, p?.last_name].filter(Boolean).join(" ") || null,
        phone: p?.phone_number ?? null,
        shop_name: shop?.shop_name ?? null,
        slug: shop?.slug ?? null,
        storefront_type: shop?.storefront_type ?? null,
        instagram_media_count: shop?.media_count ?? null,
        subscription: maps.sMap.get(u.id) ?? null,
      };
    };

    if (action === "overview") {
      const [{ count: userCount }, subsRes, plansRes, { count: signups30 }] = await Promise.all([
        db.from("profiles").select("id", { count: "exact", head: true }),
        db.from("subscriptions").select("status, plan_id, billing_cycle"),
        db.from("plans").select("id, price_all, annual_free_months"),
        db.from("businesses").select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
      ]);
      const subs = subsRes.data ?? [];
      const plans = new Map((plansRes.data ?? []).map((p: any) => [p.id, p]));
      const byStatus: Record<string, number> = {};
      let mrr = 0;
      for (const s of subs as any[]) {
        byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
        if (s.status === "active") {
          const p = plans.get(s.plan_id);
          if (p) mrr += s.billing_cycle === "annual"
            ? Math.round((p.price_all * (12 - p.annual_free_months)) / 12)
            : p.price_all;
        }
      }
      return json({ userCount: userCount ?? 0, byStatus, mrrAll: mrr, signups30: signups30 ?? 0 });
    }

    if (action === "users") {
      const page = Math.max(1, Number(body?.page ?? 1));
      const search = String(body?.search ?? "").trim();
      let users: any[] = [];
      let total: number | null = null;

      if (search) {
        // Search by shop name/slug/profile name → resolve to auth users.
        const [byShop, byName] = await Promise.all([
          db.from("shop_details").select("business_id, businesses(user_id)")
            .or(`shop_name.ilike.%${search}%,slug.ilike.%${search}%`).limit(20),
          db.from("profiles").select("id")
            .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`).limit(20),
        ]);
        const ids = new Set<string>();
        for (const r of (byShop.data ?? []) as any[]) {
          const uid = Array.isArray(r.businesses) ? r.businesses[0]?.user_id : r.businesses?.user_id;
          if (uid) ids.add(uid);
        }
        for (const r of (byName.data ?? []) as any[]) ids.add(r.id);
        users = (await Promise.all([...ids].slice(0, 20).map(async (id) =>
          (await db.auth.admin.getUserById(id)).data?.user))).filter(Boolean);
        // Email search: scan the current listUsers page too.
        if (search.includes("@") || users.length === 0) {
          const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
          for (const u of data?.users ?? []) {
            if (u.email?.toLowerCase().includes(search.toLowerCase()) && !users.find((x) => x.id === u.id)) users.push(u);
          }
          users = users.slice(0, 20);
        }
      } else {
        const { data } = await db.auth.admin.listUsers({ page, perPage: PER_PAGE });
        users = data?.users ?? [];
        total = (data as any)?.total ?? null;
      }

      const maps = await enrich(users.map((u) => u.id));
      return json({ page, perPage: PER_PAGE, total, users: users.map((u) => rowFor(u, maps)) });
    }

    if (action === "user") {
      const userId = String(body?.userId ?? "");
      const { data: target } = await db.auth.admin.getUserById(userId);
      if (!target?.user) return json({ error: "Not found" }, 404);
      const maps = await enrich([userId]);
      const [payments, products, fromInstagram, orders, aiUsage] = await Promise.all([
        db.from("payments").select("id, amount_all, status, type, created_at")
          .eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
        db.from("products").select("id", { count: "exact", head: true }).eq("user_id", userId),
        db.from("products").select("id", { count: "exact", head: true })
          .eq("user_id", userId).not("instagram_post_id", "is", null),
        db.from("orders").select("status, businesses!inner(user_id)")
          .eq("businesses.user_id", userId).limit(5000),
        // ai_usage may not exist yet (pending migration) — treat errors as empty.
        db.from("ai_usage").select("input_tokens, output_tokens, cost_usd")
          .eq("user_id", userId).limit(10000),
      ]);

      const ordersByStatus: Record<string, number> = {};
      for (const o of (orders.data ?? []) as any[]) {
        ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;
      }

      let ai = { calls: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 };
      if (!aiUsage.error) {
        for (const r of (aiUsage.data ?? []) as any[]) {
          ai.calls += 1;
          ai.input_tokens += r.input_tokens ?? 0;
          ai.output_tokens += r.output_tokens ?? 0;
          ai.cost_usd += Number(r.cost_usd ?? 0);
        }
        ai.cost_usd = Math.round(ai.cost_usd * 10000) / 10000;
      }

      return json({
        ...rowFor(target.user, maps),
        payments: payments.data ?? [],
        productCount: products.count ?? 0,
        productsFromInstagram: fromInstagram.count ?? 0,
        orderCount: (orders.data ?? []).length,
        ordersByStatus,
        aiUsage: aiUsage.error ? null : ai,
      });
    }

    if (action === "create_user") {
      const email = String(body?.email ?? "").trim().toLowerCase();
      const password = String(body?.password ?? "");
      const firstName = String(body?.firstName ?? "").trim();
      const lastName = String(body?.lastName ?? "").trim();
      const newRole = body?.role ? String(body.role) : null;
      if (!email.includes("@") || password.length < 8) return json({ error: "Valid email + password (min 8) required" }, 400);
      if (newRole && !["admin", "management", "support"].includes(newRole)) return json({ error: "Invalid role" }, 400);

      // The auth trigger provisions profile/business/shop + subscription shell.
      const { data: created, error: createErr } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName || email.split("@")[0],
          last_name: lastName,
          full_name: [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0],
        },
      });
      if (createErr) return json({ error: createErr.message }, 400);

      if (newRole && created.user) {
        const { error: roleErr } = await db.from("user_roles")
          .upsert({ user_id: created.user.id, role: newRole }, { onConflict: "user_id" });
        if (roleErr) return json({ error: `User created but role failed: ${roleErr.message}` }, 500);
      }
      return json({ ok: true, userId: created.user?.id });
    }

    if (action === "extend_trial") {
      const userId = String(body?.userId ?? "");
      const days = Math.min(90, Math.max(1, Number(body?.days ?? 7)));
      const { data: sub } = await db.from("subscriptions")
        .select("trial_ends_at").eq("user_id", userId).maybeSingle();
      const from = Math.max(Date.now(), sub?.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : 0);
      const { error } = await db.from("subscriptions").update({
        status: "trialing",
        trial_ends_at: new Date(from + days * 86400000).toISOString(),
      }).eq("user_id", userId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "set_status") {
      const userId = String(body?.userId ?? "");
      const status = String(body?.status ?? "");
      if (!["canceled", "expired", "active"].includes(status)) return json({ error: "Invalid status" }, 400);
      const patch: Record<string, unknown> = { status };
      if (status === "active") {
        const now = new Date();
        patch.current_period_start = now.toISOString();
        patch.current_period_end = new Date(now.getTime() + 30 * 86400000).toISOString();
      }
      const { error } = await db.from("subscriptions").update(patch).eq("user_id", userId);
      if (error) throw error;
      return json({ ok: true });
    }

    // Manually assign a plan to a client and activate it until a chosen end date.
    if (action === "set_plan") {
      const userId = String(body?.userId ?? "");
      const planId = String(body?.planId ?? "");
      const billingCycle = ["monthly", "annual"].includes(String(body?.billingCycle)) ? String(body?.billingCycle) : "monthly";
      const end = body?.endDate ? new Date(String(body?.endDate)) : null;
      if (!userId || !planId) return json({ error: "userId and planId are required" }, 400);
      if (!end || isNaN(end.getTime())) return json({ error: "A valid endDate is required" }, 400);
      // Guard: the plan must exist.
      const { data: plan } = await db.from("plans").select("id").eq("id", planId).maybeSingle();
      if (!plan) return json({ error: "Unknown plan" }, 400);
      const now = new Date();
      const { error } = await db.from("subscriptions").upsert({
        user_id: userId,
        plan_id: planId,
        status: "active",
        billing_cycle: billingCycle,
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        trial_ends_at: null,
        cancel_at_period_end: false,
        updated_at: now.toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-api:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
