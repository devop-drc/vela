import { getStorefrontUrl } from "@/lib/storefront";
import { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readCache, writeCache } from "@/lib/pageCache";
import { Banknote, Package, Users, CreditCard, BarChart2, Zap, Star, Activity, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui-app/StatCard";
import { EmptyState, StatusDot } from "@/components/ui-app";
import { useReveal } from "@/lib/anim";
// Lazy-load the chart (recharts is heavy) so the dashboard shell + stats render first.
const OverviewChart = lazy(() => import("@/components/dashboard/OverviewChart").then(m => ({ default: m.OverviewChart })));
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { useShop } from "@/contexts/ShopContext";
import { useSync } from "@/contexts/syncContext";
import { useRealtimeHub } from "@/contexts/RealtimeHubContext";
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

const dashKey = (
  shopDetails: any, dateRange: DateRange | undefined, granularity: string
): string | null =>
  // Date-only (YYYY-MM-DD), NOT full ISO: the default range's `to` is `new
  // Date()` which differs by milliseconds each mount, so a millisecond-precision
  // key would never hit the cache on reload. Day precision is the right grain.
  shopDetails?.id
    ? `dashboard:${shopDetails.id}:${dateRange?.from?.toISOString().slice(0, 10) ?? 'x'}:${dateRange?.to?.toISOString().slice(0, 10) ?? 'x'}:${granularity}`
    : null;

const useDashboardData = (
  shopDetails: any,
  convertCurrency: (amount: number | null | undefined, fromCurrency?: string, toCurrency?: string) => number,
  dateRange: DateRange | undefined,
  granularity: 'day' | 'month'
) => {
  // Seed from the last cached snapshot for this exact filter set → instant
  // render on navigate-back; the fetch below still revalidates.
  const [data, setData] = useState<DashboardData | null>(() => {
    const k = dashKey(shopDetails, dateRange, granularity);
    return k ? (readCache<DashboardData>(k) ?? null) : null;
  });
  const [isLoading, setIsLoading] = useState(() => {
    const k = dashKey(shopDetails, dateRange, granularity);
    return !(k && readCache<DashboardData>(k));
  });
  const [loadError, setLoadError] = useState(false);

  const fetchData = useCallback(async () => {
    if (!shopDetails?.id) {
      setIsLoading(false);
      return;
    }

    const key = dashKey(shopDetails, dateRange, granularity);
    const cachedData = key ? readCache<DashboardData>(key) : undefined;
    // Show cached data instantly and revalidate silently; only show the skeleton
    // when there's nothing cached to display.
    if (cachedData) { setData(cachedData); setIsLoading(false); }
    else setIsLoading(true);
    setLoadError(false);
    const businessId = shopDetails.id;

    // Shared helpers for both the RPC path and the legacy fallback so the
    // chart is built exactly the same way in either case.
    const chartWindow = (firstOrderAt: string | Date | null, lastOrderAt: string | Date | null): [Date, Date] => {
      if (dateRange?.from && dateRange?.to) {
        return [startOfDay(dateRange.from), endOfDay(dateRange.to)];
      }
      if (firstOrderAt && lastOrderAt) {
        return [startOfDay(new Date(firstOrderAt)), endOfDay(new Date(lastOrderAt))];
      }
      const end = endOfDay(new Date());
      return [startOfMonth(subMonths(end, 5)), end];
    };

    const bucketKey = (date: Date) =>
      granularity === 'month'
        ? date.toLocaleString('default', { month: 'short', year: '2-digit' })
        : date.toLocaleString('default', { month: 'short', day: 'numeric' });

    const buildChartSeries = (
      aggregated: { [key: string]: { revenue: number; clients: number; orders: number } },
      chartStartDate: Date,
      chartEndDate: Date
    ) => {
      const chartData: { name: string; revenue: number; clients: number; orders: number }[] = [];
      let currentDate = new Date(chartStartDate);
      while (currentDate <= chartEndDate) {
        const key = bucketKey(currentDate);
        chartData.push({
          name: key,
          revenue: aggregated[key]?.revenue || 0,
          clients: aggregated[key]?.clients || 0,
          orders: aggregated[key]?.orders || 0,
        });
        currentDate = granularity === 'month'
          ? startOfMonth(addDays(endOfMonth(currentDate), 1))
          : addDays(currentDate, 1);
      }
      return chartData;
    };

    // Preferred path: one aggregate RPC instead of downloading every order and
    // product. Revenue comes back as per-currency sums and is converted here
    // with convertCurrency, exactly like the per-order path did.
    const { data: summary, error: rpcError } = await supabase.rpc('get_dashboard_summary', {
      p_business_id: businessId,
      p_from: dateRange?.from ? startOfDay(dateRange.from).toISOString() : null,
      p_to: dateRange?.to ? endOfDay(dateRange.to).toISOString() : null,
      p_granularity: granularity,
      p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    if (!rpcError && summary) {
      const sumRevenue = (byCurrency: Record<string, number> | null | undefined) =>
        Object.entries(byCurrency || {}).reduce(
          (acc, [currency, amount]) => acc + convertCurrency(Number(amount), currency, shopDetails.currency),
          0
        );

      const aggregated: { [key: string]: { revenue: number; clients: number; orders: number } } = {};
      for (const bucket of (summary.chart || [])) {
        const key = bucketKey(new Date(bucket.bucket));
        if (!aggregated[key]) {
          aggregated[key] = { revenue: 0, clients: 0, orders: 0 };
        }
        aggregated[key].revenue += sumRevenue(bucket.revenue);
        aggregated[key].clients += bucket.clients || 0;
        aggregated[key].orders += bucket.orders || 0;
      }

      const [chartStartDate, chartEndDate] = chartWindow(summary.first_order_at, summary.last_order_at);

      const rpcResult: DashboardData = {
        totalRevenue: sumRevenue(summary.total_revenue),
        salesCount: summary.sales_count || 0,
        activeProducts: summary.active_products || 0,
        customers: summary.customers || 0,
        pendingOrders: summary.pending_orders || 0,
        chartData: buildChartSeries(aggregated, chartStartDate, chartEndDate),
      };
      setData(rpcResult);
      if (key) writeCache(key, rpcResult);
      setIsLoading(false);
      return;
    }

    // Fallback: RPC unavailable (e.g. migration not pushed yet) — use the
    // original client-side aggregation path unchanged.
    console.warn('get_dashboard_summary RPC unavailable, falling back to client-side aggregation:', rpcError?.message);

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

    const sortedOrders = allOrders.length > 0
      ? [...allOrders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      : [];
    const [chartStartDate, chartEndDate] = chartWindow(
      sortedOrders[0]?.created_at || null,
      sortedOrders[sortedOrders.length - 1]?.created_at || null
    );

    allOrders.forEach(order => {
      const key = bucketKey(new Date(order.created_at));

      if (!aggregatedData[key]) {
        aggregatedData[key] = { revenue: 0, clients: new Set(), orders: 0 };
      }
      if (order.status === 'Fulfilled' && order.payment_status === 'paid') {
        aggregatedData[key].revenue += convertCurrency(order.total_amount, order.currency, shopDetails.currency);
        aggregatedData[key].clients.add(order.customer_email);
      }
      aggregatedData[key].orders += 1;
    });

    const aggregatedCounts: { [key: string]: { revenue: number; clients: number; orders: number } } = {};
    for (const [key, value] of Object.entries(aggregatedData)) {
      aggregatedCounts[key] = { revenue: value.revenue, clients: value.clients.size, orders: value.orders };
    }
    const chartData = buildChartSeries(aggregatedCounts, chartStartDate, chartEndDate);

    const fallbackResult: DashboardData = { totalRevenue, salesCount, activeProducts, customers: uniqueCustomers, pendingOrders, chartData };
    setData(fallbackResult);
    if (key) writeCache(key, fallbackResult);
    setIsLoading(false);
  }, [shopDetails, convertCurrency, dateRange, granularity]);

  // Latest-ref: fetchData changes identity with every dateRange/granularity/
  // shop-details change; the channel below only needs whichever is current,
  // so the subscription survives those changes instead of rebuilding.
  const fetchDataRef = useRef(fetchData);
  useEffect(() => { fetchDataRef.current = fetchData; });

  // Fetch on mount and whenever the filters change (fetchData encodes them).
  useEffect(() => {
    if (!shopDetails?.id) return;
    fetchData();
  }, [fetchData, shopDetails?.id]);

  const { subscribe } = useRealtimeHub();
  useEffect(() => {
    if (!shopDetails?.id) return;

    // Debounced: a burst of order events (multi-item checkout, status sweep)
    // triggers ONE stats refresh instead of a full dashboard refetch per event.
    let refetchTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribe('orders', () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      refetchTimer = setTimeout(() => fetchDataRef.current(), 1500);
    });

    return () => {
      unsubscribe();
      if (refetchTimer) clearTimeout(refetchTimer);
    };
  }, [shopDetails?.id, subscribe]);

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
    if (!slug) { showError(t("dashboard.share_link_not_ready", "Your shop link isn't ready yet.")); return; }
    const url = getStorefrontUrl(slug, (shopDetails as any)?.storefront_type);
    try {
      await navigator.clipboard.writeText(url);
      showSuccess(t("dashboard.share_link_copied", "Shop link copied to clipboard!"));
    } catch {
      showError(t("dashboard.share_link_copy_failed", "Couldn't copy the link. Please copy it from Settings."));
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

  // Subtle staggered entrance for the main dashboard blocks (GSAP, reduced-motion
  // safe). Re-keyed on isLoading so it fires when real content mounts after load.
  const revealRef = useReveal<HTMLDivElement>({}, [isLoading]);

  if (isLoading) {
    return (
      <div className="lg:h-[calc(100dvh-7rem)] flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-3 w-80" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-7 w-24" /><Skeleton className="h-7 w-20" /><Skeleton className="h-7 w-24" /><Skeleton className="h-7 w-20" />
          </div>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 flex-shrink-0" data-tour="stats">
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
      <EmptyState
        icon={AlertTriangle}
        title={t("dashboard.load_error")}
        action={
          <Button variant="outline" onClick={() => fetchData()}>
            <RefreshCw className="mr-2 h-4 w-4" /> {t("common.retry")}
          </Button>
        }
      />
    );
  }

  if (!data) {
    return (
      <EmptyState icon={BarChart2} title={t("dashboard.no_data")} />
    );
  }

  return (
    <div ref={revealRef} className="lg:h-[calc(100dvh-7rem)] flex flex-col gap-3">
      {/* Welcome Header + Quick Actions on same row */}
      <div data-reveal className="flex items-start justify-between gap-4 flex-wrap flex-shrink-0">
        <WelcomeHeader
          pendingOrders={data.pendingOrders}
          activeProducts={data.activeProducts}
          totalOrders={data.salesCount}
        />
        {/* min-w-0 lets the chip row wrap on phones instead of panning the page */}
        <div className="min-w-0 max-w-full lg:shrink-0" data-tour="quick-actions">
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
      <div data-reveal className="grid gap-3 grid-cols-2 lg:grid-cols-4 flex-shrink-0" data-tour="stats">
        <StatCard
          title={t("dashboard.total_revenue")}
          value={data.totalRevenue}
          formatValue={(n) => formatCurrency(n, shopDetails?.currency)}
          icon={Banknote}
          tone="success"
          to="/orders"
        />
        <StatCard
          title={t("dashboard.sales")}
          value={data.salesCount}
          icon={CreditCard}
          tone="info"
          to="/orders"
        />
        <StatCard
          title={t("dashboard.active_products")}
          value={data.activeProducts}
          icon={Package}
          tone="brand"
          to="/products"
        />
        <StatCard
          title={t("dashboard.total_customers")}
          value={data.customers}
          icon={Users}
          tone="warning"
          to="/orders"
        />
      </div>

      {/* Main area — fills remaining viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Left: Overview Chart (2/3) */}
        <div data-reveal className="lg:col-span-2 flex flex-col min-h-0" data-tour="chart">
          <h2 className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5 flex-shrink-0">
            <BarChart2 className="h-3.5 w-3.5" />{t("dashboard.business_overview")}
          </h2>
          <div className="flex-1 min-h-[320px] lg:min-h-0">
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
        <div data-reveal className="lg:col-span-1 flex flex-col gap-3 min-h-0">
          <div className="flex-shrink-0">
            <h2 className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5" />{t("dashboard.shop_profile")}
            </h2>
            <ProfileStats />
          </div>

          <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:basis-0">
            <h2 className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5 flex-shrink-0">
              <Zap className="h-3.5 w-3.5" />{t("dashboard.top_sellers")}
            </h2>
            <div className="flex-1 min-h-[240px] lg:min-h-0">
              <TopProducts />
            </div>
          </div>

          <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:basis-0" data-tour="activity">
            <h2 className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5 flex-shrink-0">
              <Activity className="h-3.5 w-3.5" />{t("dashboard.live_activity")}
              <StatusDot tone="success" pulse className="ml-0.5" />
            </h2>
            <div className="flex-1 min-h-[240px] lg:min-h-0">
              <ActivityFeed />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
