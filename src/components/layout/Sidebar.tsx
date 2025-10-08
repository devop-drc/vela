import { NavLink } from "react-router-dom";
import { Home, ShoppingBag, Settings, Package, Archive, MessageSquareQuote, Link as LinkIcon, MessageSquareWarning, Megaphone, Sparkles, Users, Store, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/contexts/AppearanceContext";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { useShop } from "@/contexts/ShopContext";
import { showSuccess, showError } from "@/utils/toast";

const Sidebar = () => {
  const { settings } = useAppearance();
  const { shopDetails } = useShop();
  const isFloating = settings.layoutStyle === 'floating';
  const isPrimary = settings.sidebarStyle === 'primary';
  const blurEnabled = settings.blurEnabled;

  const navGroups = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      items: [
        { to: "/", icon: Home, label: "Overview" },
      ]
    },
    {
      name: "Product Management",
      icon: Package,
      items: [
        { to: "/products", icon: Package, label: "All Products" },
        { to: "/out-of-stock", icon: Archive, label: "Out of Stock" },
        { to: "/promotions", icon: Megaphone, label: "Promotions" },
        { to: "/keywords", icon: MessageSquareQuote, label: "AI Keywords" },
      ]
    },
    {
      name: "Customer & Order Management",
      icon: Users,
      items: [
        { to: "/orders", icon: ShoppingBag, label: "Orders" },
        { to: "/disputes", icon: MessageSquareWarning, label: "Disputes" },
      ]
    },
    {
      name: "Store Management",
      icon: Store,
      items: [
        { to: "/settings", icon: Settings, label: "Settings" },
      ]
    }
  ];

  const sidebarWidthClasses = {
    compact: 'w-56', // 224px
    default: 'w-64', // 256px
    spacious: 'w-72', // 288px
  };

  return (
    <aside className={cn(
      "z-30 hidden md:flex flex-col transition-all",
      sidebarWidthClasses[settings.sidebarWidth || 'default'],
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
    )} style={{ '--sidebar-width': sidebarWidthClasses[settings.sidebarWidth || 'default'] } as React.CSSProperties}>
      <div className={cn(
        "p-4 border-b flex items-center",
        isPrimary ? 'border-primary-foreground/20' : 'border-border'
      )}>
        <ShoppingBag className="h-6 w-6 mr-2" />
        <h1 className="text-xl font-bold">InstaShopify</h1>
      </div>
      <nav className="flex-1 p-4 space-y-6"> {/* Increased space-y for groups */}
        {navGroups.map((group) => (
          <div key={group.name}>
            <h2 className={cn(
              "text-xs font-semibold uppercase tracking-wide mb-2 px-4", // Adjusted tracking, mb, and px
              isPrimary ? "text-primary-foreground/60" : "text-muted-foreground"
            )}>
              <group.icon className="inline-block h-4 w-4 mr-2" />
              {group.name}
            </h2>
            <div className="space-y-1">
              {group.items.map((item) => (
                <motion.div key={item.to} whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors", // Adjusted px
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
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;