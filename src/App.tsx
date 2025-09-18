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
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import OnboardingGuard from "./components/layout/OnboardingGuard";
import { AppearanceProvider } from "./contexts/AppearanceContext";
import { PageTitleProvider } from "./contexts/PageTitleContext";
import OutOfStock from "./pages/OutOfStock";

const queryClient = new QueryClient();

const App = () => (
  <AppearanceProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PageTitleProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/onboarding" element={<Onboarding />} />
                <Route element={<OnboardingGuard />}>
                  <Route element={<DashboardLayout />}>
                    <Route path="/" element={<Index />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/out-of-stock" element={<OutOfStock />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PageTitleProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AppearanceProvider>
);

export default App;