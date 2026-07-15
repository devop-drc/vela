import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Area } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { DateRangePicker } from "../ui/DateRangePicker";
import { DateRange } from "react-day-picker";
import { subDays, subMonths } from "date-fns";
import { useTranslation } from "react-i18next";

interface OverviewChartProps {
  data: { name: string; revenue: number; clients: number; orders: number }[];
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  granularity: 'day' | 'month';
  setGranularity: (granularity: 'day' | 'month') => void;
}

export const OverviewChart = ({ data, dateRange, setDateRange, granularity, setGranularity }: OverviewChartProps) => {
  const { shopDetails } = useShop();
  const { t } = useTranslation();
  const [visibleData, setVisibleData] = useState(['revenue', 'clients', 'orders']);
  // Single-select period preset. '' == a custom range picked via the date picker.
  const [periodValue, setPeriodValue] = useState<string>('6m');

  const handleToggle = (value: string[]) => {
    if (value.length) setVisibleData(value);
  };

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
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex flex-col gap-2">
          {/* Period presets — single-select ToggleGroup matching the controls below */}
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup type="single" variant="outline" size="sm" value={periodValue} onValueChange={applyPeriod}>
              <ToggleGroupItem value="7" aria-label="Last 7 days">7D</ToggleGroupItem>
              <ToggleGroupItem value="30" aria-label="Last 30 days">30D</ToggleGroupItem>
              <ToggleGroupItem value="90" aria-label="Last 90 days">90D</ToggleGroupItem>
              <ToggleGroupItem value="6m" aria-label="Last 6 months">6M</ToggleGroupItem>
              <ToggleGroupItem value="all" aria-label="All time">{t("common.all")}</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker date={dateRange} onDateChange={(r) => { setPeriodValue(''); setDateRange(r); }} />
            <ToggleGroup type="single" variant="outline" size="sm" value={granularity} onValueChange={(value: 'day' | 'month') => value && setGranularity(value)}>
              <ToggleGroupItem value="month" aria-label="By Month">{t("dashboard.month")}</ToggleGroupItem>
              <ToggleGroupItem value="day" aria-label="By Day">{t("dashboard.day")}</ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup type="multiple" variant="outline" size="sm" value={visibleData} onValueChange={handleToggle}>
              <ToggleGroupItem value="revenue" aria-label="Toggle revenue">{t("dashboard.revenue")}</ToggleGroupItem>
              <ToggleGroupItem value="clients" aria-label="Toggle clients">{t("dashboard.clients")}</ToggleGroupItem>
              <ToggleGroupItem value="orders" aria-label="Toggle orders">{t("nav.orders")}</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pl-2 pr-4 pb-4 pt-0 flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.85}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.25}/>
              </linearGradient>
              <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCurrency(v, shopDetails?.currency).replace(/(\.00|,\d*)/g, '')}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.6 }} />
            <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '12px' }} />

            {/* Revenue — primary colour bar */}
            {visibleData.includes('revenue') && (
              <Bar
                yAxisId="left"
                dataKey="revenue"
                name={t("dashboard.revenue")}
                fill="url(#colorRevenue)"
                stroke="hsl(var(--primary))"
                strokeWidth={0}
                radius={[4, 4, 0, 0]}
              />
            )}
            {/* Clients — muted area line */}
            {visibleData.includes('clients') && (
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="clients"
                name={t("dashboard.new_clients")}
                fill="url(#colorClients)"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
              />
            )}
            {/* Orders — muted area line, slightly different dash */}
            {visibleData.includes('orders') && (
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                name={t("nav.orders")}
                fill="url(#colorOrders)"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                strokeDasharray="2 2"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
