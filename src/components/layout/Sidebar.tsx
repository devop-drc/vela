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
        { to: "/out-of-stock", icon: Archive, label: "Stock" },
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

  // Derive a short initials string for the collapsed logo avatar
  const shopInitials = shopDetails?.name
    ? shopDetails.name.slice(0, 2).toUpperCase()
    : "IS";

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
          "border-b flex items-center transition-all duration-300 shrink-0",
          collapsed ? "justify-center h-[57px] px-2" : "p-4",
          isPrimary ? 'border-primary-foreground/20' : 'border-border'
        )}>
          {collapsed ? (
            /* Collapsed: show a small rounded avatar/icon instead of just the bag */
            <div className={cn(
              "flex items-center justify-center h-8 w-8 rounded-lg text-xs font-bold shrink-0 select-none",
              isPrimary
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-primary text-primary-foreground"
            )}>
              {shopInitials}
            </div>
          ) : (
            <>
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-lg shrink-0",
                isPrimary
                  ? "bg-primary-foreground/20"
                  : "bg-primary/10"
              )}>
                <ShoppingBag className="h-5 w-5 shrink-0" />
              </div>
              <h1 className="text-xl font-bold ml-2 whitespace-nowrap overflow-hidden">InstaShopify</h1>
            </>
          )}
        </div>

        {/* Nav — relative so the overflow gradient can be positioned inside */}
        <div className="relative flex-1 min-h-0">
          <nav className={cn("h-full overflow-y-auto overflow-x-hidden space-y-1", collapsed ? "p-2 pt-4" : "p-3 pt-4")}>
            {navGroups.map((group, groupIndex) => (
              <div key={group.name}>
                {/* Divider between groups (skip before first group) */}
                {groupIndex > 0 && (
                  <div className={cn(
                    "my-3",
                    collapsed ? "mx-1" : "mx-2",
                    isPrimary ? "border-t border-primary-foreground/15" : "border-t border-border"
                  )} />
                )}

                {/* Group header */}
                {!collapsed ? (
                  <h2 className={cn(
                    "text-[10px] font-semibold uppercase tracking-widest mb-1.5 px-3",
                    isPrimary ? "text-primary-foreground/50" : "text-muted-foreground/70"
                  )}>
                    {group.name}
                  </h2>
                ) : (
                  <div className={cn(
                    "flex justify-center mb-1",
                    isPrimary ? "text-primary-foreground/30" : "text-muted-foreground/30"
                  )}>
                    <group.icon className="h-3 w-3" />
                  </div>
                )}

                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    collapsed ? (
                      <Tooltip key={item.to}>
                        <TooltipTrigger asChild>
                          <NavLink
                            to={item.to}
                            end={item.to === "/"}
                            className={({ isActive }) =>
                              cn(
                                "relative flex items-center justify-center p-2 rounded-md text-sm font-medium transition-all duration-150",
                                isPrimary
                                  ? cn(
                                      "text-primary-foreground/60 hover:bg-primary-foreground/15 hover:text-primary-foreground",
                                      isActive && "bg-primary-foreground/15 text-primary-foreground"
                                    )
                                  : cn(
                                      "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                      isActive && "bg-accent text-accent-foreground"
                                    )
                              )
                            }
                          >
                            {({ isActive }) => (
                              <>
                                {/* Active indicator — left bar */}
                                {isActive && (
                                  <span className={cn(
                                    "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full",
                                    isPrimary ? "bg-primary-foreground" : "bg-primary"
                                  )} />
                                )}
                                <item.icon className="h-5 w-5 shrink-0" />
                              </>
                            )}
                          </NavLink>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/"}
                        className={({ isActive }) =>
                          cn(
                            "relative flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 group",
                            isPrimary
                              ? cn(
                                  "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground",
                                  isActive && "bg-primary-foreground/15 text-primary-foreground"
                                )
                              : cn(
                                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                  isActive && "bg-accent text-accent-foreground font-semibold"
                                )
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {/* Active indicator — left bar */}
                            {isActive && (
                              <span className={cn(
                                "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full",
                                isPrimary ? "bg-primary-foreground" : "bg-primary"
                              )} />
                            )}
                            <item.icon className={cn(
                              "mr-3 h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110",
                              isActive && "scale-110"
                            )} />
                            <span className="whitespace-nowrap overflow-hidden">{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    )
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Subtle gradient fade at the bottom to hint at overflow */}
          <div className={cn(
            "pointer-events-none absolute bottom-0 left-0 right-0 h-8",
            isPrimary
              ? "bg-gradient-to-t from-primary/60 to-transparent"
              : "bg-gradient-to-t from-card/80 to-transparent"
          )} />
        </div>

        {/* Collapse toggle — more visible with border + bg */}
        <div className={cn(
          "shrink-0 border-t p-2 flex",
          collapsed ? "justify-center" : "justify-end",
          isPrimary ? "border-primary-foreground/20" : "border-border"
        )}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleCollapsed}
                className={cn(
                  "h-8 w-8 shrink-0 border transition-all duration-150",
                  isPrimary
                    ? "border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground/80 hover:bg-primary-foreground/20 hover:text-primary-foreground hover:border-primary-foreground/40"
                    : "border-border bg-muted/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-border"
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
