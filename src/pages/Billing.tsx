/**
 * Billing — plan selection, subscription status, payment history.
 * Payments run through RaiAccept (hosted payment page): the
 * create-subscription-payment edge function returns a redirect URL.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, CreditCard, Gift, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
  const { loading, subscription, plans, isActive, trialDaysLeft, refresh } = useSubscription();
  const [annual, setAnnual] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [history, setHistory] = useState<PaymentRow[]>([]);
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

  const statusBanner = () => {
    if (!subscription) return null;
    if (subscription.status === "trialing" && trialDaysLeft != null) {
      return (
        <Card className="border-fuchsia-500/30 bg-fuchsia-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <Gift className="h-5 w-5 text-fuchsia-500" />
            <p className="text-sm">
              {lang === "sq"
                ? <>Prova falas: edhe <b>{trialDaysLeft} ditë</b>. Zgjidh një plan që dyqani të mos ndalet.</>
                : <>Free trial: <b>{trialDaysLeft} days</b> left. Pick a plan so your shop never stops.</>}
            </p>
          </CardContent>
        </Card>
      );
    }
    if (subscription.status === "active") {
      return (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <p className="text-sm">
              {lang === "sq" ? "Abonimi aktiv" : "Subscription active"} · {subscription.plan_id}
              {subscription.current_period_end && ` · ${lang === "sq" ? "rinovohet" : "renews"} ${new Date(subscription.current_period_end).toLocaleDateString()}`}
            </p>
          </CardContent>
        </Card>
      );
    }
    if (subscription.status === "incomplete") {
      return (
        <Card className="border-fuchsia-500/40 bg-fuchsia-500/5">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <Gift className="h-5 w-5 shrink-0 text-fuchsia-500" />
            <p className="min-w-0 flex-1 text-sm">
              {lang === "sq"
                ? "Fillo provën falas 7-ditore — shto kartën (nuk tarifohesh sot, verifikim 0 ALL)."
                : "Start your 7-day free trial — add your card (0 ALL verification, nothing charged today)."}
            </p>
            <Button size="sm" disabled={busy != null} onClick={() => subscribe("pro", true)}
              className={cn("text-white hover:opacity-90", BRAND)}>
              {busy === "trial" ? <Loader2 className="h-4 w-4 animate-spin" /> : (lang === "sq" ? "Fillo provën falas" : "Start free trial")}
            </Button>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="flex items-center gap-3 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <p className="text-sm">
            {lang === "sq"
              ? "Llogaria është e kufizuar — zgjidh një plan më poshtë për të vazhduar (karta jote e ruajtur shfaqet gati)."
              : "Your account is limited — choose a plan below to continue (your saved card is prefilled)."}
          </p>
        </CardContent>
      </Card>
    );
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-16" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-96" /><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {statusBanner()}

      <div className="flex items-center justify-center gap-3">
        <span className={cn("text-sm", !annual && "font-semibold")}>{lang === "sq" ? "Mujore" : "Monthly"}</span>
        <Switch checked={annual} onCheckedChange={setAnnual} />
        <span className={cn("text-sm", annual && "font-semibold")}>{lang === "sq" ? "Vjetore" : "Annual"}</span>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {plans.map((p) => {
          const featured = p.id === "pro";
          const current = isActive && subscription?.plan_id === p.id && subscription.status === "active";
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
                  onClick={() => subscribe(p.id)}
                  className={cn("mt-4 w-full", featured && cn("text-white hover:opacity-90", BRAND))}
                  variant={featured ? "default" : "outline"}
                >
                  {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" />
                    : current ? (lang === "sq" ? "Plani aktual" : "Current plan")
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

      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{lang === "sq" ? "Historiku i pagesave" : "Payment history"}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span>{new Date(h.created_at).toLocaleDateString()}</span>
                <span className="text-muted-foreground">{h.type}</span>
                <span className="font-medium">{fmt(h.amount_all)} ALL</span>
                <Badge variant={h.status === "paid" ? "default" : h.status === "pending" ? "secondary" : "destructive"} className="text-[10px]">
                  {h.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
