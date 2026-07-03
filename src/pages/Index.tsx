import { getStorefrontUrl } from "@/lib/storefront";
import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Banknote, Package, Users, CreditCard, BarChart2, Zap, Star, Activity, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
// Lazy-load the chart (recharts is heavy) so the dashboard shell + stats render first.
const OverviewChart = lazy(() => import("@/components/dashboard/OverviewChart").then(m => ({ default: m.OverviewChart })));
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
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import { showSuccess, showError } from "@/utils/toast";
import { GetStartedCard } from "@/components/dashboard/GetStartedCard";
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
  const [loadError, setLoadError] = useState(false);

  const fetchData = useCallback(async () => {
    if (!shopDetails?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(false);
    const businessId = shopDetails.id;

    let ordersQuery = supabase
      .from('orders')
      .select('total_amount, customer_name, customer_email, created_at, id, status, currency, payment_status')
      .eq('business_id', businessId);

    if (dateRange?.from) {
      ordersQuery = ordersQuery.gte('created_at', startOfDay(dateRange.from).toISOString());
    }
    if (dateRange?.to) {
      ordersQuery = ordersQuery.lte('created_at', endOfDay(dateRange.to).toISOString());
    }

    const [ordersRes, productsRes] = await Promise.all([
      ordersQuery.order('created_at', { ascending: false }),
      supabase.from('products').select('status').eq('business_id', businessId)
    ]);

    if (ordersRes.error || productsRes.error) {
      console.error("Error fetching data:", ordersRes.error, productsRes.error);
      setLoadError(true);
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
    if (!shopDetails?.id) return;
    const businessId = shopDetails.id;

    fetchData();

    const channel = supabase
      .channel(`dashboard-orders:${businessId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` },
        () => { fetchData(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, shopDetails?.id]);

  return { data, isLoading, loadError, fetchData };
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
  const { data, isLoading: isDashboardDataLoading, loadError, fetchData } = useDashboardData(shopDetails, convertCurrency, dateRange, granularity);
  const { runWithIntegrationCheck } = useIntegration();
  const navigate = useNavigate();
  const [hasIntegration, setHasIntegration] = useState(false);

  const handleShareShop = async () => {
    const slug = (shopDetails as any)?.slug;
    if (!slug) { showError("Your shop link isn't ready yet."); return; }
    const url = getStorefrontUrl(slug, (shopDetails as any)?.storefront_type);
    try {
      await navigator.clipboard.writeText(url);
      showSuccess("Shop link copied to clipboard!");
    } catch {
      showError("Couldn't copy the link. Please copy it from Settings.");
    }
  };
  const { t } = useTranslation();

  useEffect(() => {
    setTitle(t("nav.dashboard"));
  }, [setTitle, t]);

  useEffect(() => {
    if (activeJob?.status === 'completed') {
      fetchData();
      fetchShopDetails();
    }
  }, [activeJob?.status, fetchData, fetchShopDetails]);

  useEffect(() => {
    if (!shopDetails?.userId) return;
    const checkIntegrationStatus = async () => {
      const { data: integration, error } = await supabase
        .from('integrations')
        .select('id')
        .eq('user_id', shopDetails.userId)
        .eq('provider', 'facebook')
        .maybeSingle();

      if (error) {
        console.error("Error checking integration status:", error);
        return;
      }

      setHasIntegration(!!integration);
    };
    checkIntegrationStatus();
  }, [shopDetails?.userId]);

  // Show feedback after returning from the Instagram/Facebook OAuth redirect.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('integration_success') === 'true') {
      showSuccess(t("dashboard.ig_connected", "Instagram connected! You can now import your posts as products."));
      searchParams.delete('integration_success');
      setSearchParams(searchParams, { replace: true });
      fetchShopDetails();
    } else if (searchParams.get('integration_error')) {
      const msg = searchParams.get('integration_error') || '';
      showError(t("dashboard.ig_connect_failed", "Couldn't connect Instagram.") + (msg ? ` ${msg}` : ''));
      searchParams.delete('integration_error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, fetchShopDetails, t]);

  const isLoading = isShopLoading || isDashboardDataLoading;

  if (isLoading) {
    return (
      <div className="lg:h-[calc(100vh-7rem)] flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-3 w-80" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-7 w-24" /><Skeleton className="h-7 w-20" /><Skeleton className="h-7 w-24" /><Skeleton className="h-7 w-20" />
          </div>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 flex-shrink-0">
          <Skeleton className="h-[78px]" /><Skeleton className="h-[78px]" /><Skeleton className="h-[78px]" /><Skeleton className="h-[78px]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
          <Skeleton className="lg:col-span-2 h-full w-full" />
          <div className="lg:col-span-1 flex flex-col gap-3 min-h-0">
            <Skeleton className="h-[120px] w-full flex-shrink-0" />
            <Skeleton className="flex-1 w-full min-h-0" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="text-muted-foreground max-w-sm">{t("dashboard.load_error")}</p>
        <Button variant="outline" onClick={() => fetchData()}>
          <RefreshCw className="mr-2 h-4 w-4" /> {t("common.retry")}
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-10">
        {t("dashboard.no_data")}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Welcome Header + Quick Actions on same row */}
      <div className="flex items-start justify-between gap-4 flex-wrap flex-shrink-0">
        <WelcomeHeader
          pendingOrders={data.pendingOrders}
          activeProducts={data.activeProducts}
          totalOrders={data.salesCount}
        />
        <div className="shrink-0">
          <QuickActions />
        </div>
      </div>

      {/* First-run guidance: shown until the shop has live products */}
      {data.activeProducts === 0 && (
        <GetStartedCard
          hasIntegration={hasIntegration}
          hasProducts={data.activeProducts > 0}
          canShare={!!(shopDetails as any)?.slug}
          onConnect={() => runWithIntegrationCheck(() => {})}
          onAddProducts={() => navigate('/products')}
          onShare={handleShareShop}
        />
      )}

      {/* Stat Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 flex-shrink-0">
        <StatCard
          title={t("dashboard.total_revenue")}
          value={formatCurrency(data.totalRevenue, shopDetails?.currency)}
          icon={Banknote}
          color="emerald"
          to="/orders"
        />
        <StatCard
          title={t("dashboard.sales")}
          value={`${data.salesCount}`}
          icon={CreditCard}
          color="blue"
          to="/orders"
        />
        <StatCard
          title={t("dashboard.active_products")}
          value={data.activeProducts.toString()}
          icon={Package}
          color="violet"
          to="/products"
        />
        <StatCard
          title={t("dashboard.total_customers")}
          value={data.customers.toString()}
          icon={Users}
          color="amber"
          to="/orders"
        />
      </div>

      {/* Main area — fills remaining viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Left: Overview Chart (2/3) */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <h2 className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5 flex-shrink-0">
            <BarChart2 className="h-3.5 w-3.5" />{t("dashboard.business_overview")}
          </h2>
          <div className="flex-1 min-h-0">
            <Suspense fallback={<Skeleton className="h-full w-full min-h-[280px]" />}>
              <OverviewChart
                data={data.chartData}
                dateRange={dateRange}
                setDateRange={setDateRange}
                granularity={granularity}
                setGranularity={setGranularity}
              />
            </Suspense>
          </div>
        </div>

        {/* Right: Profile (fixed) + Top Products (flex) + Activity (flex) */}
        <div className="lg:col-span-1 flex flex-col gap-3 min-h-0">
          <div className="flex-shrink-0">
            <h2 className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5" />{t("dashboard.shop_profile")}
            </h2>
            <ProfileStats />
          </div>

          <div className="flex flex-col min-h-0 flex-1 basis-0">
            <h2 className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5 flex-shrink-0">
              <Zap className="h-3.5 w-3.5" />{t("dashboard.top_sellers")}
            </h2>
            <div className="flex-1 min-h-0">
              <TopProducts />
            </div>
          </div>

          <div className="flex flex-col min-h-0 flex-1 basis-0">
            <h2 className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5 flex-shrink-0">
              <Activity className="h-3.5 w-3.5" />{t("dashboard.live_activity")}
            </h2>
            <div className="flex-1 min-h-0">
              <ActivityFeed />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
