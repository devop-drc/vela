import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BottomNav from "./BottomNav";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { IntegrationPrompt } from "./IntegrationPrompt";

const DashboardLayout = () => {
  const { title } = usePageTitle();

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header title={title} />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <IntegrationPrompt />
    </div>
  );
};

export default DashboardLayout;