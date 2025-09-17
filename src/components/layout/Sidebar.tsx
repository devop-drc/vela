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
    <aside className="hidden md:flex md:flex-col md:w-64 bg-primary text-primary-foreground">
      <div className="p-4 border-b border-primary-foreground/10 flex items-center">
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
                "flex items-center px-3 py-2 text-primary-foreground/70 rounded-lg text-sm font-medium hover:bg-primary-foreground/10",
                isActive && "bg-primary-foreground/10 text-primary-foreground"
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