import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BottomNav from "./BottomNav";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { AnimatePresence, motion } from "framer-motion";
import { useShop } from "@/contexts/ShopContext";
import { useEffect } from "react";
import { SyncStatusWidget } from "./SyncStatusWidget";
import { useAppearance } from "@/contexts/AppearanceContext";
import { cn } from "@/lib/utils";

const DashboardLayout = () => {
  const { title } = usePageTitle();
  const location = useLocation();
  const { shopDetails } = useShop();
  const { settings } = useAppearance();

  useEffect(() => {
    if (shopDetails) {
      document.title = `${title} | ${shopDetails.shop_name}`;

      const setFavicon = (url: string) => {
        let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (link) {
          link.href = url;
        } else {
          link = document.createElement('link');
          link.rel = 'icon';
          link.href = url;
          document.head.appendChild(link);
        }
      };

      if (shopDetails.favicon_url) {
        const proxiedFaviconUrl = `https://images.weserv.nl/?url=${encodeURIComponent(shopDetails.favicon_url)}&w=32&h=32&fit=contain&mask=circle`;
        setFavicon(proxiedFaviconUrl);
      }
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

  const mainPaddingClasses = {
    compact: 'md:pl-[calc(14rem+2rem)]', // 224px + 32px padding
    default: 'md:pl-[calc(16rem+2rem)]', // 256px + 32px padding
    spacious: 'md:pl-[calc(18rem+2rem)]', // 288px + 32px padding
  };

  const sidebarWidthValue = settings.sidebarWidth === 'compact' ? '14rem' : settings.sidebarWidth === 'spacious' ? '18rem' : '16rem';

  if (settings.layoutStyle === 'docked') {
    return (
      <div className="relative flex h-screen bg-transparent" style={{ '--sidebar-width': sidebarWidthValue } as React.CSSProperties}>
        <div id="background-overlay" className="fixed inset-0 z-[-1] transition-colors" />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header title={title} />
          <main className="flex-1 overflow-y-auto p-6">{content}</main>
        </div>
        <SyncStatusWidget />
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-transparent" style={{ '--sidebar-width': sidebarWidthValue } as React.CSSProperties}>
      <div id="background-overlay" className="fixed inset-0 z-[-1] transition-colors" />
      <Sidebar />
      <Header title={title} />
      <main className={cn(
        "absolute inset-0 overflow-y-auto pt-28 px-4 pb-24 md:pb-4 transition-all",
        mainPaddingClasses[settings.sidebarWidth || 'default']
      )}>
        {content}
      </main>
      <BottomNav />
      <SyncStatusWidget />
    </div>
  );
};

export default DashboardLayout;