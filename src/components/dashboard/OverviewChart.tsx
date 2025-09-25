import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Line, Area } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

interface OverviewChartProps {
  data: { name: string; revenue: number; clients: number; orders: number }[];
}

export const OverviewChart = ({ data }: OverviewChartProps) => {
  const { shopDetails, convertCurrency } = useShop();
  const [visibleData, setVisibleData] = useState(['revenue', 'clients', 'orders']);

  const handleToggle = (value: string[]) => {
    if (value.length) {
      setVisibleData(value);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border bg-background/80 backdrop-blur-sm p-2 shadow-lg">
          <p className="font-bold mb-2 text-foreground">{label}</p>
          {payload.map((pld: any) => (
            <div key={pld.dataKey} style={{ color: pld.stroke || pld.fill }} className="flex justify-between items-center gap-4">
              <span className="capitalize text-sm">{pld.name}:</span>
              <span className="font-bold text-sm">
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
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Business Overview</CardTitle>
            <CardDescription>Revenue, new clients, and orders over the last 6 months.</CardDescription>
          </div>
          <ToggleGroup type="multiple" variant="outline" size="sm" value={visibleData} onValueChange={handleToggle}>
            <ToggleGroupItem value="revenue" aria-label="Toggle revenue">Revenue</ToggleGroupItem>
            <ToggleGroupItem value="clients" aria-label="Toggle clients">Clients</ToggleGroupItem>
            <ToggleGroupItem value="orders" aria-label="Toggle orders">Orders</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data.map(d => ({ ...d, revenue: convertCurrency(d.revenue) }))}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
              </linearGradient>
              <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value, shopDetails?.currency).replace(/(\.00|,\d*)/g, '')} />
            <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
            <Legend wrapperStyle={{ fontSize: '0.875rem' }} />
            
            {visibleData.includes('revenue') && <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="url(#colorRevenue)" radius={[4, 4, 0, 0]} />}
            
            {visibleData.includes('clients') && <Area yAxisId="right" type="monotone" dataKey="clients" fill="url(#colorClients)" stroke="none" />}
            {visibleData.includes('clients') && <Line yAxisId="right" type="monotone" dataKey="clients" name="New Clients" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />}
            
            {visibleData.includes('orders') && <Area yAxisId="right" type="monotone" dataKey="orders" fill="url(#colorOrders)" stroke="none" />}
            {visibleData.includes('orders') && <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};