/**
 * Admin shell — the full provider stack + admin-only bootstrap, loaded as ONE
 * lazy chunk that only admin routes pay for. Before this split, every route
 * (landing, storefronts, login) shipped these providers — plus the Supabase
 * client and the whole dashboard chrome — in the initial bundle.
 */
import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MessageSquareWarning } from "lucide-react";

import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { IntegrationProvider } from "@/contexts/IntegrationContext";
import { IntegrationPrompt } from "@/components/layout/IntegrationPrompt";
import { ShopProvider } from "@/contexts/ShopContext";
import { SyncProvider } from "@/contexts/syncContext";
import { PageTitleProvider } from "@/contexts/PageTitleContext";
import { AppearanceProvider } from "@/contexts/AppearanceContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";
import { clearAllPageCache } from "@/lib/pageCache";

// Warm up route chunks during browser idle time so the first navigation
// to common destinations is instant (chunk is already cached).
const prefetchRoutes = () => {
  const idle = (cb: () => void) => {
    const w = window as any;
    if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(cb, { timeout: 4000 });
    else setTimeout(cb, 1500);
  };
  idle(() => {
    import("@/pages/Products");
    import("@/pages/Orders");
    import("@/pages/Settings");
  });
};

/** Admin-only global effects: dispute toasts + per-account page-cache hygiene. */
const AdminBootstrap = () => {
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
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (businessError || !business || cancelled) return;

      channel = supabase
        .channel(`order_disputes:${business.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "order_disputes", filter: `business_id=eq.${business.id}` },
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
              },
            );
          },
        )
        .subscribe();
    };

    // Defer non-critical subscription to idle so it doesn't compete with first paint.
    const idle = (cb: () => void) => {
      const w = window as any;
      if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(cb, { timeout: 2000 });
      else setTimeout(cb, 500);
    };
    idle(() => { if (!cancelled) setupDisputeListener(); });
    prefetchRoutes();

    // Wipe the instant-display page cache when the account changes, so one user
    // never briefly sees another's cached products/dashboard. A same-user reload
    // keeps its cache (that's the whole point), so we compare the user id rather
    // than clearing on every SIGNED_IN (which fires on ordinary reloads).
    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") { clearAllPageCache(); return; }
      const uid = session?.user?.id;
      if (!uid) return;
      try {
        const prev = localStorage.getItem("pgcache-uid");
        if (prev && prev !== uid) clearAllPageCache();
        if (prev !== uid) localStorage.setItem("pgcache-uid", uid);
      } catch { /* storage disabled */ }
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      authSub?.subscription?.unsubscribe();
    };
  }, [navigate]);

  return null;
};

const AdminShell = () => (
  <AppearanceProvider>
    <AuthProvider>
      <PageTitleProvider>
        <CurrencyProvider>
          <ShopProvider>
            <SubscriptionProvider>
              <IntegrationProvider>
                <SyncProvider>
                  <AdminBootstrap />
                  <Outlet />
                  <IntegrationPrompt />
                </SyncProvider>
              </IntegrationProvider>
            </SubscriptionProvider>
          </ShopProvider>
        </CurrencyProvider>
      </PageTitleProvider>
    </AuthProvider>
  </AppearanceProvider>
);

export default AdminShell;
