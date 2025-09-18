import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BottomNav from "./BottomNav";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { IntegrationPrompt } from "./IntegrationPrompt";
import { AnimatePresence, motion } from "framer-motion";

const DashboardLayout = () => {
  const { title } = usePageTitle();
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header title={title} />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
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
      </div>
      <BottomNav />
      <IntegrationPrompt />
    </div>
  );
};

export default DashboardLayout;