/**
 * /admin — owner-only panel: user list with subscription state, detail
 * dialog with payments + actions (extend trial, cancel/activate), and
 * business overview (users, trials, MRR). All data via the service-role
 * admin-api edge function (RLS blocks cross-user reads client-side).
 */
import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users, Gift, ShieldCheck, TrendingUp, Search, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("en-US");
const dt = (s?: string | null) => (s ? new Date(s).toLocaleDateString() : "—");

const STATUS_TONE: Record<string, string> = {
  trialing: "bg-red-500/15 text-red-600 hover:bg-red-500/15",
  active: "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15",
  past_due: "bg-amber-500/15 text-amber-600 hover:bg-amber-500/15",
  incomplete: "bg-muted text-muted-foreground",
  canceled: "bg-muted text-muted-foreground",
  expired: "bg-destructive/10 text-destructive hover:bg-destructive/10",
};

const call = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("admin-api", { body });
  if (error) {
    // invoke() reports a generic "non-2xx" message; dig out the real server
    // error from the response body so the admin sees the actual cause
    // (e.g. "Unknown action" → the function needs a redeploy).
    let msg = error.message;
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        const b = await ctx.json();
        if (b?.error) msg = b.error;
      }
    } catch { /* body already consumed / not json */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
};

interface Row {
  id: string; email: string; created_at: string; last_sign_in_at: string | null;
  name: string | null; phone: string | null; shop_name: string | null; slug: string | null;
  storefront_type: string | null;
  subscription: { plan_id: string; status: string; billing_cycle: string; trial_ends_at: string | null; current_period_end: string | null } | null;
}

export default function Admin() {
  const { t } = useTranslation();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const { setTitle } = usePageTitle();
  const [overview, setOverview] = useState<any>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [nu, setNu] = useState({ email: "", password: "", firstName: "", lastName: "", admin: false });
  const [plans, setPlans] = useState<{ id: string; name: string }[]>([]);
  const [planForm, setPlanForm] = useState({ planId: "", endDate: "", billingCycle: "monthly" });

  useEffect(() => { setTitle(t('nav.admin')); }, [setTitle, t]);

  // Available plans (public-read) for the manual plan-assignment control.
  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("plans").select("id, name").eq("is_active", true).order("display_order")
      .then(({ data }) => setPlans(data ?? []));
  }, [isAdmin]);

  // Prefill the plan form from the opened client's current subscription.
  useEffect(() => {
    if (!detail?.id) return;
    const sub = detail.subscription;
    setPlanForm({
      planId: sub?.plan_id ?? "",
      billingCycle: sub?.billing_cycle ?? "monthly",
      endDate: sub?.current_period_end ? new Date(sub.current_period_end).toISOString().slice(0, 10) : "",
    });
  }, [detail?.id, detail?.subscription]);

  const load = useCallback(async (p = 1, q = "") => {
    setLoading(true);
    try {
      const [ov, us] = await Promise.all([
        overview ? Promise.resolve(overview) : call({ action: "overview" }),
        call({ action: "users", page: p, search: q }),
      ]);
      setOverview(ov);
      setRows(us.users ?? []);
      setPage(p);
    } catch (e: any) { showError(e.message); }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview]);

  useEffect(() => { if (isAdmin) load(1, ""); }, [isAdmin, load]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail({ id });
    try { setDetail(await call({ action: "user", userId: id })); }
    catch (e: any) { showError(e.message); setDetail(null); }
    setDetailLoading(false);
  };

  const act = async (body: Record<string, unknown>, done: string) => {
    setActing(true);
    try {
      await call(body);
      showSuccess(done);
      if (detail?.id) await openDetail(detail.id);
      setOverview(null); // refresh stats next load
      await load(page, search);
    } catch (e: any) { showError(e.message); }
    setActing(false);
  };

  if (roleLoading) return <Skeleton className="h-64" />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const stats = [
    { icon: Users, label: t('admin_page.stat_users'), value: overview ? fmt(overview.userCount) : "…" },
    { icon: Gift, label: t('admin_page.stat_trialing'), value: overview ? fmt(overview.byStatus?.trialing ?? 0) : "…" },
    { icon: ShieldCheck, label: t('admin_page.stat_active'), value: overview ? fmt(overview.byStatus?.active ?? 0) : "…" },
    { icon: TrendingUp, label: t('admin_page.stat_mrr'), value: overview ? fmt(overview.mrrAll) : "…" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted"><s.icon className="h-5 w-5" /></span>
              <div>
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(1, search)}
            placeholder={t('admin_page.search_placeholder')}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => load(1, search)}>{t('common.search')}</Button>
        {search && <Button variant="ghost" onClick={() => { setSearch(""); load(1, ""); }}>{t('common.clear')}</Button>}
        <Button className="ml-auto gap-1.5" onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4" /> {t('admin_page.create_account')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-b border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground sm:grid-cols-[1.4fr_1fr_auto_auto_auto]">
            <span>{t('admin_page.col_user')}</span><span className="hidden sm:block">{t('admin_page.col_shop')}</span><span>{t('admin_page.col_plan')}</span><span>{t('admin_page.col_status')}</span><span>{t('admin_page.col_registered')}</span>
          </div>
          {loading ? (
            <div className="space-y-2 p-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t('admin_page.no_users')}</p>
          ) : rows.map((r) => (
            <button key={r.id} onClick={() => openDetail(r.id)}
              className="grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-b border-border px-4 py-3 text-left text-sm transition-colors last:border-0 hover:bg-accent/50 sm:grid-cols-[1.4fr_1fr_auto_auto_auto]">
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.email}</span>
                <span className="block truncate text-xs text-muted-foreground">{r.name ?? "—"}</span>
              </span>
              <span className="hidden min-w-0 truncate text-muted-foreground sm:block">{r.shop_name ?? "—"}</span>
              <span className="text-xs font-medium uppercase">{r.subscription?.plan_id ?? "—"}</span>
              <Badge className={cn("text-[10px]", STATUS_TONE[r.subscription?.status ?? "incomplete"])}>
                {r.subscription?.status ? t('status_labels.' + r.subscription.status.toLowerCase().replace(/\s+/g, '_'), { defaultValue: r.subscription.status }) : "—"}
              </Badge>
              <span className="text-xs text-muted-foreground">{dt(r.created_at)}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {!search && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => load(page - 1, "")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{t('admin_page.page_n', { page })}</span>
          <Button variant="outline" size="sm" disabled={rows.length < 20 || loading} onClick={() => load(page + 1, "")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Create-account dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('admin_page.create_account_title')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('admin_page.first_name')}</Label>
                <Input value={nu.firstName} onChange={(e) => setNu({ ...nu, firstName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('admin_page.last_name')}</Label>
                <Input value={nu.lastName} onChange={(e) => setNu({ ...nu, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('admin_page.email')}</Label>
              <Input type="email" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('admin_page.password_min')}</Label>
              <Input type="text" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={nu.admin} onCheckedChange={(v) => setNu({ ...nu, admin: !!v })} />
              {t('admin_page.make_admin')}
            </label>
            <Button
              className="w-full"
              disabled={acting || !nu.email.includes("@") || nu.password.length < 8}
              onClick={async () => {
                setActing(true);
                try {
                  await call({
                    action: "create_user",
                    email: nu.email, password: nu.password,
                    firstName: nu.firstName, lastName: nu.lastName,
                    ...(nu.admin ? { role: "admin" } : {}),
                  });
                  showSuccess(t('admin_page.account_created', { email: nu.email }));
                  setCreateOpen(false);
                  setNu({ email: "", password: "", firstName: "", lastName: "", admin: false });
                  setOverview(null);
                  await load(1, "");
                } catch (e: any) { showError(e.message); }
                setActing(false);
              }}
            >
              {acting ? <Spinner className="h-4 w-4" /> : t('admin_page.create_account_submit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="truncate">{detail?.email ?? "…"}</DialogTitle></DialogHeader>
          {detailLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : detail?.created_at ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <span className="text-muted-foreground">{t('admin_page.first_name')}</span><span>{detail.name ?? "—"}</span>
                <span className="text-muted-foreground">{t('admin_page.col_shop')}</span>
                <span>{detail.shop_name ?? "—"}{detail.slug ? <a className="ml-1 text-red-600 hover:underline" href={`/shop/${detail.slug}`} target="_blank" rel="noreferrer">/{detail.slug}</a> : null}</span>
                <span className="text-muted-foreground">{t('admin_page.col_registered')}</span><span>{dt(detail.created_at)}</span>
                <span className="text-muted-foreground">{t('admin_page.last_sign_in')}</span><span>{dt(detail.last_sign_in_at)}</span>
                <span className="text-muted-foreground">{t('admin_page.products_orders')}</span><span>{detail.productCount} / {detail.orderCount}</span>
                <span className="text-muted-foreground">{t('admin_page.ig_posts')}</span>
                <span>
                  {detail.instagram_media_count ?? "—"}
                  {typeof detail.productsFromInstagram === "number" && (
                    <span className="text-muted-foreground"> · {t('admin_page.are_products', { count: detail.productsFromInstagram })}</span>
                  )}
                </span>
                {detail.aiUsage && (
                  <>
                    <span className="text-muted-foreground">{t('header.ai_usage')}</span>
                    <span>
                      {t('admin_page.calls_count', { count: fmt(detail.aiUsage.calls) })} · {t('admin_page.tokens_count', { count: fmt(detail.aiUsage.input_tokens + detail.aiUsage.output_tokens) })} ·{" "}
                      <b>${detail.aiUsage.cost_usd.toFixed(4)}</b>
                    </span>
                  </>
                )}
                <span className="text-muted-foreground">{t('admin_page.col_plan')}</span>
                <span className="flex items-center gap-2">
                  <b className="uppercase">{detail.subscription?.plan_id ?? "—"}</b>
                  <Badge className={cn("text-[10px]", STATUS_TONE[detail.subscription?.status ?? "incomplete"])}>
                    {detail.subscription?.status ? t('status_labels.' + detail.subscription.status.toLowerCase().replace(/\s+/g, '_'), { defaultValue: detail.subscription.status }) : "—"}
                  </Badge>
                </span>
                <span className="text-muted-foreground">{t('admin_page.trial_ends')}</span><span>{dt(detail.subscription?.trial_ends_at)}</span>
                <span className="text-muted-foreground">{t('admin_page.period_ends')}</span><span>{dt(detail.subscription?.current_period_end)}</span>
              </div>

              {detail.ordersByStatus && Object.keys(detail.ordersByStatus).length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">{t('admin_page.orders_by_status')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(detail.ordersByStatus).map(([status, count]) => (
                      <span key={status} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">
                        {t('status_labels.' + status.toLowerCase().replace(/\s+/g, '_'), { defaultValue: status })} <b>{count as number}</b>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual plan assignment: choose a plan + end date and activate. */}
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold text-muted-foreground">{t('admin_page.set_plan_manually')}</p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{t('admin_page.col_plan')}</Label>
                    <select
                      value={planForm.planId}
                      onChange={(e) => setPlanForm({ ...planForm, planId: e.target.value })}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">{t('admin_page.select_plan')}</option>
                      {plans.map((p) => <option key={p.id} value={p.id} className="capitalize">{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{t('admin_page.billing_cycle')}</Label>
                    <select
                      value={planForm.billingCycle}
                      onChange={(e) => setPlanForm({ ...planForm, billingCycle: e.target.value })}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="monthly">{t('admin_page.monthly')}</option>
                      <option value="annual">{t('admin_page.annual')}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{t('admin_page.ends_on')}</Label>
                    <Input
                      type="date"
                      value={planForm.endDate}
                      onChange={(e) => setPlanForm({ ...planForm, endDate: e.target.value })}
                      className="h-9 w-[9.5rem]"
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={acting || !planForm.planId || !planForm.endDate}
                    onClick={() => act(
                      {
                        action: "set_plan",
                        userId: detail.id,
                        planId: planForm.planId,
                        billingCycle: planForm.billingCycle,
                        endDate: new Date(`${planForm.endDate}T23:59:59`).toISOString(),
                      },
                      t('admin_page.plan_activated'),
                    )}
                  >
                    {acting ? <Spinner className="h-3.5 w-3.5" /> : t('admin_page.activate_plan')}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button size="sm" variant="outline" disabled={acting}
                  onClick={() => act({ action: "extend_trial", userId: detail.id, days: 7 }, t('admin_page.trial_extended'))}>
                  {acting ? <Spinner className="h-3.5 w-3.5" /> : t('admin_page.extend_trial')}
                </Button>
                <Button size="sm" variant="outline" className="text-destructive" disabled={acting}
                  onClick={() => act({ action: "set_status", userId: detail.id, status: "canceled" }, t('admin_page.subscription_canceled'))}>
                  {t('admin_page.cancel_subscription')}
                </Button>
              </div>

              {detail.payments?.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">{t('admin_page.payments')}</p>
                  <div className="max-h-40 space-y-1.5 overflow-y-auto">
                    {detail.payments.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 text-xs">
                        <span>{dt(p.created_at)}</span>
                        <span className="text-muted-foreground">{t('status_labels.' + String(p.type).toLowerCase().replace(/\s+/g, '_'), { defaultValue: p.type })}</span>
                        <span className="font-medium">{fmt(p.amount_all)} ALL</span>
                        <Badge variant={p.status === "paid" ? "default" : p.status === "pending" ? "secondary" : "destructive"} className="text-[9px]">{t('status_labels.' + String(p.status).toLowerCase().replace(/\s+/g, '_'), { defaultValue: p.status })}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
