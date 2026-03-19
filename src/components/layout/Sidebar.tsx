import { NavLink } from "react-router-dom";
import { Home, ShoppingBag, Settings, Package, Archive, MessageSquareQuote, Megaphone, Users, Store, LayoutDashboard, Layers, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useShop } from "@/contexts/ShopContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const navItems = [
  { to: "/", icon: Home, label: "Dashboard", end: true },
  { type: "divider" as const, label: "Products" },
  { to: "/products", icon: Package, label: "Products" },
  { to: "/out-of-stock", icon: Archive, label: "Stock" },
  { to: "/categories", icon: Layers, label: "Categories" },
  { to: "/keywords", icon: MessageSquareQuote, label: "AI Keywords" },
  { to: "/promotions", icon: Megaphone, label: "Promotions" },
  { type: "divider" as const, label: "Sales" },
  { to: "/orders", icon: ShoppingBag, label: "Orders" },
  { type: "divider" as const, label: "Settings" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const Sidebar = ({ collapsed, onToggleCollapsed }: SidebarProps) => {
  const { settings } = useAppearance();
  const { shopDetails } = useShop();
  const isFloating = settings.layoutStyle === 'floating';
  const isPrimary = settings.sidebarStyle === 'primary';
  const blurEnabled = settings.blurEnabled;

  const shopName = shopDetails?.shop_name || "InstaShop";
  const shopInitials = shopName.slice(0, 2).toUpperCase();

  const textMuted = isPrimary ? "text-primary-foreground/50" : "text-muted-foreground";
  const textNormal = isPrimary ? "text-primary-foreground/70" : "text-muted-foreground";
  const textActive = isPrimary ? "text-primary-foreground" : "text-foreground";
  const hoverBg = isPrimary ? "hover:bg-primary-foreground/10" : "hover:bg-accent";
  const activeBg = isPrimary ? "bg-primary-foreground/15" : "bg-accent";
  const activeBar = isPrimary ? "bg-primary-foreground" : "bg-primary";
  const borderColor = isPrimary ? "border-primary-foreground/15" : "border-border/50";

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={cn(
          "z-40 hidden md:flex flex-col transition-all duration-300 ease-in-out overflow-hidden shrink-0",
          collapsed ? "w-[56px]" : (settings.sidebarWidth === 'compact' ? 'w-52' : settings.sidebarWidth === 'spacious' ? 'w-72' : 'w-60'),
          isFloating ? "fixed top-3 left-3 bottom-3 rounded-lg border shadow-lg" : "h-full border-r",
          isPrimary
            ? cn(blurEnabled ? "bg-primary/90 backdrop-blur-xl" : "bg-primary", "text-primary-foreground")
            : cn(blurEnabled ? "bg-card/90 backdrop-blur-xl" : "bg-card", "border-border")
        )}
      >
        {/* Logo */}
        <div className={cn("shrink-0 flex items-center border-b px-3", borderColor, collapsed ? "justify-center h-14" : "h-14 gap-2.5")}>
          <div className={cn(
            "flex items-center justify-center shrink-0 rounded-md font-bold text-xs select-none",
            collapsed ? "h-8 w-8" : "h-8 w-8",
            isPrimary ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"
          )}>
            {shopInitials}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold truncate">{shopName}</h1>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden py-2", collapsed ? "px-1" : "px-2")}>
          {navItems.map((item, i) => {
            if ('type' in item && item.type === 'divider') {
              if (collapsed) {
                return <div key={i} className={cn("my-2 mx-2 border-t", borderColor)} />;
              }
              return (
                <div key={i} className={cn("mt-4 mb-1.5 px-3", i === 0 && "mt-1")}>
                  <span className={cn("text-[10px] font-semibold uppercase tracking-widest", textMuted)}>{item.label}</span>
                </div>
              );
            }

            const { to, icon: Icon, label, end } = item as { to: string; icon: any; label: string; end?: boolean };

            if (collapsed) {
              return (
                <Tooltip key={to}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={to}
                      end={end}
                      className={({ isActive }) => cn(
                        "relative flex items-center justify-center h-9 my-0.5 rounded-md transition-all duration-150",
                        textNormal, hoverBg, "hover:text-foreground",
                        isActive && cn(textActive, activeBg)
                      )}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && <span className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 rounded-r-full", activeBar)} />}
                          <Icon className="h-4 w-4" />
                        </>
                      )}
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10} className="text-xs">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cn(
                  "relative flex items-center gap-2.5 px-3 py-2 my-0.5 rounded-md text-sm transition-all duration-150",
                  textNormal, hoverBg,
                  isActive && cn(textActive, activeBg, "font-medium")
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-5 rounded-r-full", activeBar)} />}
                    <Icon className={cn("h-4 w-4 shrink-0", isActive && "scale-105")} />
                    <span className="truncate">{label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className={cn("shrink-0 border-t px-2 py-2", borderColor)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapsed}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-md py-2 text-xs font-medium transition-all duration-150",
                  isPrimary
                    ? "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {collapsed ? (
                  <PanelLeft className="h-4 w-4" />
                ) : (
                  <>
                    <PanelLeftClose className="h-4 w-4" />
                    <span>Collapse</span>
                  </>
                )}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" sideOffset={10} className="text-xs">
                Expand sidebar
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default Sidebar;
