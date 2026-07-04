/**
 * Billing — plan selection, subscription status, payment history.
 * Payments run through RaiAccept (hosted payment page): the
 * create-subscription-payment edge function returns a redirect URL.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, CreditCard, Gift, Loader2, AlertTriangle, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, Plan } from "@/contexts/SubscriptionContext";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

const BRAND = "brand-gradient";
const fmt = (n: number) => n.toLocaleString("en-US");

const FEATURE_LABELS: Record<string, { sq: string; en: string }> = {
  instagram_storefront: { sq: "Vitrinë Instagram", en: "Instagram storefront" },
  cod_orders: { sq: "Porosi me para në dorë", en: "Cash-on-delivery orders" },
  basic_analytics: { sq: "Analitikë bazë", en: "Basic analytics" },
  unlimited_products: { sq: "Produkte pa limit", en: "Unlimited products" },
  storefront_studio: { sq: "Storefront Studio", en: "Storefront Studio" },
  card_payments: { sq: "Pagesa online me kartë", en: "Online card payments" },
  promotions: { sq: "Promocione & oferta", en: "Promotions & sales" },
  reviews: { sq: "Vlerësime produktesh", en: "Product reviews" },
  full_analytics: { sq: "Analitikë e plotë", en: "Full analytics" },
  everything_pro: { sq: "Gjithçka e Pro-s", en: "Everything in Pro" },
  priority_support: { sq: "Suport me përparësi", en: "Priority support" },
  advanced_analytics: { sq: "Analitikë e avancuar", en: "Advanced analytics" },
  higher_ai_limits: { sq: "Limite më të larta AI", en: "Higher AI limits" },
};

interface PaymentRow {
  id: string; amount_all: number; status: string; type: string; created_at: string;
}

export default function Billing() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("sq") ? "sq" : "en";
  const { setTitle } = usePageTitle();
  const { loading, subscription, plan: currentPlan, plans, isActive, trialDaysLeft, refresh } = useSubscription();
  const [annual, setAnnual] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [history, setHistory] = useState<PaymentRow[]>([]);
  const [switchTarget, setSwitchTarget] = useState<Plan | null>(null);
  const [params, setParams] = useSearchParams();

  useEffect(() => { setTitle(t("nav.billing", "Billing")); }, [setTitle, t]);

  // Landing back from the RaiAccept hosted page.
  useEffect(() => {
    const result = params.get("result");
    if (!result) return;
    if (result === "success") { showSuccess(lang === "sq" ? "Pagesa u krye me sukses!" : "Payment successful!"); refresh(); }
    else if (result === "cancel") showError(lang === "sq" ? "Pagesa u anulua." : "Payment canceled.");
    else showError(lang === "sq" ? "Pagesa dështoi. Provo përsëri." : "Payment failed. Please try again.");
    params.delete("result");
    setParams(params, { replace: true });
  }, [params, setParams, refresh, lang]);

  useEffect(() => {
    supabase.from("payments").select("id, amount_all, status, type, created_at")
      .order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => setHistory((data as PaymentRow[]) ?? []));
  }, [subscription?.status]);

  const priceFor = (p: Plan) =>
    annual ? Math.round((p.price_all * (12 - p.annual_free_months)) / 12) : p.price_all;
  const yearlyTotal = (p: Plan) => p.price_all * (12 - p.annual_free_months);

  const subscribe = async (planId: string, trialSetup = false) => {
    setBusy(trialSetup ? "trial" : planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-subscription-payment", {
        body: { planId, cycle: annual ? "annual" : "monthly", trialSetup, returnUrl: `${window.location.origin}/billing` },
      });
      if (error || !data?.url) throw new Error(error?.message || data?.error || "No payment URL");
      window.location.href = data.url;
    } catch (e: any) {
      showError((lang === "sq" ? "S'u nis dot pagesa: " : "Couldn't start payment: ") + e.message);
      setBusy(null);
    }
  };

  const dateWords = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "sq" ? "sq-AL" : "en-US", { day: "numeric", month: "long", year: "numeric" });

  const heroCard = () => {
    if (!subscription) return null;
    const s = subscription.status;
    const trialValid = s === "trialing" && trialDaysLeft != null;
    const heroPlan = currentPlan ?? plans.find((p) => p.id === subscription.plan_id) ?? null;

    const meta =
      s === "active"
        ? { label: t("billing.status_active", "Active"), badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", wash: "border-emerald-500/30 bg-emerald-500/5" }
        : trialValid
        ? { label: t("billing.status_trial", "Trial"), badge: "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400", wash: "border-fuchsia-500/30 bg-fuchsia-500/5" }
        : s === "incomplete"
        ? { label: t("billing.status_incomplete", "Not started"), badge: "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400", wash: "border-fuchsia-500/40 bg-fuchsia-500/5" }
        : s === "canceled"
        ? { label: t("billing.status_cancelled", "Cancelled"), badge: "border-border bg-muted text-muted-foreground", wash: "border-amber-500/40 bg-amber-500/5" }
        : s === "past_due"
        ? { label: t("billing.status_past_due", "Past due"), badge: "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400", wash: "border-amber-500/40 bg-amber-500/5" }
        : { label: t("billing.status_expired", "Expired"), badge: "border-red-500/40 bg-red-500/15 text-red-600 dark:text-red-400", wash: "border-amber-500/40 bg-amber-500/5" };

    // Price + cycle of the subscribed plan (annual shows the effective yearly total).
    const isAnnualSub = subscription.billing_cycle === "annual";
    const priceLine = heroPlan
      ? `${fmt(isAnnualSub ? yearlyTotal(heroPlan) : heroPlan.price_all)} ${isAnnualSub ? t("billing.per_year", "ALL / year") : t("billing.per_month", "ALL / month")}`
      : null;

    // Current-period progress: paid period for active subs, the 7-day window for trials.
    let periodStart: number | null = null;
    let periodEnd: number | null = null;
    if (s === "active" && subscription.current_period_start && subscription.current_period_end) {
      periodStart = new Date(subscription.current_period_start).getTime();
      periodEnd = new Date(subscription.current_period_end).getTime();
    } else if (trialValid && subscription.trial_ends_at) {
      periodEnd = new Date(subscription.trial_ends_at).getTime();
      periodStart = periodEnd - 7 * 86400000; // trials are always 7 days
    }
    const periodPct =
      periodStart != null && periodEnd != null && periodEnd > periodStart
        ? Math.min(100, Math.max(0, ((Date.now() - periodStart) / (periodEnd - periodStart)) * 100))
        : null;

    const dateLine =
      s === "active" && subscription.current_period_end
        ? subscription.cancel_at_period_end
          ? t("billing.expires_on", { defaultValue: "Expires on {{date}}", date: dateWords(subscription.current_period_end) })
          : t("billing.renews_on", { defaultValue: "Renews on {{date}}", date: dateWords(subscription.current_period_end) })
        : trialValid && subscription.trial_ends_at
        ? t("billing.trial_ends_on", { defaultValue: "Trial ends on {{date}}", date: dateWords(subscription.trial_ends_at) })
        : s !== "incomplete" && subscription.current_period_end
        ? t("billing.ended_on", { defaultValue: "Ended on {{date}}", date: dateWords(subscription.current_period_end) })
        : null;

    return (
      <Card className={cn("overflow-hidden", meta.wash)} data-tour="billing-plan">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("billing.current_plan", "Current plan")}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2.5">
                <h2 className="text-3xl font-bold leading-tight">{heroPlan?.name ?? subscription.plan_id}</h2>
                <Badge variant="outline" className={cn("text-xs", meta.badge)}>{meta.label}</Badge>
              </div>
              {priceLine && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {priceLine} · {isAnnualSub ? t("billing.cycle_annual", "Billed annually") : t("billing.cycle_monthly", "Billed monthly")}
                </p>
              )}
            </div>
            {trialValid && trialDaysLeft != null && (
              <div className="flex items-center gap-2 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2">
                <Gift className="h-4 w-4 shrink-0 text-fuchsia-500" />
                <span className="text-sm font-semibold text-fuchsia-600 dark:text-fuchsia-400">
                  {t("billing.days_left", { defaultValue: "{{days}} days left", days: trialDaysLeft })}
                </span>
              </div>
            )}
          </div>

          {dateLine && (
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">{dateLine}</p>
              {periodPct != null && <Progress value={periodPct} className="h-1.5" />}
            </div>
          )}

          {trialValid && (
            <p className="text-sm text-muted-foreground">{t("billing.trial_hint", "Pick a plan below so your shop never stops.")}</p>
          )}

          {s === "incomplete" && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="min-w-0 flex-1 text-sm">
                {t("billing.trial_setup_hint", "Start your 7-day free trial — add your card (0 ALL verification, nothing charged today).")}
              </p>
              <Button size="sm" disabled={busy != null} onClick={() => subscribe("pro", true)}
                className={cn("text-white hover:opacity-90", BRAND)}>
                {busy === "trial" ? <Loader2 className="h-4 w-4 animate-spin" /> : t("billing.start_trial", "Start free trial")}
              </Button>
            </div>
          )}

          {!isActive && s !== "incomplete" && (
            <p className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              {t("billing.locked_hint", "Your account is limited — choose a plan below to reactivate your shop.")}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  const statusBadgeVariant = (s: string) => s === "paid" ? "default" : s === "pending" ? "secondary" : "destructive";
  const statusLabel = (s: string) => {
    if (lang !== "sq") return s;
    return s === "paid" ? "paguar" : s === "pending" ? "në pritje" : s === "failed" ? "dështoi" : s;
  };
  const typeLabel = (ty: string) => {
    const map: Record<string, { sq: string; en: string }> = {
      initial: { sq: "Abonim i ri", en: "New subscription" },
      renewal: { sq: "Rinovim", en: "Renewal" },
      switch: { sq: "Ndryshim plani", en: "Plan change" },
      trial: { sq: "Provë falas", en: "Free trial" },
    };
    return map[ty]?.[lang] ?? ty;
  };

  const historyCard = () => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          {lang === "sq" ? "Historiku i pagesave" : "Payment history"}
        </CardTitle>
        <CardDescription>
          {lang === "sq" ? "Të gjitha pagesat e abonimit tënd." : "All charges on your subscription."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Receipt className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {lang === "sq" ? "Ende s'ke asnjë pagesë." : "No payments yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {history.map((h) => (
              <div key={h.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-3.5 py-3 sm:grid-cols-[1fr_1.2fr_auto_auto]">
                <span className="text-sm font-medium tabular-nums">
                  {new Date(h.created_at).toLocaleDateString(lang === "sq" ? "sq-AL" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span className="order-3 col-span-2 text-xs text-muted-foreground sm:order-none sm:col-span-1 sm:text-sm">
                  {typeLabel(h.type)}
                </span>
                <span className="text-right text-sm font-semibold tabular-nums">{fmt(h.amount_all)} ALL</span>
                <Badge variant={statusBadgeVariant(h.status)} className="justify-self-end text-[10px] capitalize">
                  {statusLabel(h.status)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) return <div className="space-y-4"><Skeleton className="h-16" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-96" /><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {heroCard()}

      {historyCard()}

      <div className="flex items-center justify-center gap-3">
        <span className={cn("text-sm", !annual && "font-semibold")}>{lang === "sq" ? "Mujore" : "Monthly"}</span>
        <Switch checked={annual} onCheckedChange={setAnnual} />
        <span className={cn("text-sm", annual && "font-semibold")}>{lang === "sq" ? "Vjetore" : "Annual"}</span>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {plans.map((p) => {
          const featured = p.id === "pro";
          const current = isActive && subscription?.plan_id === p.id && subscription.status === "active";
          // Paid subscribers switch plans through a confirmation dialog (no refund
          // of the running period — the new plan supersedes it immediately).
          const isSwitch = subscription?.status === "active" && !current;
          const switchLabel = !isSwitch ? null
            : currentPlan == null ? t("billing.switch_plan", "Switch to this plan")
            : p.price_all > currentPlan.price_all ? t("billing.upgrade", "Upgrade")
            : p.price_all < currentPlan.price_all ? t("billing.downgrade", "Downgrade")
            : t("billing.switch_plan", "Switch to this plan");
          return (
            <Card key={p.id} className={cn("relative", featured && "border-fuchsia-500/40 shadow-lg")}>
              {featured && (
                <span className={cn("absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-medium text-white", BRAND)}>
                  {lang === "sq" ? "Më i zgjedhuri" : "Most popular"}
                </span>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{p.name}</CardTitle>
                {annual && p.annual_free_months > 0 && (
                  <Badge variant="secondary" className="w-fit gap-1 text-fuchsia-600">
                    <Gift className="h-3 w-3" /> {p.annual_free_months} {lang === "sq" ? "muaj falas" : "months free"}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold">{fmt(priceFor(p))}</span>
                  <span className="mb-1 text-sm text-muted-foreground">ALL / {lang === "sq" ? "muaj" : "mo"}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {annual
                    ? (lang === "sq" ? `Faturohet ${fmt(yearlyTotal(p))} ALL në vit` : `Billed ${fmt(yearlyTotal(p))} ALL yearly`)
                    : (lang === "sq" ? "Faturim mujor" : "Billed monthly")}
                </p>
                <Button
                  disabled={busy != null || current}
                  onClick={() => (isSwitch ? setSwitchTarget(p) : subscribe(p.id))}
                  className={cn("mt-4 w-full", featured && cn("text-white hover:opacity-90", BRAND))}
                  variant={featured ? "default" : "outline"}
                >
                  {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" />
                    : current ? t("billing.current_plan", "Current plan")
                    : isSwitch ? switchLabel
                    : (lang === "sq" ? "Zgjidh planin" : "Choose plan")}
                </Button>
                <ul className="mt-4 space-y-2">
                  {(p.features as string[]).map((f) => (
                    <li key={f} className="flex gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {FEATURE_LABELS[f]?.[lang] ?? f}
                    </li>
                  ))}
                  {p.product_limit && (
                    <li className="flex gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {lang === "sq" ? `Deri në ${p.product_limit} produkte` : `Up to ${p.product_limit} products`}
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <CreditCard className="h-3.5 w-3.5" /> {lang === "sq" ? "Pagesa të sigurta përmes Raiffeisen (RaiAccept)" : "Secure payments via Raiffeisen (RaiAccept)"}
      </p>

      <AlertDialog open={switchTarget != null} onOpenChange={(open) => { if (!open) setSwitchTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("billing.switch_title", { defaultValue: "Switch to {{plan}}?", plan: switchTarget?.name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {t("billing.switch_effect", "The new plan takes effect immediately and is paid now via secure checkout.")}
              </span>
              <span className="block font-medium text-foreground">
                {t("billing.switch_no_refund", "The remaining time on your current paid period is not refunded — the new plan replaces it.")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={cn("text-white hover:opacity-90", BRAND)}
              onClick={() => {
                if (!switchTarget) return;
                const id = switchTarget.id;
                setSwitchTarget(null);
                subscribe(id);
              }}
            >
              {t("billing.switch_confirm", "Continue to payment")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
