import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Route-level code splitting — keeps the initial bundle small. The admin
// provider stack + dashboard chrome live in AdminShell (ONE lazy chunk that
// only admin routes pay for); auth pages bring AuthProvider via AuthShell;
// public surfaces (landing, storefronts) ship none of it.
const AdminShell = lazy(() => import("./shells/AdminShell"));
const AuthShell = lazy(() => import("./shells/AuthShell"));
const IgShopShell = lazy(() => import("./shells/IgShopShell"));
const ProtectedRoute = lazy(() => import("./components/layout/ProtectedRoute"));
const SubscriptionGuard = lazy(() => import("./components/layout/SubscriptionGuard"));
const DashboardLayout = lazy(() => import("./components/layout/DashboardLayout"));

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
const InstagramStudio = lazy(() => import("./pages/InstagramStudio"));
// Custom storefront — Storefront Studio (src/storefront)
const StorefrontLayout = lazy(() => import("./storefront/layout/StorefrontLayout"));
const StorefrontIndex = lazy(() => import("./storefront/pages/HomePage").then((m) => ({ default: m.HomePage })));
const StorefrontProductDetail = lazy(() => import("./storefront/pages/ProductDetailPage").then((m) => ({ default: m.ProductDetailPage })));
const StorefrontAllProducts = lazy(() => import("./storefront/pages/ProductsPage").then((m) => ({ default: m.ProductsPage })));
const StorefrontClientOrders = lazy(() => import("./storefront/pages/OrdersPage").then((m) => ({ default: m.OrdersPage })));
const StorefrontCartPage = lazy(() => import("./storefront/pages/CartPage").then((m) => ({ default: m.CartPage })));
const InstagramProfilePage = lazy(() => import("./pages/InstagramProfilePage"));
const InstagramProductsFeedPage = lazy(() => import("./pages/InstagramProductsFeedPage"));

// App-level fallback only fires for the first load of a top-level lazy layout
// (e.g., StorefrontLayout, IgShopShell, or auth pages). Intra-layout
// navigation is caught by Suspense boundaries inside each layout, keeping the
// chrome (sidebar/header) mounted during route transitions.
const RouteFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background/0">
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
  </div>
);

const AppContent = () => {
  const location = useLocation();

  // The prerendered landing snapshot is hidden on non-"/" routes by an inline
  // guard in dist/index.html (see scripts/prerender.mjs). Once React renders
  // the real route into #root, release the guard.
  useEffect(() => {
    document.documentElement.classList.remove("pre-route-hide");
  }, []);

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
        <Route path="/instagramShop/:shopSlug" element={<IgShopShell />}>
          <Route index element={<InstagramProfilePage />} />
          <Route path="products" element={<InstagramProductsFeedPage />} />
          <Route path="products/:productId" element={<InstagramProductsFeedPage />} />
        </Route>

        {/* Public marketing landing */}
        <Route path="/" element={<Landing />} />

        {/* Auth Routes */}
        <Route element={<AuthShell />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/demo-shop" element={<DemoShop />} />

        {/* Protected Dashboard Routes — full provider stack lives in AdminShell */}
        <Route element={<AdminShell />}>
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
                <Route path="/instagram-studio" element={<InstagramStudio />} />
                <Route path="/filters" element={<FilterVisibility />} />
              </Route>
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
  <TooltipProvider>
    <Toaster />
    <Sonner />
    {/* v7 flags opted into early: relativeSplatPath is a no-op here (one splat
        route, every link absolute), and startTransition just wraps navigation
        state updates — verified against the lazy routes + prerender guard. */}
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
