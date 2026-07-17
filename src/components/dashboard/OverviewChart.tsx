import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { DateRangePicker } from "../ui/DateRangePicker";
import { DateRange } from "react-day-picker";
import { subDays, subMonths } from "date-fns";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { BarChart2 } from "lucide-react";

interface OverviewChartProps {
  data: { name: string; revenue: number; clients: number; orders: number }[];
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  granularity: 'day' | 'month';
  setGranularity: (granularity: 'day' | 'month') => void;
}

// Series palette: revenue owns the brand colour; clients/orders get their own
// hues so the lines are tellable-apart at a glance (two identical grey dashes
// weren't).
const SERIES = [
  { key: 'revenue', color: 'hsl(var(--primary))' },
  { key: 'clients', color: 'hsl(199 89% 48%)' },
  { key: 'orders', color: 'hsl(142 71% 45%)' },
] as const;

/** Compact money ticks: 1.2k / 35k / 1.1M instead of full currency strings. */
const compactNumber = (v: number) =>
  Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  : Math.abs(v) >= 1_000 ? `${(v / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  : String(Math.round(v));

export const OverviewChart = ({ data, dateRange, setDateRange, granularity, setGranularity }: OverviewChartProps) => {
  const { shopDetails } = useShop();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [visibleData, setVisibleData] = useState<string[]>(['revenue', 'clients', 'orders']);
  // Single-select period preset. '' == a custom range picked via the date picker.
  const [periodValue, setPeriodValue] = useState<string>('6m');

  const seriesLabel: Record<string, string> = {
    revenue: t("dashboard.revenue"),
    clients: t("dashboard.new_clients"),
    orders: t("nav.orders"),
  };

  const toggleSeries = (key: string) =>
    setVisibleData((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      return next.length ? next : prev; // keep at least one series on
    });

  const applyPeriod = (value: string) => {
    if (!value) return; // ToggleGroup emits '' on deselect — ignore, keep one active.
    setPeriodValue(value);
    if (value === '6m') {
      setGranularity('month');
      setDateRange({ from: subMonths(new Date(), 5), to: new Date() });
    } else if (value === 'all') {
      setDateRange(undefined);
    } else {
      const days = Number(value);
      setGranularity('day');
      setDateRange({ from: subDays(new Date(), days - 1), to: new Date() });
    }
  };

  const isEmpty = data.length === 0 || data.every((d) => !d.revenue && !d.clients && !d.orders);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-border bg-background/95 backdrop-blur-sm p-3 shadow-xl">
          <p className="font-semibold text-sm mb-2 text-foreground">{label}</p>
          {payload.map((pld: any) => (
            <div key={pld.dataKey} className="flex justify-between items-center gap-6 py-0.5">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: pld.stroke || pld.fill }} />
                {pld.name}
              </span>
              <span className="font-semibold text-xs">
                {pld.dataKey === 'revenue'
                  ? formatCurrency(pld.value, shopDetails?.currency)
                  : pld.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-sm border border-border/60 h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0 space-y-2">
        {/* Row 1: period presets (scrolls on tiny screens, never wraps ugly) */}
        <div className="-mx-1 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max items-center gap-2">
            <ToggleGroup type="single" variant="outline" size="sm" value={periodValue} onValueChange={applyPeriod}>
              <ToggleGroupItem value="7" aria-label="Last 7 days">7D</ToggleGroupItem>
              <ToggleGroupItem value="30" aria-label="Last 30 days">30D</ToggleGroupItem>
              <ToggleGroupItem value="90" aria-label="Last 90 days">90D</ToggleGroupItem>
              <ToggleGroupItem value="6m" aria-label="Last 6 months">6M</ToggleGroupItem>
              <ToggleGroupItem value="all" aria-label="All time">{t("common.all")}</ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup type="single" variant="outline" size="sm" value={granularity} onValueChange={(value: 'day' | 'month') => value && setGranularity(value)}>
              <ToggleGroupItem value="month" aria-label="By Month">{t("dashboard.month")}</ToggleGroupItem>
              <ToggleGroupItem value="day" aria-label="By Day">{t("dashboard.day")}</ToggleGroupItem>
            </ToggleGroup>
            <DateRangePicker date={dateRange} onDateChange={(r) => { setPeriodValue(''); setDateRange(r); }} />
          </div>
        </div>
        {/* Row 2: legend chips — they ARE the series toggles (one element does
            both jobs; the old separate Legend + toggle row ate ~70px). */}
        <div className="flex flex-wrap items-center gap-1.5">
          {SERIES.map((s) => {
            const on = visibleData.includes(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleSeries(s.key)}
                aria-pressed={on}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  on ? "bg-background text-foreground shadow-sm" : "border-transparent bg-muted/60 text-muted-foreground/60 line-through"
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", !on && "opacity-40")} style={{ background: s.color }} />
                {seriesLabel[s.key]}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="pl-0 pr-2 pb-3 pt-0 flex-1 min-h-0 relative">
        {isEmpty ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <BarChart2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">{t("dashboard.chart_empty", "No sales in this period yet")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">{t("dashboard.chart_empty_hint", "Orders will appear here as they come in.")}</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(199 89% 48%)" stopOpacity={0.22}/>
                  <stop offset="95%" stopColor="hsl(199 89% 48%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.22}/>
                  <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={isMobile ? 28 : 16}
                interval="preserveStartEnd"
                tickMargin={6}
              />
              <YAxis
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                width={isMobile ? 38 : 46}
                tickLine={false}
                axisLine={false}
                tickFormatter={compactNumber}
              />
              {/* The counts axis is context, not something to read exact values
                  off — on phones it just eats plot width, so it goes. */}
              <YAxis
                yAxisId="right"
                orientation="right"
                hide={isMobile}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                width={30}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.6 }} />

              {/* Revenue — primary colour bar */}
              {visibleData.includes('revenue') && (
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  name={seriesLabel.revenue}
                  fill="url(#colorRevenue)"
                  maxBarSize={28}
                  radius={[5, 5, 0, 0]}
                />
              )}
              {/* Clients — blue area line */}
              {visibleData.includes('clients') && (
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="clients"
                  name={seriesLabel.clients}
                  fill="url(#colorClients)"
                  stroke="hsl(199 89% 48%)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3.5 }}
                />
              )}
              {/* Orders — green area line */}
              {visibleData.includes('orders') && (
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  name={seriesLabel.orders}
                  fill="url(#colorOrders)"
                  stroke="hsl(142 71% 45%)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3.5 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
