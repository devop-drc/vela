import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Banknote, Package, Users, CreditCard } from "lucide-react";
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
import { useIntegration } from "@/contexts/IntegrationContext"; // Import useIntegration
import { RealtimeChannel } from "@supabase/supabase-js";
import { DateRange } from "react-day-picker"; // Import DateRange type
import { subMonths, startOfMonth, endOfMonth, addDays, startOfDay, endOfDay } from "date-fns"; // Import date-fns utilities

interface DashboardData {
  totalRevenue: number;
  salesCount: number;
  activeProducts: number;
  customers: number;
  chartData: { name: string; revenue: number; clients: number; orders: number }[];
}

const useDashboardData = (
  shopDetails: any,
  convertCurrency: (amount: number | null | undefined, fromCurrency?: string, toCurrency?: string) => number,
  dateRange: DateRange | undefined,
  granularity: 'day' | 'month' // New parameter
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

    let ordersQuery = supabase.from('orders').select('total_amount, customer_name, customer_email, created_at, id, status, currency, payment_status').eq('business_id', business.id);

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

    const totalRevenue = fulfilledPaidOrders.reduce((acc, order) => acc + convertCurrency(order.total_amount, order.currency, shopDetails.currency), 0);
    const salesCount = fulfilledPaidOrders.length;
    const activeProducts = products.filter(p => p.status === 'Active').length;
    const uniqueCustomers = new Set(fulfilledPaidOrders.map(o => o.customer_email)).size;

    const aggregatedData: { [key: string]: { revenue: number; clients: Set<string>; orders: number } } = {};

    // Determine the full range of dates to display on the chart
    let chartStartDate: Date;
    let chartEndDate: Date;

    if (dateRange?.from && dateRange?.to) {
      chartStartDate = startOfDay(dateRange.from);
      chartEndDate = endOfDay(dateRange.to);
    } else if (allOrders.length > 0) {
      // If no specific date range, use the range of available orders
      const sortedOrders = [...allOrders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      chartStartDate = startOfDay(new Date(sortedOrders[0].created_at));
      chartEndDate = endOfDay(new Date(sortedOrders[sortedOrders.length - 1].created_at));
    } else {
      // Default to last 6 months if no orders and no date range
      chartEndDate = endOfDay(new Date());
      chartStartDate = startOfMonth(subMonths(chartEndDate, 5));
    }

    allOrders.forEach(order => {
      const orderDate = new Date(order.created_at);
      let key: string;

      if (granularity === 'month') {
        key = orderDate.toLocaleString('default', { month: 'short', year: '2-digit' });
      } else { // 'day'
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
        currentDate = startOfMonth(addDays(endOfMonth(currentDate), 1)); // Move to the start of the next month
      } else { // 'day'
        key = currentDate.toLocaleString('default', { month: 'short', day: 'numeric' });
        chartData.push({
          name: key,
          revenue: aggregatedData[key]?.revenue || 0,
          clients: aggregatedData[key]?.clients.size || 0,
          orders: aggregatedData[key]?.orders || 0,
        });
        currentDate = addDays(currentDate, 1); // Move to the next day
      }
    }

    setData({ totalRevenue, salesCount, activeProducts, customers: uniqueCustomers, chartData });
    setIsLoading(false);
  }, [shopDetails, convertCurrency, dateRange, granularity]); // Add granularity to dependencies

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
          (payload) => {
            console.log("Realtime order update detected, refetching dashboard data:", payload);
            fetchData();
          }
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
  const [granularity, setGranularity] = useState<'day' | 'month'>('month'); // New state for granularity
  const { data, isLoading: isDashboardDataLoading, fetchData } = useDashboardData(shopDetails, convertCurrency, dateRange, granularity); // Pass granularity
  const { runWithIntegrationCheck } = useIntegration();

  useEffect(() => {
    setTitle("Dashboard");
  }, [setTitle]);

  useEffect(() => {
    // Trigger dashboard data and shop details refresh after a successful sync
    if (activeJob?.status === 'completed') {
      fetchData();
      fetchShopDetails(); // <-- Refresh shop details and currency rates
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


  if (isShopLoading || isDashboardDataLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><Skeleton className="h-56" /><Skeleton className="h-56" /></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
          <Skeleton className="h-96 w-full" />
        </div>
        <div className="lg:col-span-1"><Skeleton className="h-[700px] w-full" /></div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-10">No data to display. Start by adding some products and orders!</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-6">
        <QuickActions />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProfileStats />
          <TopProducts />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Revenue" value={formatCurrency(data.totalRevenue, shopDetails?.currency)} icon={Banknote} description="All-time revenue" />
          <StatCard title="Sales" value={`+${data.salesCount}`} icon={CreditCard} description="All-time sales count" />
          <StatCard title="Active Products" value={data.activeProducts.toString()} icon={Package} description="Products available for sale" />
          <StatCard title="Total Customers" value={data.customers.toString()} icon={Users} description="Unique customers all-time" />
        </div>
        <OverviewChart data={data.chartData} dateRange={dateRange} setDateRange={setDateRange} granularity={granularity} setGranularity={setGranularity} />
      </div>
      <div className="lg:col-span-1 lg:sticky lg:top-0 space-y-6">
        <ActivityFeed />
      </div>
    </div>
  );
};

export default Index;