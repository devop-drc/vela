import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/layout/DashboardLayout";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register"; // Import the new Register page
import ProtectedRoute from "./components/layout/ProtectedRoute";
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
import StorefrontAllProducts from "./pages/StorefrontAllProducts";
import StorefrontClientOrders from "./pages/StorefrontClientOrders";
import Promotions from "./pages/Promotions";
import { useEffect } from "react";
import { supabase } from "./integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquareWarning } from "lucide-react";
import { PageTitleProvider } from "./contexts/PageTitleContext";
import { AppearanceProvider } from "./contexts/AppearanceContext"; // Added missing import

const queryClient = new QueryClient();

const AppContent = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let channel = supabase.channel('dispute-notifications');

    const setupDisputeListener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('user.id', user.id) // Corrected filter to use user.id
        .single();

      if (businessError || !business) {
        console.error("Could not find business for dispute listener:", businessError);
        return;
      }

      channel = supabase
        .channel(`order_disputes:${business.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'order_disputes' },
          (payload) => {
            const newDispute = payload.new as any;
            // Check if the dispute belongs to the current user's business
            // This check is redundant if RLS is correctly applied, but good for safety
            supabase.from('orders').select('business_id').eq('id', newDispute.order_id).single()
              .then(({ data: orderData, error: orderError }) => {
                if (orderError) {
                  console.error("Error fetching order for dispute notification:", orderError);
                  return;
                }
                if (orderData?.business_id === business.id) {
                  toast.info(
                    <div className="flex items-center gap-2">
                      <MessageSquareWarning className="h-5 w-5 text-amber-500" />
                      <span>New Client Dispute for Order #{newDispute.order_id.substring(0, 8)}</span>
                    </div>,
                    {
                      description: newDispute.reason,
                      action: {
                        label: "View complaint",
                        onClick: () => navigate(`/orders?orderId=${newDispute.order_id}`), // Redirect to Orders page and open modal
                      },
                      duration: 10000, // Keep notification for 10 seconds
                    }
                  );
                }
              });
          }
        )
        .subscribe();
    };

    setupDisputeListener();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [navigate]);

  return (
    <Routes>
      {/* Public Storefront Routes */}
      <Route path="/shop/:shopSlug" element={<StorefrontLayout />}>
        <Route index element={<StorefrontIndex />} />
        <Route path="products" element={<StorefrontAllProducts />} />
        <Route path="product/:productId" element={<StorefrontProductDetail />} />
        {/* Consolidated orders page for customers */}
        <Route path="orders" element={<StorefrontClientOrders />} /> 
      </Route>

      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} /> {/* Add Register route */}
      <Route path="/demo" element={<Demo />} />
      
      {/* Protected Dashboard Routes */}
      <Route element={<ProtectedRoute />}>
        {/* Onboarding page and guard are removed */}
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Index />} />
          <Route path="/products" element={<Products />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/keywords" element={<Keywords />} />
          <Route path="/out-of-stock" element={<OutOfStock />} />
          {/* Removed Disputes route */}
          <Route path="/promotions" element={<Promotions />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

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
                  <AppContent />
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