/** Demo Promotions — stat cards, promo cards, storefront announcements. */
import { useMemo, useState } from "react";
import {
  PlusCircle, CheckCircle2, Clock, XCircle, LayoutGrid, Percent, TrendingDown, Truck,
  Package, Calendar as CalendarIcon, Repeat2, Zap, Edit, Trash2, Tag, Megaphone, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/ui-app/StatusBadge";
import { promotionStatusTone } from "@/lib/status";
import { demoPromotions, DemoPromotion, demoAnnouncements, DemoAnnouncement } from "./data";

const statusOf = (p: DemoPromotion): "active" | "scheduled" | "expired" | "inactive" => {
  const now = Date.now();
  if (p.end && new Date(p.end).getTime() < now) return "expired";
  if (p.start && new Date(p.start).getTime() > now) return "scheduled";
  return p.active ? "active" : "inactive";
};
const statusLabel: Record<string, string> = {
  active: "Active", scheduled: "Scheduled", expired: "Expired", inactive: "Inactive",
};
const typeIcon = (p: DemoPromotion) => p.kind === "percentage" ? Percent : p.kind === "flat" ? TrendingDown : Truck;

const StatCard = ({ icon: Icon, tile, value, label }: any) => (
  <Card><CardContent className="flex items-center gap-3 p-4">
    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", tile)}><Icon className="h-5 w-5" /></span>
    <div className="min-w-0"><div className="text-2xl font-bold leading-none">{value}</div><p className="mt-1 truncate text-xs text-muted-foreground">{label}</p></div>
  </CardContent></Card>
);

const PromoCard = ({ p, onToggle }: { p: DemoPromotion; onToggle: () => void }) => {
  const s = statusOf(p);
  const Icon = typeIcon(p);
  const isOffer = p.type === "offer";
  return (
    <Card className={cn("flex flex-col transition-all duration-200 hover:shadow-md", s === "expired" && "opacity-60")}>
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", isOffer ? "bg-cyan-500/10 text-cyan-600" : "bg-violet-500/10 text-violet-600")}><Icon className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{p.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{isOffer ? "Offer" : "Discount"}</p>
            </div>
          </div>
          <StatusBadge tone={promotionStatusTone(s)} size="sm" className="shrink-0">{statusLabel[s]}</StatusBadge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold", isOffer ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400" : "bg-violet-500/10 text-violet-700 dark:text-violet-400")}>{p.detail}</span>
          {p.products && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Package className="h-3 w-3" /> {p.products} products</span>}
        </div>

        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {p.start || p.end ? <><CalendarIcon className="h-3.5 w-3.5" /> {p.start ? new Date(p.start).toLocaleDateString() : "—"} → {p.end ? new Date(p.end).toLocaleDateString() : "—"}</> : <><Zap className="h-3.5 w-3.5" /> Always on</>}
          {p.repeat && <span className="ml-auto flex items-center gap-1 capitalize"><Repeat2 className="h-3 w-3" /> {p.repeat}</span>}
        </div>

        <div className="mt-auto flex items-center justify-between border-t pt-2">
          <div className="flex items-center gap-2">
            <Switch checked={p.active} onCheckedChange={onToggle} className="scale-90" />
            <span className="text-xs text-muted-foreground">{p.active ? "Enabled" : "Disabled"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8"><Repeat2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DemoPromotions = () => {
  const [promos, setPromos] = useState<DemoPromotion[]>(demoPromotions);
  const [announcements, setAnnouncements] = useState<DemoAnnouncement[]>(demoAnnouncements);
  const [filter, setFilter] = useState<"all" | "active" | "scheduled" | "expired">("all");

  const stats = {
    active: promos.filter((p) => statusOf(p) === "active").length,
    scheduled: promos.filter((p) => statusOf(p) === "scheduled").length,
    expired: promos.filter((p) => statusOf(p) === "expired").length,
    total: promos.length,
  };
  const list = useMemo(() => promos.filter((p) => filter === "all" || statusOf(p) === filter), [promos, filter]);
  const toggle = (id: string) => setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  const toggleAnn = (id: string) => setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)));
  const liveAnnouncements = announcements.filter((a) => a.active);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Promotions</h1><p className="mt-0.5 text-sm text-muted-foreground">Discounts, offers and storefront announcements.</p></div>
        <Button><PlusCircle className="mr-2 h-4 w-4" /> Create Promotion</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={CheckCircle2} tile="bg-success/10 text-success" value={stats.active} label="Active Promotions" />
        <StatCard icon={Clock} tile="bg-info/10 text-info" value={stats.scheduled} label="Scheduled" />
        <StatCard icon={XCircle} tile="bg-muted text-muted-foreground" value={stats.expired} label="Expired" />
        <StatCard icon={LayoutGrid} tile="bg-primary/10 text-primary" value={stats.total} label="Total" />
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Your Promotions</h2>
          <div className="flex gap-1 rounded-md border p-0.5">
            {(["all", "active", "scheduled", "expired"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn("rounded px-3 py-1 text-xs font-medium capitalize", filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>{f}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => <PromoCard key={p.id} p={p} onToggle={() => toggle(p.id)} />)}
        </div>
      </div>

      {/* Announcements */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-lg font-semibold">Announcements</h2><p className="text-sm text-muted-foreground">Scrolling banner shown on your storefront.</p></div>
          <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Announcement</Button>
        </div>

        {liveAnnouncements.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-sm text-muted-foreground"><Megaphone className="h-4 w-4" /> Live preview</p>
            <div className="overflow-hidden rounded-lg border bg-muted/50 p-2">
              <div className="flex items-center gap-10 overflow-hidden whitespace-nowrap border-y-2 border-primary/20 bg-primary/10 py-2 text-base font-semibold text-primary">
                {liveAnnouncements.concat(liveAnnouncements).map((a, i) => (
                  <span key={i} className="flex items-center gap-2 px-6"><Sparkles className="h-4 w-4" /> {a.message}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Your Announcements</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-y bg-muted/30 text-xs text-muted-foreground">
                <tr><th className="w-14 px-4 py-2 text-left font-medium">Order</th><th className="px-4 py-2 text-left font-medium">Message</th><th className="w-20 px-4 py-2 text-center font-medium">Active</th><th className="w-24 px-4 py-2 text-right font-medium">Actions</th></tr>
              </thead>
              <tbody>
                {announcements.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">{a.order + 1}</td>
                    <td className="px-4 py-3"><span className="flex items-center gap-2"><Tag className="h-3.5 w-3.5 text-muted-foreground" /> {a.message}</span></td>
                    <td className="px-4 py-3 text-center"><Switch checked={a.active} onCheckedChange={() => toggleAnn(a.id)} /></td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DemoPromotions;
