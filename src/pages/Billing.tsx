/**
 * Billing — plan selection, subscription status, payment history.
 * Payments run through RaiAccept (hosted payment page): the
 * create-subscription-payment edge function returns a redirect URL.
 */
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, CreditCard, Gift, AlertTriangle, Receipt } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge, EmptyState } from "@/components/ui-app";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, Plan } from "@/contexts/SubscriptionContext";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { showError, showSuccess } from "@/utils/toast";
import { paymentStatusTone, type StatusTone } from "@/lib/status";
import { useReveal, useCountUp } from "@/lib/anim";
import { cn } from "@/lib/utils";

const BRAND = "brand-gradient";
/** Single definition of the signature brand-gradient CTA styling (used by 4 CTAs). */
const BRAND_CTA = cn("text-white hover:opacity-90", BRAND);
const fmt = (n: number) => n.toLocaleString("en-US");

/** Soft status wash for the hero card, derived from a semantic tone (dark-safe). */
const TONE_WASH: Record<StatusTone, string> = {
  success: "border-success/30 bg-success/5",
  warning: "border-warning/30 bg-warning/5",
  info: "border-info/30 bg-info/5",
  danger: "border-destructive/30 bg-destructive/5",
  neutral: "border-border bg-muted/30",
};

interface PaymentRow {
  id: string; amount_all: number; status: string; type: string; created_at: string;
}

/** Count-up number that re-tweens on value change (annual/monthly toggle, mount). */
function AnimatedNumber({
  value, format, className,
}: { value: number; format: (n: number) => string; className?: string }) {
  const ref = useCountUp<HTMLSpanElement>(value, { format });
  return <span ref={ref} className={className}>{format(value)}</span>;
}

export default function Billing() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("sq") ? "sq" : "en";
  const { setTitle } = usePageTitle();
  const { loading, subscription, plan: currentPlan, plans, isActive, trialDaysLeft, refresh } = useSubscription();
  const [annual, setAnnual] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [history, setHistory] = useState<PaymentRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<Plan | null>(null);
  const [params, setParams] = useSearchParams();
  const gridRef = useReveal<HTMLDivElement>({}, [plans.length]);

  useEffect(() => { setTitle(t("nav.billing", "Billing")); }, [setTitle, t]);

  // Landing back from the RaiAccept hosted page.
  useEffect(() => {
    const result = params.get("result");
    if (!result) return;
    if (result === "success") { showSuccess(t("billing.payment_success", "Payment successful!")); refresh(); }
    else if (result === "cancel") showError(t("billing.payment_canceled", "Payment canceled."));
    else showError(t("billing.payment_failed", "Payment failed. Please try again."));
    params.delete("result");
    setParams(params, { replace: true });
  }, [params, setParams, refresh, t]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(false);
    const { data, error } = await supabase
      .from("payments")
      .select("id, amount_all, status, type, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) { setHistoryError(true); setHistoryLoading(false); return; }
    setHistory((data as PaymentRow[]) ?? []);
    setHistoryLoading(false);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory, subscription?.status]);

  const priceFor = (p: Plan) =>
    annual ? Math.round((p.price_all * (12 - p.annual_free_months)) / 12) : p.price_all;
  const yearlyTotal = (p: Plan) => p.price_all * (12 - p.annual_free_months);
  const maxFreeMonths = plans.reduce((m, p) => Math.max(m, p.annual_free_months || 0), 0);

  const subscribe = async (planId: string, trialSetup = false) => {
    setBusy(trialSetup ? "trial" : planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-subscription-payment", {
        body: { planId, cycle: annual ? "annual" : "monthly", trialSetup, returnUrl: `${window.location.origin}/billing` },
      });
      if (error || !data?.url) throw new Error(error?.message || data?.error || "No payment URL");
      window.location.href = data.url;
    } catch (e: any) {
      showError(t("billing.start_payment_error", { defaultValue: "Couldn't start payment: {{error}}", error: e.message }));
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

    // Derive a single semantic tone + label; badge + wash both flow from it.
    let tone: StatusTone;
    let label: string;
    if (s === "active") { tone = "success"; label = t("billing.status_active", "Active"); }
    else if (trialValid) { tone = "info"; label = t("billing.status_trial", "Trial"); }
    else if (s === "incomplete") { tone = "warning"; label = t("billing.status_incomplete", "Not started"); }
    else if (s === "canceled") { tone = "neutral"; label = t("billing.status_cancelled", "Cancelled"); }
    else if (s === "past_due") { tone = "warning"; label = t("billing.status_past_due", "Past due"); }
    else { tone = "danger"; label = t("billing.status_expired", "Expired"); }

    // Price + cycle of the subscribed plan (annual shows the effective yearly total).
    const isAnnualSub = subscription.billing_cycle === "annual";
    const heroPriceValue = heroPlan ? (isAnnualSub ? yearlyTotal(heroPlan) : heroPlan.price_all) : null;
    const heroPriceUnit = isAnnualSub ? t("billing.per_year", "ALL / year") : t("billing.per_month", "ALL / month");

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
      <Card className={cn("overflow-hidden", TONE_WASH[tone])} data-tour="billing-plan">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("billing.current_plan", "Current plan")}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2.5">
                <h2 className="text-3xl font-bold leading-tight">{heroPlan?.name ?? t("billing.your_plan", "Your plan")}</h2>
                <StatusBadge tone={tone} dot>{label}</StatusBadge>
              </div>
              {heroPriceValue != null && (
                <p className="mt-1 text-sm text-muted-foreground">
                  <AnimatedNumber value={heroPriceValue} format={fmt} className="tabular-nums" /> {heroPriceUnit} · {isAnnualSub ? t("billing.cycle_annual", "Billed annually") : t("billing.cycle_monthly", "Billed monthly")}
                </p>
              )}
            </div>
            {trialValid && trialDaysLeft != null && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                <Gift className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-semibold text-primary">
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
              <Button size="sm" disabled={busy != null} onClick={() => subscribe("pro", true)} className={BRAND_CTA}>
                {busy === "trial" ? <Spinner className="h-4 w-4" /> : t("billing.start_trial", "Start free trial")}
              </Button>
            </div>
          )}

          {!isActive && s !== "incomplete" && (
            <p className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
              {t("billing.locked_hint", "Your account is limited — choose a plan below to reactivate your shop.")}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  const statusLabel = (s: string) => t(`billing.payment_status.${s}`, s);
  const typeLabel = (ty: string) => t(`billing.payment_types.${ty}`, ty);

  const historyCard = () => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          {t("billing.payment_history", "Payment history")}
        </CardTitle>
        <CardDescription>
          {t("billing.payment_history_desc", "All charges on your subscription.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {historyLoading ? (
          <div className="divide-y divide-border rounded-lg border border-border">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4 px-3.5 py-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="hidden h-4 w-24 sm:block" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : historyError ? (
          <EmptyState
            compact
            icon={AlertTriangle}
            title={t("billing.history_error", "Couldn't load payment history.")}
            action={
              <Button size="sm" variant="outline" onClick={loadHistory}>
                {t("common.retry", "Try again")}
              </Button>
            }
          />
        ) : history.length === 0 ? (
          <EmptyState compact icon={Receipt} title={t("billing.no_payments", "No payments yet.")} />
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
                <StatusBadge tone={paymentStatusTone(h.status)} size="sm" className="justify-self-end capitalize">
                  {statusLabel(h.status)}
                </StatusBadge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-48 w-full" />
      <div className="flex justify-center"><Skeleton className="h-9 w-56" /></div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-96" /><Skeleton className="h-96" /><Skeleton className="h-96" />
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {heroCard()}

      {historyCard()}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <ToggleGroup
          type="single"
          value={annual ? "annual" : "monthly"}
          onValueChange={(v) => { if (v) setAnnual(v === "annual"); }}
          variant="outline"
          size="sm"
          aria-label={t("billing.billing_cycle", "Billing cycle")}
        >
          <ToggleGroupItem value="monthly" className="px-4">{t("billing.monthly", "Monthly")}</ToggleGroupItem>
          <ToggleGroupItem value="annual" className="px-4">{t("billing.annual", "Annual")}</ToggleGroupItem>
        </ToggleGroup>
        {annual && maxFreeMonths > 0 && (
          <Badge variant="outline" className="gap-1 border-primary/25 bg-primary/10 text-primary">
            <Gift className="h-3 w-3" /> {t("billing.save_up_to", { defaultValue: "Save up to {{months}} months", months: maxFreeMonths })}
          </Badge>
        )}
      </div>

      <div ref={gridRef} className="grid items-start gap-4 pt-3 lg:grid-cols-3">
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
            <Card key={p.id} data-reveal className={cn("relative", featured && "border-primary/40 shadow-lg")}>
              {featured && (
                <span className={cn("absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-medium text-white", BRAND)}>
                  {t("billing.most_popular", "Most popular")}
                </span>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{p.name}</CardTitle>
                {annual && p.annual_free_months > 0 && (
                  <Badge variant="secondary" className="w-fit gap-1 text-primary">
                    <Gift className="h-3 w-3" /> {t("billing.months_free", { defaultValue: "{{months}} months free", months: p.annual_free_months })}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1">
                  <AnimatedNumber value={priceFor(p)} format={fmt} className="text-3xl font-bold" />
                  <span className="mb-1 text-sm text-muted-foreground">{t("billing.per_month_short", "ALL / mo")}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {annual
                    ? t("billing.billed_yearly", { defaultValue: "Billed {{amount}} ALL yearly", amount: fmt(yearlyTotal(p)) })
                    : t("billing.cycle_monthly", "Billed monthly")}
                </p>
                <Button
                  disabled={busy != null || current}
                  onClick={() => (isSwitch ? setSwitchTarget(p) : subscribe(p.id))}
                  className={cn("mt-4 w-full", featured && BRAND_CTA)}
                  variant={featured ? "default" : "outline"}
                >
                  {busy === p.id ? <Spinner className="h-4 w-4" />
                    : current ? t("billing.current_plan", "Current plan")
                    : isSwitch ? switchLabel
                    : t("billing.choose_plan", "Choose plan")}
                </Button>
                <ul className="mt-4 space-y-2">
                  {(p.features as string[]).map((f) => (
                    <li key={f} className="flex gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {t(`billing.features.${f}`, f)}
                    </li>
                  ))}
                  {p.product_limit && (
                    <li className="flex gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {t("billing.up_to_products", { defaultValue: "Up to {{limit}} products", limit: p.product_limit })}
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <CreditCard className="h-3.5 w-3.5" /> {t("billing.secure_payments", "Secure payments via Raiffeisen (RaiAccept)")}
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
              className={BRAND_CTA}
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
