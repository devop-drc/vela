import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/layout/DashboardLayout";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import OnboardingGuard from "./components/layout/OnboardingGuard";
import { AppearanceProvider } from "./contexts/AppearanceContext";
import { PageTitleProvider } from "./contexts/PageTitleContext";
import OutOfStock from "./pages/OutOfStock";
import { IntegrationProvider } from "./contexts/IntegrationContext";
import { IntegrationPrompt } from "./components/layout/IntegrationPrompt";
import { ShopProvider } from "./contexts/ShopContext";
import { SyncProvider } from "./contexts/SyncContext";
import Demo from "./pages/Demo";
import Keywords from "./pages/Keywords";
import StorefrontLayout from "./components/storefront/StorefrontLayout";
import StorefrontIndex from "./pages/StorefrontIndex";
import StorefrontProductDetail from "./pages/StorefrontProductDetail";
import StorefrontCart from "./pages/StorefrontCart";
import StorefrontCheckout from "./pages/StorefrontCheckout";
import StorefrontOrderTracking from "./pages/StorefrontOrderTracking";

const queryClient = new QueryClient();

const App = () => (
  <AppearanceProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PageTitleProvider>
            <ShopProvider>
              <IntegrationProvider>
                <SyncProvider>
                  <Routes>
                    {/* Public Storefront Routes */}
                    <Route path="/shop/:businessId" element={<StorefrontLayout />}>
                      <Route index element={<StorefrontIndex />} />
                      <Route path="product/:productId" element={<StorefrontProductDetail />} />
                      <Route path="cart" element={<StorefrontCart />} />
                      <Route path="checkout" element={<StorefrontCheckout />} />
                      <Route path="order-tracking" element={<StorefrontOrderTracking />} />
                    </Route>

                    {/* Existing Dashboard and Auth Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/demo" element={<Demo />} />
                    <Route element={<ProtectedRoute />}>
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route element={<OnboardingGuard />}>
                        <Route element={<DashboardLayout />}>
                          <Route path="/" element={<Index />} />
                          <Route path="/products" element={<Products />} />
                          <Route path="/orders" element={<Orders />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/keywords" element={<Keywords />} />
                          <Route path="/out-of-stock" element={<OutOfStock />} />
                        </Route>
                      </Route>
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <IntegrationPrompt />
                </SyncProvider>
              </IntegrationProvider>
            </ShopProvider>
          </PageTitleProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AppearanceProvider>
);

export default App;