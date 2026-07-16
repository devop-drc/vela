/** Demo Dashboard — mirrors src/pages/Index.tsx over mock data. */
import {
  Banknote, CreditCard, Package, Users, ExternalLink, RefreshCw, Archive,
  ShoppingBag, Palette, BarChart2, Star, Zap, Activity, Crown, ImageIcon, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Area } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { demoChartData, demoProfile, demoTopProducts, demoActivities } from "./data";

const STATS = [
  { title: "Total Revenue", value: "2,845,000 ALL", desc: "All-time revenue", icon: Banknote, tint: "bg-emerald-500/10 text-emerald-600" },
  { title: "Sales", value: "+1,890", desc: "All-time sales", icon: CreditCard, tint: "bg-blue-500/10 text-blue-600" },
  { title: "Active Products", value: "8", desc: "Available for sale", icon: Package, tint: "bg-violet-500/10 text-violet-600" },
  { title: "Total Customers", value: "1,204", desc: "Unique customers", icon: Users, tint: "bg-amber-500/10 text-amber-600" },
];

const QUICK = [
  { icon: ExternalLink, label: "View Storefront", tint: "text-foreground" },
  { icon: RefreshCw, label: "Quick Sync", tint: "text-blue-600" },
  { icon: Archive, label: "Restock", tint: "text-amber-600" },
  { icon: ShoppingBag, label: "Check Orders", tint: "text-emerald-600" },
  { icon: Palette, label: "Customize", tint: "text-violet-600" },
];

const SectionTitle = ({ icon: Icon, children }: any) => (
  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
    <Icon className="h-3.5 w-3.5" /> {children}
  </p>
);

const DemoDashboard = () => (
  <div className="space-y-6">
    {/* welcome + quick actions */}
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold">Welcome back, Elira 👋</h2>
        <p className="text-sm text-muted-foreground">Here's how Shop Name is doing today.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {QUICK.map((q) => (
          <button key={q.label} className="flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-accent">
            <q.icon className={cn("h-3.5 w-3.5", q.tint)} /> {q.label}
          </button>
        ))}
      </div>
    </div>

    {/* stat cards */}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {STATS.map((s) => (
        <Card key={s.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">{s.title}</CardTitle>
            <span className={cn("grid place-items-center rounded-md p-1.5", s.tint)}><s.icon className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold tabular-nums">{s.value}</div>
            <p className="text-xs text-muted-foreground">{s.desc}</p>
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* chart */}
      <div className="lg:col-span-2">
        <SectionTitle icon={BarChart2}>Business Overview</SectionTitle>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue &amp; new clients</CardTitle>
            <CardDescription>Last 6 months · ALL</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={demoChartData}>
                <defs>
                  <linearGradient id="dRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "hsl(var(--accent))" }} formatter={(v: number, n: string) => (n === "Revenue" ? [`${v.toLocaleString()} ALL`, n] : [v, n])} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: "0.8rem" }} />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="url(#dRev)" radius={[4, 4, 0, 0]} />
                <Area yAxisId="right" type="monotone" dataKey="clients" name="New Clients" fill="hsl(var(--info))" stroke="hsl(var(--info))" fillOpacity={0.2} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* right column */}
      <div className="space-y-6">
        <div>
          <SectionTitle icon={Star}>Shop Profile</SectionTitle>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14"><AvatarImage src={demoProfile.logo_url} /><AvatarFallback>BE</AvatarFallback></Avatar>
                <div>
                  <h3 className="font-semibold">{demoProfile.shop_name}</h3>
                  <p className="text-xs text-muted-foreground">@{demoProfile.username} · synced from Instagram</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[[Users, demoProfile.followers, "Followers"], [ImageIcon, demoProfile.posts, "Posts"], [Package, demoProfile.products, "Products"]].map(([Icon, v, l]: any) => (
                  <div key={l} className="rounded-lg bg-muted p-2">
                    <Icon className="mx-auto h-5 w-5 text-muted-foreground" />
                    <p className="mt-1 text-lg font-bold tabular-nums">{v.toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <SectionTitle icon={Zap}>Top Sellers</SectionTitle>
          <Card>
            <CardContent className="space-y-3 pt-6">
              {demoTopProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  {i === 0 ? <Crown className="h-5 w-5 shrink-0 text-amber-400" /> : <span className={cn("h-5 w-5 shrink-0 text-center text-sm font-bold", i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : "text-muted-foreground")}>{i + 1}</span>}
                  <img src={p.image} alt={p.name} className="h-10 w-10 rounded-md bg-muted object-cover" />
                  <p className="flex-1 truncate text-sm font-medium">{p.name}</p>
                  <p className="text-sm font-semibold tabular-nums">{p.sold} sold</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    {/* live activity */}
    <div>
      <SectionTitle icon={Activity}>Live Activity</SectionTitle>
      <Card>
        <CardContent className="pt-6">
          <ScrollArea className="h-64">
            <div className="space-y-2.5 pr-4">
              {demoActivities.map((a) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                  className={cn("flex items-center gap-3 rounded-lg p-3 shadow-sm", a.type === "sale" ? "bg-success/5" : "bg-info/5")}>
                  <Avatar className="h-9 w-9">
                    {a.image ? <AvatarImage src={a.image} /> : null}
                    <AvatarFallback className={a.iconBg}><a.icon className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-semibold">{a.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.description}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(a.date), { addSuffix: true })}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{a.value}</p>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default DemoDashboard;
