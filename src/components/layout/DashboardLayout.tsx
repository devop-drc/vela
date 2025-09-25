import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BottomNav from "./BottomNav";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { AnimatePresence, motion } from "framer-motion";
import { useShop } from "@/contexts/ShopContext";
import { useEffect } from "react";
import { SyncStatusWidget } from "./SyncStatusWidget";

const DashboardLayout = () => {
  const { title } = usePageTitle();
  const location = useLocation();
  const { shopDetails } = useShop();

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
        // Use a proxy to avoid potential CORS issues and resize for favicon use
        const proxiedFaviconUrl = `https://images.weserv.nl/?url=${encodeURIComponent(shopDetails.favicon_url)}&w=32&h=32&fit=contain&mask=circle`;
        setFavicon(proxiedFaviconUrl);
      }
    }
  }, [shopDetails, title]);

  return (
    <div className="relative h-screen bg-transparent">
      <div id="background-overlay" className="fixed inset-0 z-[-1] bg-background transition-colors" />
      <Sidebar />
      <Header title={title} />
      <main className="absolute inset-0 overflow-y-auto pt-28 px-4 pb-24 md:pb-4 md:pl-[18rem]">
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
      </main>
      <BottomNav />
      <SyncStatusWidget />
    </div>
  );
};

export default DashboardLayout;