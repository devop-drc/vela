import { NavLink } from "react-router-dom";
import { Home, ShoppingBag, BarChart2, Settings, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const Sidebar = () => {
  const navItems = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/products", icon: Package, label: "Products" },
    { to: "/orders", icon: ShoppingBag, label: "Orders" },
    { to: "/analytics", icon: BarChart2, label: "Analytics" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center">
        <ShoppingBag className="h-6 w-6 mr-2" />
        <h1 className="text-xl font-bold">InstaShopify</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center px-3 py-2 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-800",
                isActive && "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
              )
            }
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;