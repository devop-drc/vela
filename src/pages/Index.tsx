import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Banknote, Package, Users, CreditCard, BarChart2, Zap, Star, Activity } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { OverviewChart } from "@/components/dashboard/OverviewChart";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { useShop } from "@/contexts/ShopContext";
import { useSync } from "@/contexts/syncContext";
import { formatCurrency } from "@/lib/formatters";
import { ProfileStats } from "@/components/dashboard/ProfileStats";
import { TopProducts } from "@/components/dashboard/TopProducts";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { useIntegration } from "@/contexts/IntegrationContext";
import { RealtimeChannel } from "@supabase/supabase-js";
import { DateRange } from "react-day-picker";
import { subMonths, startOfMonth, endOfMonth, addDays, startOfDay, endOfDay } from "date-fns";

interface DashboardData {
  totalRevenue: number;
  salesCount: number;
  activeProducts: number;
  customers: number;
  pendingOrders: number;
  chartData: { name: string; revenue: number; clients: number; orders: number }[];
}

const useDashboardData = (
  shopDetails: any,
  convertCurrency: (amount: number | null | undefined, fromCurrency?: string, toCurrency?: string) => number,
  dateRange: DateRange | undefined,
  granularity: 'day' | 'month'
) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!shopDetails) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses').select('id').eq('user_id', user.id).single();

    if (businessError || !business) {
      console.error("Could not fetch business:", businessError);
      setIsLoading(false);
      return;
    }

    let ordersQuery = supabase
      .from('orders')
      .select('total_amount, customer_name, customer_email, created_at, id, status, currency, payment_status')
      .eq('business_id', business.id);

    if (dateRange?.from) {
      ordersQuery = ordersQuery.gte('created_at', startOfDay(dateRange.from).toISOString());
    }
    if (dateRange?.to) {
      ordersQuery = ordersQuery.lte('created_at', endOfDay(dateRange.to).toISOString());
    }

    const [ordersRes, productsRes] = await Promise.all([
      ordersQuery.order('created_at', { ascending: false }),
      supabase.from('products').select('status').eq('business_id', business.id)
    ]);

    if (ordersRes.error || productsRes.error) {
      console.error("Error fetching data:", ordersRes.error, productsRes.error);
      setIsLoading(false);
      return;
    }

    const allOrders = ordersRes.data || [];
    const products = productsRes.data || [];

    // Filter for fulfilled and paid orders for revenue calculations
    const fulfilledPaidOrders = allOrders.filter(order =>
      order.status === 'Fulfilled' && order.payment_status === 'paid'
    );

    // Pending: not Fulfilled, not Cancelled
    const pendingOrders = allOrders.filter(order =>
      order.status !== 'Fulfilled' && order.status !== 'Cancelled'
    ).length;

    const totalRevenue = fulfilledPaidOrders.reduce(
      (acc, order) => acc + convertCurrency(order.total_amount, order.currency, shopDetails.currency),
      0
    );
    const salesCount = fulfilledPaidOrders.length;
    const activeProducts = products.filter(p => p.status === 'Active').length;
    const uniqueCustomers = new Set(fulfilledPaidOrders.map(o => o.customer_email)).size;

    const aggregatedData: { [key: string]: { revenue: number; clients: Set<string>; orders: number } } = {};

    let chartStartDate: Date;
    let chartEndDate: Date;

    if (dateRange?.from && dateRange?.to) {
      chartStartDate = startOfDay(dateRange.from);
      chartEndDate = endOfDay(dateRange.to);
    } else if (allOrders.length > 0) {
      const sortedOrders = [...allOrders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      chartStartDate = startOfDay(new Date(sortedOrders[0].created_at));
      chartEndDate = endOfDay(new Date(sortedOrders[sortedOrders.length - 1].created_at));
    } else {
      chartEndDate = endOfDay(new Date());
      chartStartDate = startOfMonth(subMonths(chartEndDate, 5));
    }

    allOrders.forEach(order => {
      const orderDate = new Date(order.created_at);
      let key: string;

      if (granularity === 'month') {
        key = orderDate.toLocaleString('default', { month: 'short', year: '2-digit' });
      } else {
        key = orderDate.toLocaleString('default', { month: 'short', day: 'numeric' });
      }

      if (!aggregatedData[key]) {
        aggregatedData[key] = { revenue: 0, clients: new Set(), orders: 0 };
      }
      if (order.status === 'Fulfilled' && order.payment_status === 'paid') {
        aggregatedData[key].revenue += convertCurrency(order.total_amount, order.currency, shopDetails.currency);
        aggregatedData[key].clients.add(order.customer_email);
      }
      aggregatedData[key].orders += 1;
    });

    const chartData: { name: string; revenue: number; clients: number; orders: number }[] = [];
    let currentDate = new Date(chartStartDate);

    while (currentDate <= chartEndDate) {
      let key: string;
      if (granularity === 'month') {
        key = currentDate.toLocaleString('default', { month: 'short', year: '2-digit' });
        chartData.push({
          name: key,
          revenue: aggregatedData[key]?.revenue || 0,
          clients: aggregatedData[key]?.clients.size || 0,
          orders: aggregatedData[key]?.orders || 0,
        });
        currentDate = startOfMonth(addDays(endOfMonth(currentDate), 1));
      } else {
        key = currentDate.toLocaleString('default', { month: 'short', day: 'numeric' });
        chartData.push({
          name: key,
          revenue: aggregatedData[key]?.revenue || 0,
          clients: aggregatedData[key]?.clients.size || 0,
          orders: aggregatedData[key]?.orders || 0,
        });
        currentDate = addDays(currentDate, 1);
      }
    }

    setData({ totalRevenue, salesCount, activeProducts, customers: uniqueCustomers, pendingOrders, chartData });
    setIsLoading(false);
  }, [shopDetails, convertCurrency, dateRange, granularity]);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const setupRealtimeListener = async () => {
      if (!shopDetails) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: business, error: businessError } = await supabase
        .from('businesses').select('id').eq('user_id', user.id).single();

      if (businessError || !business) {
        console.error("Could not find business for order listener:", businessError);
        return;
      }

      channel = supabase
        .channel(`dashboard-orders:${business.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${business.id}` },
          () => { fetchData(); }
        )
        .subscribe();
    };

    if (shopDetails) {
      fetchData();
      setupRealtimeListener();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchData, shopDetails]);

  return { data, isLoading, fetchData };
};

const Index = () => {
  const { setTitle } = usePageTitle();
  const { shopDetails, isLoading: isShopLoading, convertCurrency, fetchShopDetails } = useShop();
  const { activeJob } = useSync();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 5),
    to: new Date(),
  });
  const [granularity, setGranularity] = useState<'day' | 'month'>('month');
  const { data, isLoading: isDashboardDataLoading, fetchData } = useDashboardData(shopDetails, convertCurrency, dateRange, granularity);
  const { runWithIntegrationCheck } = useIntegration();

  useEffect(() => {
    setTitle("Dashboard");
  }, [setTitle]);

  useEffect(() => {
    if (activeJob?.status === 'completed') {
      fetchData();
      fetchShopDetails();
    }
  }, [activeJob?.status, fetchData, fetchShopDetails]);

  useEffect(() => {
    const checkIntegrationStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: integration, error } = await supabase
        .from('integrations')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'facebook')
        .maybeSingle();

      if (error) {
        console.error("Error checking integration status:", error);
        return;
      }

      if (!integration) {
        runWithIntegrationCheck(() => {});
      }
    };
    checkIntegrationStatus();
  }, [runWithIntegrationCheck]);

  const isLoading = isShopLoading || isDashboardDataLoading;

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Welcome header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        {/* Quick actions skeleton */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-28" /><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-28" /><Skeleton className="h-8 w-24" />
        </div>
        {/* Stat cards skeleton */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
        </div>
        {/* Main grid skeleton — row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <Skeleton className="lg:col-span-2 h-96 w-full" />
          <Skeleton className="lg:col-span-1 h-40 w-full" />
        </div>
        {/* Main grid skeleton — row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <Skeleton className="lg:col-span-1 h-64 w-full" />
          <Skeleton className="lg:col-span-2 h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-10">
        No data to display. Start by adding some products and orders!
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <WelcomeHeader
        pendingOrders={data.pendingOrders}
        activeProducts={data.activeProducts}
        totalOrders={data.salesCount}
      />

      {/* Quick Actions — full-width row right below welcome header */}
      <section>
        <QuickActions />
      </section>

      {/* Stat Cards */}
      <section>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(data.totalRevenue, shopDetails?.currency)}
            icon={Banknote}
            color="emerald"
          />
          <StatCard
            title="Sales"
            value={`${data.salesCount}`}
            icon={CreditCard}
            color="blue"
          />
          <StatCard
            title="Active Products"
            value={data.activeProducts.toString()}
            icon={Package}
            color="violet"
          />
          <StatCard
            title="Total Customers"
            value={data.customers.toString()}
            icon={Users}
            color="amber"
          />
        </div>
      </section>

      {/* Main grid: Left column (Profile + Top Sellers) | Right column (Overview + Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><Star className="h-3.5 w-3.5" />Shop Profile</h2>
            <ProfileStats />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />Top Sellers</h2>
            <TopProducts />
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><BarChart2 className="h-3.5 w-3.5" />Business Overview</h2>
            <OverviewChart
              data={data.chartData}
              dateRange={dateRange}
              setDateRange={setDateRange}
              granularity={granularity}
              setGranularity={setGranularity}
            />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" />Live Activity</h2>
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
