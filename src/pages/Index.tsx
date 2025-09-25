import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Package, Users, CreditCard } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentSales } from "@/components/dashboard/RecentSales";
import { OverviewChart } from "@/components/dashboard/OverviewChart";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";
import { ProfileStats } from "@/components/dashboard/ProfileStats";
import { LatestProducts } from "@/components/dashboard/LatestProducts";
import { TopProducts } from "@/components/dashboard/TopProducts";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";

interface DashboardData {
  totalRevenue: number;
  salesCount: number;
  activeProducts: number;
  customers: number;
  recentOrders: any[];
  chartData: { name: string; total: number }[];
}

const Index = () => {
  const { setTitle } = usePageTitle();
  const { shopDetails, convertCurrency } = useShop();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTitle("Dashboard");
  }, [setTitle]);

  useEffect(() => {
    const fetchData = async () => {
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
      const recentOrders = orders.slice(0, 5);

      const monthlySales: { [key: string]: number } = {};
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      orders.forEach(order => {
        const orderDate = new Date(order.created_at);
        if (orderDate > sixMonthsAgo) {
          const month = orderDate.toLocaleString('default', { month: 'short' });
          monthlySales[month] = (monthlySales[month] || 0) + order.total_amount;
        }
      });
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentMonth = new Date().getMonth();
      const chartData = Array.from({ length: 6 }, (_, i) => {
        const monthIndex = (currentMonth - 5 + i + 12) % 12;
        const monthName = monthNames[monthIndex];
        return { name: monthName, total: monthlySales[monthName] || 0 };
      });

      setData({ totalRevenue, salesCount, activeProducts, customers: uniqueCustomers, recentOrders, chartData });
      setIsLoading(false);
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3"><Skeleton className="lg:col-span-2 h-96" /><Skeleton className="h-96" /></div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3"><Skeleton className="h-80" /><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-10">No data to display. Start by adding some products and orders!</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue" value={formatCurrency(convertCurrency(data.totalRevenue), shopDetails?.currency)} icon={DollarSign} description="All-time revenue" />
        <StatCard title="Sales" value={`+${data.salesCount}`} icon={CreditCard} description="All-time sales count" />
        <StatCard title="Active Products" value={data.activeProducts.toString()} icon={Package} description="Products available for sale" />
        <StatCard title="Unique Customers" value={data.customers.toString()} icon={Users} description="Total unique customers" />
      </div>

      <ActivityFeed />

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OverviewChart data={data.chartData} />
        </div>
        <div className="space-y-4">
          <ProfileStats />
          <LatestProducts />
        </div>
      </div>
      
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentSales orders={data.recentOrders} />
        </div>
        <div className="space-y-4">
          <TopProducts />
          <QuickActions />
        </div>
      </div>
    </div>
  );
};

export default Index;