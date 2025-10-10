import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Banknote, Package, Users, CreditCard } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { OverviewChart } from "@/components/dashboard/OverviewChart";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { useShop } from "@/contexts/ShopContext";
import { useSync } from "@/contexts/SyncContext";
import { formatCurrency } from "@/lib/formatters";
import { ProfileStats } from "@/components/dashboard/ProfileStats";
import { TopProducts } from "@/components/dashboard/TopProducts";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { useIntegration } from "@/contexts/IntegrationContext"; // Import useIntegration

interface DashboardData {
  totalRevenue: number;
  salesCount: number;
  activeProducts: number;
  customers: number;
  chartData: { name: string; revenue: number; clients: number; orders: number }[];
}

const useDashboardData = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
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

    const [ordersRes, productsRes] = await Promise.all([
      supabase.from('orders').select('total_amount, customer_name, customer_email, created_at, id').eq('business_id', business.id).order('created_at', { ascending: false }),
      supabase.from('products').select('status').eq('business_id', business.id)
    ]);

    if (ordersRes.error || productsRes.error) {
      console.error("Error fetching data:", ordersRes.error, productsRes.error);
      setIsLoading(false);
      return;
    }

    const orders = ordersRes.data || [];
    const products = productsRes.data || [];
    
    const totalRevenue = orders.reduce((acc, order) => acc + order.total_amount, 0);
    const salesCount = orders.length;
    const activeProducts = products.filter(p => p.status === 'Active').length;
    const uniqueCustomers = new Set(orders.map(o => o.customer_email)).size;

    const monthlyData: { [key: string]: { revenue: number; clients: Set<string>; orders: number } } = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    orders.forEach(order => {
      const orderDate = new Date(order.created_at);
      if (orderDate > sixMonthsAgo) {
        const month = orderDate.toLocaleString('default', { month: 'short' });
        if (!monthlyData[month]) {
          monthlyData[month] = { revenue: 0, clients: new Set(), orders: 0 };
        }
        monthlyData[month].revenue += order.total_amount;
        monthlyData[month].clients.add(order.customer_email);
        monthlyData[month].orders += 1;
      }
    });
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();
    const chartData = Array.from({ length: 6 }, (_, i) => {
      const monthIndex = (currentMonth - 5 + i + 12) % 12;
      const monthName = monthNames[monthIndex];
      return { 
        name: monthName, 
        revenue: monthlyData[monthName]?.revenue || 0,
        clients: monthlyData[monthName]?.clients.size || 0,
        orders: monthlyData[monthName]?.orders || 0,
      };
    });

    setData({ totalRevenue, salesCount, activeProducts, customers: uniqueCustomers, chartData });
    setIsLoading(false);
  }, []);

  return { data, isLoading, fetchData };
};

const Index = () => {
  const { setTitle } = usePageTitle();
  const { shopDetails, convertCurrency } = useShop();
  const { activeJob } = useSync();
  const { data, isLoading, fetchData } = useDashboardData();
  const { runWithIntegrationCheck } = useIntegration(); // Use the integration context

  useEffect(() => {
    setTitle("Dashboard");
  }, [setTitle]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeJob?.status === 'completed') {
      fetchData();
    }
  }, [activeJob?.status, fetchData]);

  // Check for Instagram integration on mount and show prompt if missing
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
        // If no integration, trigger the prompt
        runWithIntegrationCheck(() => {}); // Pass an empty function, the prompt will handle the redirect
      }
    };
    checkIntegrationStatus();
  }, [runWithIntegrationCheck]);


  if (isLoading) {
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
          <StatCard title="Total Revenue" value={formatCurrency(convertCurrency(data.totalRevenue), shopDetails?.currency)} icon={Banknote} description="All-time revenue" />
          <StatCard title="Sales" value={`+${data.salesCount}`} icon={CreditCard} description="All-time sales count" />
          <StatCard title="Active Products" value={data.activeProducts.toString()} icon={Package} description="Products available for sale" />
          <StatCard title="Total Customers" value={data.customers.toString()} icon={Users} description="Unique customers all-time" />
        </div>
        <OverviewChart data={data.chartData} />
      </div>
      <div className="lg:col-span-1 lg:sticky lg:top-0 space-y-6">
        <ActivityFeed />
      </div>
    </div>
  );
};

export default Index;