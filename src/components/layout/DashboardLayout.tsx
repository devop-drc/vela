import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BottomNav from "./BottomNav";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { AnimatePresence, motion } from "framer-motion";
import { useShop } from "@/contexts/ShopContext";
import { useEffect, useState } from "react";
import { SyncStatusWidget } from "./SyncStatusWidget";
import NotificationSidebar from "./NotificationSidebar";
import { useAppearance } from "@/contexts/AppearanceContext";
import { cn } from "@/lib/utils";

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
          if (link) link.href = '/favicon.ico';
          else {
            link = document.createElement('link');
            link.rel = 'icon';
            link.href = '/favicon.ico';
            document.head.appendChild(link);
          }
        }
      };

      setFavicon(shopDetails.favicon_url);
    } else {
      document.title = title; // Fallback if shopDetails not loaded yet
      const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (link) link.href = '/favicon.ico';
    }
  }, [shopDetails, title]);

  const content = (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.25 }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
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

  if (settings.layoutStyle === 'docked') {
    return (
      <div
        className="relative flex h-screen bg-transparent"
        style={{ '--sidebar-width': sidebarWidthValue } as React.CSSProperties}
      >
        <div id="background-overlay" className="fixed inset-0 z-[-1] transition-colors" />
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto transition-all duration-300">
          <Header title={title} />
          <main className="flex-1 p-6">{content}</main>
        </div>
        <SyncStatusWidget />
        <NotificationSidebar />
      </div>
    );
  }

  return (
    <div
      className="relative h-screen bg-transparent"
      style={{ '--sidebar-width': sidebarWidthValue } as React.CSSProperties}
    >
      <div id="background-overlay" className="fixed inset-0 z-[-1] transition-colors" />
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <Header title={title} />
      <main
        className="absolute inset-0 overflow-y-auto px-4 md:px-6 md:pb-4 transition-all duration-300 pt-20"
        style={{ paddingLeft: `calc(var(--sidebar-width) + 1.8rem)` }}
      >
        {content}
      </main>
      <BottomNav />
      <SyncStatusWidget />
      <NotificationSidebar />
    </div>
  );
};

export default DashboardLayout;
