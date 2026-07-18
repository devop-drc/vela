import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2, MessageSquareWarning } from "lucide-react";
import { toast } from "sonner";

import ProtectedRoute from "./components/layout/ProtectedRoute";
import SubscriptionGuard from "./components/layout/SubscriptionGuard";
import DashboardLayout from "./components/layout/DashboardLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { IntegrationProvider } from "./contexts/IntegrationContext";
import { IntegrationPrompt } from "./components/layout/IntegrationPrompt";
import { ShopProvider } from "./contexts/ShopContext";
import { SyncProvider } from "./contexts/syncContext";
import { PageTitleProvider } from "./contexts/PageTitleContext";
import { AppearanceProvider } from "./contexts/AppearanceContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { supabase } from "./integrations/supabase/client";
import { clearAllPageCache } from "./lib/pageCache";

// Route-level code splitting — keeps the initial bundle small.
const Landing = lazy(() => import("./pages/Landing"));
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Products = lazy(() => import("./pages/Products"));
const Orders = lazy(() => import("./pages/Orders"));
const Settings = lazy(() => import("./pages/Settings"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const OutOfStock = lazy(() => import("./pages/OutOfStock"));
const Demo = lazy(() => import("./pages/Demo"));
const DemoShop = lazy(() => import("./pages/DemoShop"));
const Keywords = lazy(() => import("./pages/Keywords"));
const Categories = lazy(() => import("./pages/Categories"));
const Promotions = lazy(() => import("./pages/Promotions"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const FilterVisibility = lazy(() => import("./pages/FilterVisibility"));
const Billing = lazy(() => import("./pages/Billing"));
const Admin = lazy(() => import("./pages/Admin"));
const StorefrontStudioPage = lazy(() => import("./pages/StorefrontStudioPage"));
// Custom storefront — Storefront Studio (src/storefront)
const StorefrontLayout = lazy(() => import("./storefront/layout/StorefrontLayout"));
const StorefrontIndex = lazy(() => import("./storefront/pages/HomePage").then((m) => ({ default: m.HomePage })));
const StorefrontProductDetail = lazy(() => import("./storefront/pages/ProductDetailPage").then((m) => ({ default: m.ProductDetailPage })));
const StorefrontAllProducts = lazy(() => import("./storefront/pages/ProductsPage").then((m) => ({ default: m.ProductsPage })));
const StorefrontClientOrders = lazy(() => import("./storefront/pages/OrdersPage").then((m) => ({ default: m.OrdersPage })));
const StorefrontCartPage = lazy(() => import("./storefront/pages/CartPage").then((m) => ({ default: m.CartPage })));
const InstagramProfilePage = lazy(() => import("./pages/InstagramProfilePage"));
const InstagramProductsFeedPage = lazy(() => import("./pages/InstagramProductsFeedPage"));
const InstagramShopLayout = lazy(() => import("./components/storefront/InstagramShopLayout"));

// App-level fallback only fires for the first load of a top-level lazy layout
// (e.g., StorefrontLayout, InstagramShopLayout, or auth pages). Intra-layout
// navigation is caught by Suspense boundaries inside each layout, keeping the
// chrome (sidebar/header) mounted during route transitions.
const RouteFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background/0">
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
  </div>
);

// Warm up route chunks during browser idle time so the first navigation
// to common destinations is instant (chunk is already cached).
const prefetchRoutes = () => {
  const idle = (cb: () => void) => {
    const w = window as any;
    if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(cb, { timeout: 4000 });
    else setTimeout(cb, 1500);
  };
  idle(() => {
    import("./pages/Products");
    import("./pages/Orders");
    import("./pages/Settings");
  });
};

const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const setupDisputeListener = async () => {
      // getSession() reads from local storage (instant); getUser() hits the network.
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || cancelled) return;

      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (businessError || !business || cancelled) return;

      channel = supabase
        .channel(`order_disputes:${business.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'order_disputes', filter: `business_id=eq.${business.id}` },
          (payload) => {
            interface NewDispute { order_id: string; reason?: string }
            const newDispute = payload.new as NewDispute;
            toast.info(
              <div className="flex items-center gap-2">
                <MessageSquareWarning className="h-5 w-5 text-amber-500" />
                <span>New Client Dispute for Order #{newDispute.order_id.substring(0, 8)}</span>
              </div>,
              {
                description: newDispute.reason,
                action: {
                  label: "View complaint",
                  onClick: () => navigate(`/orders?orderId=${newDispute.order_id}`),
                },
                duration: 10000,
              }
            );
          }
        )
        .subscribe();
    };

    // Defer non-critical subscription to idle so it doesn't compete with first paint.
    const idle = (cb: () => void) => {
      const w = window as any;
      if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(cb, { timeout: 2000 });
      else setTimeout(cb, 500);
    };
    idle(() => { if (!cancelled) setupDisputeListener(); });
    prefetchRoutes();

    // Wipe the instant-display page cache when the account changes, so one user
    // never briefly sees another's cached products/dashboard. A same-user reload
    // keeps its cache (that's the whole point), so we compare the user id rather
    // than clearing on every SIGNED_IN (which fires on ordinary reloads).
    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { clearAllPageCache(); return; }
      const uid = session?.user?.id;
      if (!uid) return;
      try {
        const prev = localStorage.getItem('pgcache-uid');
        if (prev && prev !== uid) clearAllPageCache();
        if (prev !== uid) localStorage.setItem('pgcache-uid', uid);
      } catch { /* storage disabled */ }
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      authSub?.subscription?.unsubscribe();
    };
  }, [navigate]);

  return (
    <ErrorBoundary resetKey={location.pathname}>
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public Storefront Routes */}
        <Route path="/shop/:shopSlug" element={<StorefrontLayout />}>
          <Route index element={<StorefrontIndex />} />
          <Route path="products" element={<StorefrontAllProducts />} />
          <Route path="product/:productId" element={<StorefrontProductDetail />} />
          <Route path="orders" element={<StorefrontClientOrders />} />
          <Route path="cart" element={<StorefrontCartPage />} />
        </Route>
        {/* Instagram Profile Storefront Routes */}
        <Route path="/instagramShop/:shopSlug" element={<InstagramShopLayout />}>
          <Route index element={<InstagramProfilePage />} />
          <Route path="products" element={<InstagramProductsFeedPage />} />
          <Route path="products/:productId" element={<InstagramProductsFeedPage />} />
        </Route>

        {/* Public marketing landing */}
        <Route path="/" element={<Landing />} />

        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/demo-shop" element={<DemoShop />} />

        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            {/* Billing + Admin stay reachable even when the paywall locks the rest */}
            <Route path="/billing" element={<Billing />} />
            <Route path="/admin" element={<Admin />} />
            <Route element={<SubscriptionGuard />}>
              <Route path="/dashboard" element={<Index />} />
              <Route path="/products" element={<Products />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/keywords" element={<Keywords />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/out-of-stock" element={<OutOfStock />} />
              <Route path="/promotions" element={<Promotions />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/storefront-studio" element={<StorefrontStudioPage />} />
              <Route path="/filters" element={<FilterVisibility />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  );
};

const App = () => (
  <AppearanceProvider>
    <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PageTitleProvider>
              <CurrencyProvider>
                <ShopProvider>
                  <SubscriptionProvider>
                    <IntegrationProvider>
                      <SyncProvider>
                        <AppContent />
                        <IntegrationPrompt />
                      </SyncProvider>
                    </IntegrationProvider>
                  </SubscriptionProvider>
                </ShopProvider>
              </CurrencyProvider>
            </PageTitleProvider>
          </AuthProvider>
        </BrowserRouter>
    </TooltipProvider>
  </AppearanceProvider>
);

export default App;
