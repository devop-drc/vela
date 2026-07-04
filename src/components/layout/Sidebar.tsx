import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home, Package, Archive, Layers, MessageSquareQuote, Megaphone,
  ShoppingBag, Settings, ChevronsLeft, ChevronsRight, Globe, LogOut, CreditCard, ShieldCheck, HelpCircle,
} from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useTutorial } from "@/components/tutorial/TutorialProvider";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useShop } from "@/contexts/ShopContext";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";

// ── Nav config (uses i18n keys) ─────────────────────────────────────────────

type NavItem = { to: string; icon: typeof Home; labelKey: string; end?: boolean };
type NavDivider = { divider: true; labelKey: string };
type NavEntry = NavItem | NavDivider;

const nav: NavEntry[] = [
  { to: "/dashboard", icon: Home, labelKey: "nav.dashboard", end: true },
  { divider: true, labelKey: "nav_groups.products" },
  { to: "/products", icon: Package, labelKey: "nav.products" },
  { to: "/out-of-stock", icon: Archive, labelKey: "nav.stock" },
  { to: "/categories", icon: Layers, labelKey: "nav.categories" },
  { to: "/keywords", icon: MessageSquareQuote, labelKey: "nav.keywords" },
  { to: "/promotions", icon: Megaphone, labelKey: "nav.promotions" },
  { divider: true, labelKey: "nav_groups.sales" },
  { to: "/orders", icon: ShoppingBag, labelKey: "nav.orders" },
  { divider: true, labelKey: "nav_groups.app" },
  { to: "/billing", icon: CreditCard, labelKey: "nav.billing" },
  { to: "/settings", icon: Settings, labelKey: "nav.settings" },
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
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const { isAdmin } = useIsAdmin();
  const { startTutorial, hasTour } = useTutorial();
  const navEntries: NavEntry[] = isAdmin
    ? [...nav, { to: "/admin", icon: ShieldCheck, labelKey: "nav.admin" }]
    : nav;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
  }, []);

  const floating = settings.layoutStyle === "floating";
  const primary = settings.sidebarStyle === "primary";
  const blur = settings.blurEnabled;
  const width = settings.sidebarWidth || "default";

  const shopName = shopDetails?.shop_name || "InstantShop";
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
          floating ? "fixed top-3 left-3 bottom-3 rounded-lg border shadow-md" : "h-full border-r shadow-sm",
          palette.bg, palette.text, palette.border
        )}
      >
        {/* ── Profile + Collapse toggle ──────────────────────────────── */}
        <div className={cn("shrink-0 border-b", palette.border, collapsed ? "px-2 py-3" : "px-3 py-3")}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={shopDetails?.logo_url || undefined} />
                      <AvatarFallback className={cn("text-xs font-bold", palette.logoBg, primary ? "text-primary-foreground" : "text-primary")}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="text-xs">
                  <p className="font-medium">{shopName}</p>
                  {user?.email && <p className="text-muted-foreground">{user.email}</p>}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onToggleCollapsed}
                    className={cn(
                      "flex items-center justify-center h-8 w-8 rounded-lg border transition-all duration-150",
                      primary
                        ? "border-primary-foreground/15 bg-primary-foreground/8 text-primary-foreground/70 hover:bg-primary-foreground/15 hover:text-primary-foreground"
                        : "border-border bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="text-xs">{t("nav.expand")}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={shopDetails?.logo_url || undefined} />
                <AvatarFallback className={cn("text-xs font-bold", palette.logoBg, primary ? "text-primary-foreground" : "text-primary")}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{shopName}</p>
                <p className={cn("text-[11px] truncate", palette.muted)}>
                  {user?.user_metadata?.full_name || user?.email || ""}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onToggleCollapsed}
                    className={cn(
                      "flex items-center justify-center h-8 w-8 rounded-lg border shrink-0 transition-all duration-150",
                      primary
                        ? "border-primary-foreground/15 bg-primary-foreground/8 text-primary-foreground/70 hover:bg-primary-foreground/15 hover:text-primary-foreground"
                        : "border-border bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="text-xs">{t("nav.collapse")}</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* ── Nav ─────────────────────────────────────────────────────── */}
        <nav data-tour="sidebar-nav" className={cn("flex-1 overflow-y-auto overflow-x-hidden py-2", collapsed ? "px-1.5" : "px-2.5")}>
          {navEntries.map((entry, i) => {
            // Divider
            if ("divider" in entry) {
              if (collapsed) {
                return <div key={`d-${i}`} className={cn("h-px my-2.5 mx-1.5 rounded-full", palette.divider)} />;
              }
              return (
                <p key={`d-${i}`} className={cn("text-[10px] font-semibold uppercase tracking-widest mt-5 mb-1 px-2.5", palette.muted, i === 1 && "mt-2")}>
                  {t(entry.labelKey)}
                </p>
              );
            }

            const { to, icon: Icon, labelKey, end } = entry;
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
                    {t(labelKey)}
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
                <span className="truncate">{t(labelKey)}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className={cn("shrink-0 border-t", palette.border, collapsed ? "px-2 py-2.5" : "px-3 py-3")}>
          {collapsed ? (
            /* ── Collapsed: icon-only stack ─────────────────── */
            <div className="flex flex-col items-center gap-2">
              {/* Language */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => i18n.changeLanguage(i18n.language === "en" ? "sq" : "en")}
                    className={cn(
                      "flex items-center justify-center h-8 w-8 rounded-lg border transition-all duration-150",
                      primary
                        ? "border-primary-foreground/15 bg-primary-foreground/8 text-primary-foreground/70 hover:bg-primary-foreground/15 hover:text-primary-foreground"
                        : "border-border bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Globe className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="text-xs">
                  {i18n.language === "en" ? "Shqip" : "English"}
                </TooltipContent>
              </Tooltip>

              {/* Page tutorial */}
              {hasTour && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={startTutorial}
                      data-tour="tutorial-button"
                      className={cn(
                        "flex items-center justify-center h-8 w-8 rounded-lg border transition-all duration-150",
                        primary
                          ? "border-primary-foreground/15 bg-primary-foreground/8 text-primary-foreground/70 hover:bg-primary-foreground/15 hover:text-primary-foreground"
                          : "border-border bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12} className="text-xs">{i18n.language?.startsWith("sq") ? "Tutorial i faqes" : "Page tutorial"}</TooltipContent>
                </Tooltip>
              )}

              {/* Logout */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
                    className={cn(
                      "flex items-center justify-center h-8 w-8 rounded-lg border transition-all duration-150",
                      primary
                        ? "border-red-400/20 bg-red-500/10 text-red-300 hover:bg-red-500/25 hover:text-red-200"
                        : "border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                    )}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="text-xs">{t("header.log_out")}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            /* ── Expanded: language pill + logout button ─────── */
            <div className="space-y-2.5">
              {/* Language — segmented pill toggle */}
              <div className={cn(
                "flex items-center rounded-lg p-0.5",
                primary ? "bg-primary-foreground/8" : "bg-muted"
              )}>
                <button
                  onClick={() => i18n.changeLanguage("en")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-semibold tracking-wide transition-all duration-150",
                    i18n.language === "en"
                      ? primary
                        ? "bg-primary-foreground/15 text-primary-foreground shadow-sm"
                        : "bg-background text-foreground shadow-sm"
                      : primary
                        ? "text-primary-foreground/50 hover:text-primary-foreground/70"
                        : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  EN
                </button>
                <button
                  onClick={() => i18n.changeLanguage("sq")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-semibold tracking-wide transition-all duration-150",
                    i18n.language === "sq"
                      ? primary
                        ? "bg-primary-foreground/15 text-primary-foreground shadow-sm"
                        : "bg-background text-foreground shadow-sm"
                      : primary
                        ? "text-primary-foreground/50 hover:text-primary-foreground/70"
                        : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  SQ
                </button>
              </div>

              {/* Page tutorial — replay the guided tour for the current page */}
              {hasTour && (
                <button
                  onClick={startTutorial}
                  data-tour="tutorial-button"
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-medium transition-all duration-150",
                    primary
                      ? "border-primary-foreground/15 bg-primary-foreground/8 text-primary-foreground/70 hover:bg-primary-foreground/15 hover:text-primary-foreground"
                      : "border-border bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>{i18n.language?.startsWith("sq") ? "Tutorial i faqes" : "Page tutorial"}</span>
                </button>
              )}

              {/* Logout — bordered button with red tint */}
              <button
                onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-medium transition-all duration-150",
                  primary
                    ? "border-red-400/20 bg-red-500/10 text-red-300 hover:bg-red-500/25 hover:text-red-200"
                    : "border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                )}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{t("header.log_out")}</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
