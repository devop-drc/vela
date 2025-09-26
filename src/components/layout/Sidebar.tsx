import { NavLink } from "react-router-dom";
import { Home, ShoppingBag, Settings, Package, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/contexts/AppearanceContext";
import { motion } from "framer-motion";

const Sidebar = () => {
  const { settings } = useAppearance();
  const isFloating = settings.layoutStyle === 'floating';
  const isPrimary = settings.sidebarStyle === 'primary';
  const blurEnabled = settings.blurEnabled;

  const navItems = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/products", icon: Package, label: "Products" },
    { to: "/out-of-stock", icon: Archive, label: "Out of Stock" },
    { to: "/orders", icon: ShoppingBag, label: "Orders" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className={cn(
      "z-30 hidden md:flex flex-col w-64 transition-colors",
      isFloating 
        ? "fixed top-4 left-4 bottom-4 border rounded-lg" 
        : "h-full border-r",
      isPrimary
        ? cn(
            "text-primary-foreground border-primary-foreground/20",
            blurEnabled ? "bg-primary/80 backdrop-blur-lg" : "bg-primary"
          )
        : cn(
            "border-border",
            blurEnabled ? "bg-card/80 backdrop-blur-lg" : "bg-card"
          )
    )}>
      <div className={cn(
        "p-4 border-b flex items-center",
        isPrimary ? 'border-primary-foreground/20' : 'border-border'
      )}>
        <ShoppingBag className="h-6 w-6 mr-2" />
        <h1 className="text-xl font-bold">InstaShopify</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <motion.div key={item.to} whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isPrimary
                    ? "text-primary-foreground/70 hover:bg-primary-foreground/10"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  isActive && (isPrimary
                    ? "bg-primary-foreground/10 text-primary-foreground"
                    : "bg-accent text-accent-foreground")
                )
              }
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.label}
            </NavLink>
          </motion.div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;