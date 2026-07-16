import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BottomNav from "./BottomNav";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { motion } from "framer-motion";
import { useShop } from "@/contexts/ShopContext";
import { Suspense, useEffect, useState } from "react";
import { SyncStatusWidget } from "./SyncStatusWidget";
import NotificationSidebar from "./NotificationSidebar";
import { VelaChat } from "@/components/VelaChat";
import { useAppearance } from "@/contexts/AppearanceContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TutorialProvider } from "@/components/tutorial/TutorialProvider";
import { LanguagePromptModal } from "@/components/layout/LanguagePromptModal";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

const DashboardLayout = () => {
  const { title } = usePageTitle();
  const location = useLocation();
  const { shopDetails } = useShop();
  const { settings } = useAppearance();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Warm the most-visited route chunks once the browser is idle so sidebar
  // navigation is instant (no lazy-chunk spinner on first visit).
  useEffect(() => {
    const warm = () => {
      import("@/pages/Products");
      import("@/pages/Orders");
      import("@/pages/Settings");
      import("@/pages/Categories");
      import("@/pages/Promotions");
    };
    const w = window as any;
    const id = typeof w.requestIdleCallback === "function"
      ? w.requestIdleCallback(warm, { timeout: 5000 })
      : setTimeout(warm, 2500);
    return () => {
      if (typeof w.cancelIdleCallback === "function") w.cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch { }
      return next;
    });
  };

  useEffect(() => {
    if (shopDetails) {
      document.title = `${title} | ${shopDetails.shop_name}`;

      const setFavicon = (url: string | null) => {
        let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (url) {
          if (link) {
            link.href = url;
          } else {
            link = document.createElement('link');
            link.rel = 'icon';
            link.href = url;
            document.head.appendChild(link);
          }
        } else {
          // Fallback to default favicon if none is provided
          if (link) link.href = '/favicon.svg';
          else {
            link = document.createElement('link');
            link.rel = 'icon';
            link.href = '/favicon.svg';
            document.head.appendChild(link);
          }
        }
      };

      setFavicon(shopDetails.favicon_url);
    } else {
      document.title = title; // Fallback if shopDetails not loaded yet
      const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (link) link.href = '/favicon.svg';
    }
  }, [shopDetails, title]);

  // Suspense lives inside the layout so the sidebar/header stay mounted while
  // a lazy route chunk loads. Without it, navigation drops to the App-level
  // fallback and feels like a full page reload.
  const pageFallback = (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-7 w-64" />
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-[78px]" />
        <Skeleton className="h-[78px]" />
        <Skeleton className="h-[78px]" />
        <Skeleton className="h-[78px]" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );

  // Fast opacity fade on route change (no exit-then-enter serialization) so
  // navigation feels instant in this productivity app.
  const content = (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
    >
      <Suspense fallback={pageFallback}>
        <Outlet />
      </Suspense>
    </motion.div>
  );

  // Must match Sidebar.tsx: w-14 (56px), w-52 (208px), w-60 (240px), w-72 (288px)
  const sidebarWidthValue = collapsed
    ? '3.5rem'     // 56px = w-14
    : settings.sidebarWidth === 'compact'
      ? '13rem'    // 208px = w-52
      : settings.sidebarWidth === 'spacious'
        ? '18rem'  // 288px = w-72
        : '15rem'; // 240px = w-60

  // Floating layout: main content left padding = sidebar left-offset + sidebar-width + gap
  // sidebar at left-3 (0.75rem), gap = 0.75rem
  // So: pl = 0.75rem + sidebar-width + 0.75rem = sidebar-width + 1.5rem

  // Single standard Vela layout: fixed sidebar (md+) + sticky header + scrolling
  // main, with BottomNav for mobile (where the sidebar is hidden). The old
  // floating/primary/blur variants were removed with app theme customisation.
  return (
    <div
      className="relative flex h-screen bg-transparent"
      style={{ '--sidebar-width': sidebarWidthValue } as React.CSSProperties}
    >
      <div id="background-overlay" className="fixed inset-0 z-[-1] transition-colors" />
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto transition-all duration-300">
        <Header title={title} />
        {/* pb-24 clears the mobile BottomNav + floating dock; md resets it. */}
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{content}</main>
      </div>
      <BottomNav />
      <div className="fixed bottom-24 right-4 z-50 flex items-center gap-2 md:bottom-4">
        <VelaChat />
        <SyncStatusWidget />
        <NotificationSidebar />
      </div>
    </div>
  );
};

// Tours wrap the whole admin: autoplay on first visit per page + the sidebar's
// "Page tutorial" button (see TutorialProvider).
const DashboardLayoutWithTutorial = () => (
  <TutorialProvider>
    <LanguagePromptModal />
    <DashboardLayout />
  </TutorialProvider>
);

export default DashboardLayoutWithTutorial;
