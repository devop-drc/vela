import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Area } from "recharts";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { DateRangePicker } from "../ui/DateRangePicker";
import { DateRange } from "react-day-picker";
import { Button } from "../ui/button";
import { subDays, subMonths } from "date-fns";

interface OverviewChartProps {
  data: { name: string; revenue: number; clients: number; orders: number }[];
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  granularity: 'day' | 'month';
  setGranularity: (granularity: 'day' | 'month') => void;
}

const PERIOD_PRESETS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
] as const;

export const OverviewChart = ({ data, dateRange, setDateRange, granularity, setGranularity }: OverviewChartProps) => {
  const { shopDetails } = useShop();
  const [visibleData, setVisibleData] = useState(['revenue', 'clients', 'orders']);
  const [activePeriod, setActivePeriod] = useState<number | null>(null);

  const handleToggle = (value: string[]) => {
    if (value.length) setVisibleData(value);
  };

  const handlePeriodPreset = (days: number) => {
    setActivePeriod(days);
    setGranularity('day');
    setDateRange({ from: subDays(new Date(), days - 1), to: new Date() });
  };

  const handleLast6Months = () => {
    setActivePeriod(null);
    setGranularity('month');
    setDateRange({ from: subMonths(new Date(), 5), to: new Date() });
  };

  const handleAllTime = () => {
    setActivePeriod(null);
    setDateRange(undefined);
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
    <Card className="shadow-sm border border-border/60">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardDescription className="text-sm">Revenue, clients, and orders over time.</CardDescription>
            {/* Period selector — segmented buttons */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
              {PERIOD_PRESETS.map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => handlePeriodPreset(days)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    activePeriod === days
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={handleLast6Months}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activePeriod === null && dateRange !== undefined
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                6M
              </button>
              <button
                onClick={handleAllTime}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activePeriod === null && dateRange === undefined
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker date={dateRange} onDateChange={(r) => { setActivePeriod(null); setDateRange(r); }} />
            <ToggleGroup type="single" variant="outline" size="sm" value={granularity} onValueChange={(value: 'day' | 'month') => value && setGranularity(value)}>
              <ToggleGroupItem value="month" aria-label="By Month">Month</ToggleGroupItem>
              <ToggleGroupItem value="day" aria-label="By Day">Day</ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup type="multiple" variant="outline" size="sm" value={visibleData} onValueChange={handleToggle}>
              <ToggleGroupItem value="revenue" aria-label="Toggle revenue">Revenue</ToggleGroupItem>
              <ToggleGroupItem value="clients" aria-label="Toggle clients">Clients</ToggleGroupItem>
              <ToggleGroupItem value="orders" aria-label="Toggle orders">Orders</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={320}>
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
                name="Revenue"
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
                name="New Clients"
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
                name="Orders"
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
