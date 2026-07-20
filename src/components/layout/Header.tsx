import { getStorefrontUrl } from "@/lib/storefront";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useShop } from "@/contexts/ShopContext";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search, Link as LinkIcon,
  Sparkles, Package, LayoutDashboard, ShoppingCart,
  Settings as SettingsIcon, CreditCard, LogOut, Languages, ChevronDown,
  Sun, Moon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppTheme, setAppTheme } from "@/lib/appTheme";

// ── Types ────────────────────────────────────────────────────────────────────

type SearchResult = { kind: "page" | "product" | "order"; id: string; label: string; subtitle: string; path: string };
interface GroupedResults { pages: SearchResult[]; products: SearchResult[]; orders: SearchResult[] }

const PAGES = [
  { labelKey: "nav.dashboard", subtitleKey: "header.page_dashboard_sub", path: "/dashboard" },
  { labelKey: "nav.products", subtitleKey: "header.page_products_sub", path: "/products" },
  { labelKey: "nav.stock", subtitleKey: "header.page_stock_sub", path: "/out-of-stock" },
  { labelKey: "nav.orders", subtitleKey: "header.page_orders_sub", path: "/orders" },
  { labelKey: "nav.categories", subtitleKey: "header.page_categories_sub", path: "/categories" },
  { labelKey: "nav.keywords", subtitleKey: "header.page_keywords_sub", path: "/keywords" },
  { labelKey: "nav.promotions", subtitleKey: "header.page_promotions_sub", path: "/promotions" },
  { labelKey: "nav.storefront", subtitleKey: "header.page_storefront_sub", path: "/storefront-studio" },
  { labelKey: "nav.settings", subtitleKey: "header.page_settings_sub", path: "/settings" },
];

const GROUP_ICONS: Record<string, React.ReactNode> = {
  pages: <LayoutDashboard className="h-4 w-4 text-muted-foreground shrink-0" />,
  products: <Package className="h-4 w-4 text-muted-foreground shrink-0" />,
  orders: <ShoppingCart className="h-4 w-4 text-muted-foreground shrink-0" />,
};

// ── Component ────────────────────────────────────────────────────────────────

export default function Header({ title }: { title: string }) {
  const navigate = useNavigate();
  const { settings } = useAppearance();
  const { shopDetails } = useShop();
  const { t, i18n } = useTranslation();
  const appTheme = useAppTheme();

  const floating = settings.layoutStyle === "floating";
  const blur = settings.blurEnabled;

  // ── User ─────────────────────────────────────────────────────────────────
  const { user } = useAuth();
  const accountName = shopDetails?.shop_name || user?.email || "";
  const initials = (accountName || "V").trim().slice(0, 2).toUpperCase();
  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };

  // ── Search ───────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [grouped, setGrouped] = useState<GroupedResults | null>(null);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const refs = useRef(new Map<number, HTMLDivElement>());

  const flat = useMemo<SearchResult[]>(() => grouped ? [...grouped.pages, ...grouped.products, ...grouped.orders] : [], [grouped]);
  const hasResults = flat.length > 0;

  useEffect(() => {
    if (!query.trim()) { setGrouped(null); setOpen(false); setActive(-1); return; }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const q = query.toLowerCase();
      const pages: SearchResult[] = PAGES.filter(p => t(p.labelKey).toLowerCase().includes(q)).slice(0, 5).map(p => ({ kind: "page", id: p.path, label: t(p.labelKey), subtitle: t(p.subtitleKey), path: p.path }));
      let products: SearchResult[] = [];
      let orders: SearchResult[] = [];
      try {
        const { data } = await supabase.from("products").select("id, name, category").or(`name.ilike.%${query}%,category.ilike.%${query}%`).limit(5);
        products = (data || []).map((p: any) => ({ kind: "product", id: p.id, label: p.name, subtitle: p.category || t("misc.product", "Product"), path: `/products?openProduct=${p.id}` }));
      } catch { }
      try {
        const { data } = await supabase.from("orders").select("id, customer_name, customer_email, status").or(`customer_name.ilike.%${query}%,customer_email.ilike.%${query}%`).limit(5);
        orders = (data || []).map((o: any) => ({ kind: "order", id: o.id, label: o.customer_name || o.customer_email || t("orders.order", "Order"), subtitle: o.status ? t('notifications.status_' + String(o.status).toLowerCase().replace(/\s+/g, '_'), { defaultValue: o.status }) : t("orders.order", "Order"), path: `/orders?orderId=${o.id}` }));
      } catch { }
      if (!cancelled) { setGrouped({ pages, products, orders }); setOpen(true); setActive(-1); refs.current.clear(); }
      if (!cancelled) setLoading(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    if (!open || !containerRef.current) return;
    const update = () => { const r = containerRef.current!.getBoundingClientRect(); setRect({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 360) }); };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [open, grouped]);

  // ⌘K / Ctrl-K focuses search from anywhere — a small command-palette touch.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const go = useCallback((item: SearchResult) => { navigate(item.path); setOpen(false); setQuery(""); }, [navigate]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); const n = Math.min(flat.length - 1, active + 1); setActive(n); refs.current.get(n)?.scrollIntoView({ block: "nearest" }); }
    else if (e.key === "ArrowUp") { e.preventDefault(); const n = Math.max(0, active - 1); setActive(n); refs.current.get(n)?.scrollIntoView({ block: "nearest" }); }
    else if (e.key === "Enter") { e.preventDefault(); const item = active >= 0 ? flat[active] : flat[0]; if (item) go(item); }
    else if (e.key === "Escape") setOpen(false);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  let idx = 0;
  const renderGroup = (groupKey: string, items: SearchResult[]) => {
    if (!items.length) return null;
    const groupLabelKey = `header.search_${groupKey}`;
    return (
      <div key={groupKey}>
        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t(groupLabelKey)}</p>
        {items.map(item => {
          const i = idx++;
          return (
            <div key={item.id} ref={el => { if (el) refs.current.set(i, el); }}
              className={cn("flex items-center gap-2.5 mx-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors", i === active ? "bg-accent text-accent-foreground" : "hover:bg-muted")}
              onMouseEnter={() => setActive(i)} onMouseDown={e => { e.preventDefault(); go(item); }}>
              {GROUP_ICONS[groupKey]}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.label}</p>
                <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const copyUrl = async () => {
    if (!shopDetails?.slug) { showError(t("header.set_shop_name_first", "Set your shop name in settings first.")); return; }
    try { await navigator.clipboard.writeText(getStorefrontUrl(shopDetails.slug, shopDetails.storefront_type)); showSuccess(t("header.url_copied", "URL copied!")); }
    catch { showError(t("header.copy_failed", "Copy failed.")); }
  };

  // ── JSX ──────────────────────────────────────────────────────────────────

  return (
    <header
      className={cn(
        "z-50 flex items-center gap-4 h-14 min-h-14 px-5 transition-all duration-300",
        floating ? "fixed top-3 right-3 border rounded-lg shadow-md" : "sticky top-0 border-b shadow-sm shrink-0",
        blur ? "bg-card/80 backdrop-blur-xl" : "bg-card",
      )}
      style={floating ? { left: "calc(var(--sidebar-width, 16rem) + 0.75rem + 0.75rem)" } : undefined}
    >
      {/* Title */}
      <h1 className="text-lg font-bold hidden md:block shrink-0">{title}</h1>

      {/* Search */}
      <div ref={containerRef} className="relative w-64 lg:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="search" placeholder={t("header.search_placeholder")}
          className="h-9 rounded-lg border-transparent bg-muted/60 pl-9 pr-14 text-sm transition-colors focus-visible:bg-background focus-visible:border-input"
          value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={onKey} onFocus={() => { if (grouped) setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground lg:flex">
          ⌘K
        </kbd>
      </div>

      {/* Search dropdown */}
      {open && rect && createPortal(
        <div style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 9999 }}
          className="max-h-96 overflow-y-auto rounded-lg border bg-card shadow-xl py-1">
          {loading && <p className="p-3 text-sm text-muted-foreground">{t("header.searching")}</p>}
          {!loading && grouped && (
            <div className="space-y-1">
              {renderGroup("pages", grouped.pages)}
              {renderGroup("products", grouped.products)}
              {renderGroup("orders", grouped.orders)}
              {!hasResults && <p className="px-3 py-4 text-center text-sm text-muted-foreground">{t("header.no_results", { query })}</p>}
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-2 shrink-0" data-tour="header-actions">
        {/* Storefront URL */}
        <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg text-xs" onClick={copyUrl} disabled={!shopDetails?.slug}>
          <LinkIcon className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">{t("header.shop_url")}</span>
        </Button>

        {/* Light / dark theme */}
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={() => setAppTheme(appTheme === "dark" ? "light" : "dark")}
          aria-label={appTheme === "dark" ? t("misc.light_mode", "Light mode") : t("misc.dark_mode", "Dark mode")}
        >
          {appTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Account menu — surfaces Settings / Billing / Language / Log out that
            otherwise live only at the bottom of the sidebar. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={accountName || t("nav.settings")}
              className="flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Avatar className="h-9 w-9 border">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate text-sm font-semibold leading-tight">{shopDetails?.shop_name || t("nav.settings")}</span>
              {user?.email && <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <SettingsIcon className="mr-2 h-4 w-4" />{t("nav.settings")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/billing")}>
              <CreditCard className="mr-2 h-4 w-4" />{t("nav.billing")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => i18n.changeLanguage(i18n.language?.startsWith("sq") ? "en" : "sq")}>
              <Languages className="mr-2 h-4 w-4" />{i18n.language?.startsWith("sq") ? "English" : "Shqip"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />{t("header.log_out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
