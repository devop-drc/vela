/** Demo Billing — trial hero card, billing-cycle toggle, plan cards, history. */
import { useState } from "react";
import { Gift, Check, Receipt, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { demoPlans, demoPayments, fmtALL } from "./data";
import { showSuccess } from "@/utils/toast";

const DemoBilling = () => {
  const [annual, setAnnual] = useState(true);
  const [current, setCurrent] = useState("pro"); // active plan id
  const trialDaysLeft = 5;

  const priceFor = (p: (typeof demoPlans)[number]) =>
    annual ? Math.round((p.priceAll * (12 - p.annualFreeMonths)) / 12) : p.priceAll;
  const yearlyTotal = (p: (typeof demoPlans)[number]) => p.priceAll * (12 - p.annualFreeMonths);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* hero — trialing */}
      <Card className="overflow-hidden border-red-500/30 bg-red-500/5">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current plan</p>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="text-3xl font-bold">Pro</h2>
                <Badge variant="outline" className="border-red-500/40 bg-red-500/15 text-red-600">Free trial</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">3,900 ALL / mo · billed annually after trial</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <Gift className="h-4 w-4 text-red-600" />
              <span className="font-semibold text-red-600">{trialDaysLeft} days left</span>
            </div>
          </div>
          <div>
            <p className="mb-1 text-sm text-muted-foreground">Trial ends in {trialDaysLeft} days</p>
            <Progress value={(7 - trialDaysLeft) / 7 * 100} className="h-1.5" />
          </div>
          <p className="text-sm text-muted-foreground">
            No card required during your trial — connect Instagram and start selling. Add a payment method any time before it ends to keep your storefront online.
          </p>
        </CardContent>
      </Card>

      {/* billing cycle toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={cn("text-sm", !annual && "font-bold")}>Monthly</span>
        <Switch checked={annual} onCheckedChange={setAnnual} />
        <span className={cn("text-sm", annual && "font-bold")}>Annual</span>
        <Badge variant="secondary" className="text-red-600">2 months free</Badge>
      </div>

      {/* plan cards */}
      <div className="grid items-start gap-4 lg:grid-cols-4">
        {demoPlans.map((p) => {
          const isCurrent = p.id === current;
          return (
            <Card key={p.id} className={cn("relative", p.featured && "border-red-500/40 shadow-lg")}>
              {p.featured && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full brand-gradient px-3 py-0.5 text-xs font-medium text-white">Most popular</span>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {p.name}
                  {annual && p.annualFreeMonths > 0 && <Badge variant="secondary" className="gap-1 text-red-600"><Gift className="h-3 w-3" /> {p.annualFreeMonths}mo free</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold">{priceFor(p).toLocaleString()}</span>
                  <span className="mb-1 text-xs text-muted-foreground">ALL / mo</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {p.priceAll === 0 ? "Free forever" : annual ? `Billed ${yearlyTotal(p).toLocaleString()} ALL yearly` : "Billed monthly"}
                </p>
                <Button
                  className={cn("mt-4 w-full", p.featured && "brand-gradient text-white hover:opacity-90")}
                  variant={p.featured ? "default" : "outline"}
                  disabled={isCurrent}
                  onClick={() => { setCurrent(p.id); showSuccess(`Switched to ${p.name} (demo)`); }}
                >
                  {isCurrent ? "Current plan" : p.priceAll === 0 ? "Downgrade" : "Choose plan"}
                </Button>
                <ul className="mt-4 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-emerald-500" /> {f}</li>
                  ))}
                  {p.productLimit && <li className="flex gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-emerald-500" /> Up to {p.productLimit} products</li>}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* payment history */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Receipt className="h-4 w-4" /> Payment history</CardTitle><CardDescription>Your invoices and charges.</CardDescription></CardHeader>
        <CardContent>
          <div className="divide-y rounded-lg border">
            {demoPayments.map((pay) => (
              <div key={pay.id} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-3 px-3.5 py-3">
                <span className="font-medium tabular-nums">{new Date(pay.date).toLocaleDateString()}</span>
                <span className="text-muted-foreground">{pay.type}</span>
                <span className="text-right font-semibold tabular-nums">{fmtALL(pay.amount)}</span>
                <Badge variant={pay.status === "paid" ? "default" : "secondary"} className="text-[10px] capitalize">{pay.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <CreditCard className="h-3.5 w-3.5" /> Secure payments via Raiffeisen (RaiAccept)
      </p>
    </div>
  );
};

export default DemoBilling;
