import { NavLink } from "react-router-dom";
import { Home, ShoppingBag, Settings, Package, Archive, MessageSquareQuote, Megaphone, Users, Store, LayoutDashboard, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/contexts/AppearanceContext";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { useShop } from "@/contexts/ShopContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const Sidebar = ({ collapsed, onToggleCollapsed }: SidebarProps) => {
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
        { to: "/categories", icon: Layers, label: "Categories" },
      ]
    },
    {
      name: "Customer & Order Management",
      icon: Users,
      items: [
        { to: "/orders", icon: ShoppingBag, label: "Orders" },
        // Removed Disputes link
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
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "z-30 hidden md:flex flex-col shadow-md transition-all duration-300 ease-in-out overflow-hidden shrink-0",
          collapsed ? "w-[60px]" : sidebarWidthClasses[settings.sidebarWidth || 'default'],
          isFloating
            ? "fixed top-4 left-4 bottom-4 border rounded-lg"
            : "h-full border-r z-50",
          isPrimary
            ? cn(
                "text-primary-foreground border-primary-foreground/20",
                blurEnabled ? "bg-primary/80 backdrop-blur-[20px]" : "bg-primary"
              )
            : cn(
                "border-border",
                blurEnabled ? "bg-card/80 backdrop-blur-[20px]" : "bg-card"
              )
        )}
      >
        {/* Logo area */}
        <div className={cn(
          "border-b flex items-center transition-all duration-300",
          collapsed ? "justify-center h-[57px] px-2" : "p-4",
          isPrimary ? 'border-primary-foreground/20' : 'border-border'
        )}>
          <ShoppingBag className="h-6 w-6 shrink-0" />
          {!collapsed && (
            <h1 className="text-xl font-bold ml-2 whitespace-nowrap overflow-hidden">InstaShopify</h1>
          )}
        </div>

        {/* Nav */}
        <nav className={cn("flex-1 space-y-6 overflow-y-auto overflow-x-hidden", collapsed ? "p-2 pt-4" : "p-4")}>
          {navGroups.map((group) => (
            <div key={group.name}>
              {/* Group header */}
              {!collapsed ? (
                <h2 className={cn(
                  "text-xs font-semibold uppercase tracking-wide mb-2 px-4",
                  isPrimary ? "text-primary-foreground/60" : "text-muted-foreground"
                )}>
                  <group.icon className="inline-block h-4 w-4 mr-2" />
                  {group.name}
                </h2>
              ) : (
                <div className={cn(
                  "flex justify-center mb-2",
                  isPrimary ? "text-primary-foreground/40" : "text-muted-foreground/40"
                )}>
                  <group.icon className="h-3 w-3" />
                </div>
              )}

              <div className="space-y-1">
                {group.items.map((item) => (
                  collapsed ? (
                    <Tooltip key={item.to}>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={item.to}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center justify-center p-2 rounded-md text-sm font-medium transition-colors",
                              isPrimary
                                ? "text-primary-foreground/70 hover:bg-primary-foreground/10"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                              isActive && (isPrimary
                                ? "bg-primary-foreground/10 text-primary-foreground"
                                : "bg-accent text-accent-foreground")
                            )
                          }
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <motion.div key={item.to} whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors",
                            isPrimary
                              ? "text-primary-foreground/70 hover:bg-primary-foreground/10"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                            isActive && (isPrimary
                              ? "bg-primary-foreground/10 text-primary-foreground"
                              : "bg-accent text-accent-foreground")
                          )
                        }
                      >
                        <item.icon className="mr-3 h-5 w-5 shrink-0" />
                        <span className="whitespace-nowrap overflow-hidden">{item.label}</span>
                      </NavLink>
                    </motion.div>
                  )
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className={cn(
          "border-t p-2 flex",
          collapsed ? "justify-center" : "justify-end",
          isPrimary ? "border-primary-foreground/20" : "border-border"
        )}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapsed}
                className={cn(
                  "h-8 w-8 shrink-0",
                  isPrimary
                    ? "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default Sidebar;
