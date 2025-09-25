import { Link } from "react-router-dom";
import { Home, ShoppingBag, Settings, Package, Archive, Users, Image as ImageIcon, Crown, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Area } from "recharts";
import { formatDistanceToNow } from 'date-fns';
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  mockStatCards,
  mockChartData,
  mockProfileData,
  mockTopProducts,
  mockActivities,
} from "@/lib/mockData";

// --- Self-Contained Demo Components ---

const DemoSidebar = () => (
  <aside className="hidden md:flex md:flex-col md:w-64 bg-card border-r">
    <div className="p-4 border-b flex items-center">
      <ShoppingBag className="h-6 w-6 mr-2" />
      <h1 className="text-xl font-bold">InstaShopify</h1>
    </div>
    <nav className="flex-1 p-4 space-y-2">
      {[
        { to: "/demo", icon: Home, label: "Dashboard" },
        { to: "/demo", icon: Package, label: "Products" },
        { to: "/demo", icon: Archive, label: "Out of Stock" },
        { to: "/demo", icon: ShoppingBag, label: "Orders" },
        { to: "/demo", icon: Settings, label: "Settings" },
      ].map((item) => (
        <div key={item.to} className="relative">
          <a href="#" className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
            <item.icon className="mr-3 h-5 w-5" />
            {item.label}
          </a>
          {item.label === 'Dashboard' && <div className="absolute inset-0 bg-accent rounded-lg z-[-1]"></div>}
        </div>
      ))}
    </nav>
  </aside>
);

const DemoHeader = () => (
  <header className="flex items-center justify-between h-16 px-6 bg-card border-b">
    <h1 className="text-xl font-bold">Dashboard (Demo)</h1>
    <Button asChild>
      <Link to="/login">Sign Up to Get Started</Link>
    </Button>
  </header>
);

const DemoStatCard = ({ title, value, icon: Icon, description }: any) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent className="px-4 pb-4">
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const DemoOverviewChart = () => (
  <Card>
    <CardHeader>
      <CardTitle>Business Overview</CardTitle>
      <CardDescription>Revenue, new clients, and orders over the last 6 months.</CardDescription>
    </CardHeader>
    <CardContent className="pl-2">
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={mockChartData}>
          <defs><linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/></linearGradient></defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
          <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: 'hsl(var(--accent))' }} />
          <Legend wrapperStyle={{ fontSize: '0.875rem' }} />
          <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="url(#colorRevenue)" radius={[4, 4, 0, 0]} />
          <Area yAxisId="right" type="monotone" dataKey="clients" name="New Clients" fill="hsl(var(--info))" stroke="hsl(var(--info))" fillOpacity={0.2} />
        </ComposedChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

const Demo = () => {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <DemoSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <DemoHeader />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground">
                <CardHeader>
                  <CardTitle>Welcome to the InstaShopify Demo!</CardTitle>
                  <CardDescription className="text-primary-foreground/80">This is a preview of the dashboard. Connect your account to see your own data.</CardDescription>
                </CardHeader>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Profile Stats</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4"><Avatar className="h-16 w-16"><AvatarImage src={mockProfileData.logo_url} /><AvatarFallback>AT</AvatarFallback></Avatar><div><h3 className="text-lg font-semibold">{mockProfileData.shop_name}</h3><p className="text-sm text-muted-foreground">Synced from Instagram</p></div></div>
                    <div className="grid grid-cols-3 gap-4 text-center"><div className="p-2 rounded-lg bg-muted"><Users className="h-6 w-6 mx-auto text-muted-foreground" /><p className="text-2xl font-bold mt-1">{mockProfileData.followers_count.toLocaleString()}</p><p className="text-xs text-muted-foreground">Followers</p></div><div className="p-2 rounded-lg bg-muted"><ImageIcon className="h-6 w-6 mx-auto text-muted-foreground" /><p className="text-2xl font-bold mt-1">{mockProfileData.media_count.toLocaleString()}</p><p className="text-xs text-muted-foreground">Posts</p></div><div className="p-2 rounded-lg bg-muted"><Package className="h-6 w-6 mx-auto text-muted-foreground" /><p className="text-2xl font-bold mt-1">{mockProfileData.productCount.toLocaleString()}</p><p className="text-xs text-muted-foreground">Products</p></div></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Top Sellers</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {mockTopProducts.map((product, index) => (<div key={product.product_id} className="flex items-center gap-4">{index === 0 && <Crown className="h-6 w-6 text-amber-400" />}{index === 1 && <div className="h-6 w-6 text-slate-400 font-bold text-center">2</div>}{index === 2 && <div className="h-6 w-6 text-orange-400 font-bold text-center">3</div>}<img src={product.media_url} alt={product.name} className="h-12 w-12 rounded-md object-cover bg-muted" /><div className="flex-1"><p className="font-medium truncate">{product.name}</p></div><p className="font-semibold">{product.total_sold} sold</p></div>))}
                  </CardContent>
                </Card>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {mockStatCards.map(card => <DemoStatCard key={card.title} {...card} />)}
              </div>
              <DemoOverviewChart />
            </div>
            <div className="lg:col-span-1 lg:sticky lg:top-0 space-y-6">
              <Card className="h-full">
                <CardHeader><CardTitle>Live Activity</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[74.5vh]">
                    <div className="space-y-4 pr-4">
                      {mockActivities.map(activity => (<motion.div key={activity.id} className={cn("w-full text-left p-3 flex items-center gap-3 rounded-lg shadow", activity.type === 'sale' ? 'bg-emerald-500/5' : 'bg-blue-500/5')}><Avatar className="h-10 w-10"><AvatarImage src={activity.image} /><AvatarFallback className={activity.iconBg}><activity.icon className="h-5 w-5" /></AvatarFallback></Avatar><div className="flex-1 overflow-hidden"><p className="font-semibold text-sm truncate">{activity.title}</p><p className="text-xs text-muted-foreground truncate">{activity.description}</p><p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(activity.date), { addSuffix: true })}</p></div><p className="font-semibold text-sm">{activity.value}</p></motion.div>))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Demo;