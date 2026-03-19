import { NavLink, useLocation } from "react-router-dom";
import {
  Home, Package, Archive, Layers, MessageSquareQuote, Megaphone,
  ShoppingBag, Settings, PanelLeftClose, PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useShop } from "@/contexts/ShopContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ── Nav config ──────────────────────────────────────────────────────────────

type NavItem = { to: string; icon: typeof Home; label: string; end?: boolean };
type NavDivider = { divider: true; label: string };
type NavEntry = NavItem | NavDivider;

const nav: NavEntry[] = [
  { to: "/", icon: Home, label: "Dashboard", end: true },
  { divider: true, label: "Products" },
  { to: "/products", icon: Package, label: "Products" },
  { to: "/out-of-stock", icon: Archive, label: "Stock" },
  { to: "/categories", icon: Layers, label: "Categories" },
  { to: "/keywords", icon: MessageSquareQuote, label: "Keywords" },
  { to: "/promotions", icon: Megaphone, label: "Promotions" },
  { divider: true, label: "Sales" },
  { to: "/orders", icon: ShoppingBag, label: "Orders" },
  { divider: true, label: "App" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

// ── Component ───────────────────────────────────────────────────────────────

interface Props {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapsed }: Props) {
  const { settings } = useAppearance();
  const { shopDetails } = useShop();
  const location = useLocation();

  const floating = settings.layoutStyle === "floating";
  const primary = settings.sidebarStyle === "primary";
  const blur = settings.blurEnabled;
  const width = settings.sidebarWidth || "default";

  const shopName = shopDetails?.shop_name || "InstaShop";
  const initials = shopName.slice(0, 2).toUpperCase();

  // ── Palette ─────────────────────────────────────────────────────────────

  const palette = primary
    ? {
        bg: blur ? "bg-primary/90 backdrop-blur-xl" : "bg-primary",
        text: "text-primary-foreground",
        muted: "text-primary-foreground/45",
        normal: "text-primary-foreground/70",
        active: "text-primary-foreground",
        hover: "hover:bg-primary-foreground/10 hover:text-primary-foreground",
        activeBg: "bg-primary-foreground/15",
        activeRing: "ring-primary-foreground/25",
        border: "border-primary-foreground/10",
        divider: "bg-primary-foreground/10",
        logoBg: "bg-primary-foreground/15",
        toggleBg: "hover:bg-primary-foreground/10",
      }
    : {
        bg: blur ? "bg-card/90 backdrop-blur-xl" : "bg-card",
        text: "",
        muted: "text-muted-foreground/60",
        normal: "text-muted-foreground",
        active: "text-primary",
        hover: "hover:bg-accent hover:text-accent-foreground",
        activeBg: "bg-primary/8",
        activeRing: "ring-primary/20",
        border: "border-border",
        divider: "bg-border",
        logoBg: "bg-primary/10",
        toggleBg: "hover:bg-accent",
      };

  // ── Width classes ─────────────────────────────────────────────────────────

  const widthClass = collapsed
    ? "w-14"
    : width === "compact" ? "w-52" : width === "spacious" ? "w-72" : "w-60";

  // ── Helpers ───────────────────────────────────────────────────────────────

  const isActive = (to: string, end?: boolean) => {
    if (end) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "z-40 hidden md:flex flex-col shrink-0 transition-all duration-300 overflow-hidden",
          widthClass,
          floating ? "fixed top-3 left-3 bottom-3 rounded-lg border shadow-lg" : "h-full border-r",
          palette.bg, palette.text, palette.border
        )}
      >
        {/* ── Logo ────────────────────────────────────────────────────── */}
        <div className={cn("shrink-0 flex items-center h-14 border-b", palette.border, collapsed ? "justify-center px-2" : "px-4 gap-3")}>
          <div className={cn("h-8 w-8 shrink-0 rounded-md flex items-center justify-center text-xs font-bold select-none", palette.logoBg, primary ? "text-primary-foreground" : "text-primary")}>
            {initials}
          </div>
          {!collapsed && <span className="text-sm font-semibold truncate">{shopName}</span>}
        </div>

        {/* ── Nav ─────────────────────────────────────────────────────── */}
        <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden py-2", collapsed ? "px-1.5" : "px-2.5")}>
          {nav.map((entry, i) => {
            // Divider
            if ("divider" in entry) {
              if (collapsed) {
                return <div key={`d-${i}`} className={cn("h-px my-2.5 mx-1.5 rounded-full", palette.divider)} />;
              }
              return (
                <p key={`d-${i}`} className={cn("text-[10px] font-semibold uppercase tracking-widest mt-5 mb-1 px-2.5", palette.muted, i === 1 && "mt-2")}>
                  {entry.label}
                </p>
              );
            }

            const { to, icon: Icon, label, end } = entry;
            const active = isActive(to, end);

            // ── Collapsed link ──────────────────────────────────────
            if (collapsed) {
              return (
                <Tooltip key={to}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={to}
                      end={end}
                      className={cn(
                        "flex items-center justify-center h-9 w-9 mx-auto my-0.5 rounded-md transition-all duration-150",
                        active
                          ? cn(palette.active, palette.activeBg, "ring-2", palette.activeRing, "shadow-sm")
                          : cn(palette.normal, palette.hover)
                      )}
                    >
                      <Icon className="h-[17px] w-[17px]" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12} className="text-xs font-medium">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            // ── Expanded link ───────────────────────────────────────
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-[7px] my-px rounded-md text-sm transition-all duration-150",
                  active
                    ? cn(palette.active, palette.activeBg, "font-medium shadow-sm")
                    : cn(palette.normal, palette.hover)
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active && "scale-[1.05]")} />
                <span className="truncate">{label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* ── Toggle ──────────────────────────────────────────────────── */}
        <div className={cn("shrink-0 border-t px-2 py-2", palette.border)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapsed}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-md py-2 text-xs font-medium transition-all duration-150",
                  palette.normal, palette.toggleBg
                )}
              >
                {collapsed ? <PanelLeft className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /><span>Collapse</span></>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" sideOffset={12} className="text-xs">Expand</TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
