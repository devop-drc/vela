/**
 * /demo — a fully interactive, mock-data mirror of the whole Vela admin app.
 * No network, no Supabase: every screen runs on the static seed in ./demo/data
 * and mutates local React state. Navigation is local (not the router) so the
 * demo behaves like the real app without touching protected routes.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Home, Package, Archive, Layers, MessageSquareQuote, Megaphone, ShoppingBag,
  Store, CreditCard, Settings as SettingsIcon, Search, Moon, Sun, Sparkles, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import DemoDashboard from "./demo/DemoDashboard";
import DemoProducts from "./demo/DemoProducts";
import DemoStock from "./demo/DemoStock";
import DemoCategories from "./demo/DemoCategories";
import DemoKeywords from "./demo/DemoKeywords";
import DemoPromotions from "./demo/DemoPromotions";
import DemoOrders from "./demo/DemoOrders";
import DemoStorefront from "./demo/DemoStorefront";
import DemoBilling from "./demo/DemoBilling";
import DemoSettings from "./demo/DemoSettings";

type ScreenKey =
  | "dashboard" | "products" | "stock" | "categories" | "keywords"
  | "promotions" | "orders" | "storefront" | "billing" | "settings";

type NavItem = { key: ScreenKey; label: string; icon: any };
type NavGroup = { heading?: string; items: NavItem[] };

const NAV: NavGroup[] = [
  { items: [{ key: "dashboard", label: "Dashboard", icon: Home }] },
  {
    heading: "Catalog",
    items: [
      { key: "products", label: "Products", icon: Package },
      { key: "stock", label: "Stock", icon: Archive },
      { key: "categories", label: "Categories", icon: Layers },
      { key: "keywords", label: "Keywords", icon: MessageSquareQuote },
      { key: "promotions", label: "Promotions", icon: Megaphone },
    ],
  },
  { heading: "Sales", items: [{ key: "orders", label: "Orders", icon: ShoppingBag }] },
  { heading: "Storefront", items: [{ key: "storefront", label: "Storefront Studio", icon: Store }] },
  {
    heading: "Account",
    items: [
      { key: "billing", label: "Billing", icon: CreditCard },
      { key: "settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

// Dark token values (from globals.css `.dark`). The app-wide AppearanceProvider
// writes light CSS vars INLINE on :root, which beat the `.dark` class — so to
// theme the demo we set these inline on documentElement ourselves (this also
// reaches dialog/sheet portals, which mount outside the demo subtree).
const DARK_VARS: Record<string, string> = {
  "--background": "265 22% 6%", "--foreground": "285 15% 96%",
  "--muted": "265 16% 15%", "--muted-foreground": "280 10% 68%",
  "--card": "264 20% 9%", "--card-foreground": "285 15% 96%",
  "--popover": "264 20% 9%", "--popover-foreground": "285 15% 96%",
  "--primary": "300 80% 65%", "--primary-foreground": "300 40% 8%",
  "--secondary": "265 18% 16%", "--secondary-foreground": "285 15% 92%",
  "--accent": "280 25% 18%", "--accent-foreground": "285 15% 92%",
  "--destructive": "0 72% 55%", "--destructive-foreground": "0 0% 98%",
  "--success": "142 55% 55%", "--success-foreground": "150 40% 8%",
  "--warning": "42 92% 60%", "--warning-foreground": "40 96% 8%",
  "--info": "213 90% 66%", "--info-foreground": "214 60% 10%",
  "--border": "265 16% 20%", "--input": "265 16% 20%", "--ring": "292 84% 62%",
};

const TITLES: Record<ScreenKey, string> = {
  dashboard: "Dashboard", products: "Products", stock: "Stock", categories: "Categories",
  keywords: "Keywords", promotions: "Promotions", orders: "Orders",
  storefront: "Storefront Studio", billing: "Billing", settings: "Settings",
};

const SCREENS: Record<ScreenKey, React.ComponentType> = {
  dashboard: DemoDashboard, products: DemoProducts, stock: DemoStock,
  categories: DemoCategories, keywords: DemoKeywords, promotions: DemoPromotions,
  orders: DemoOrders, storefront: DemoStorefront, billing: DemoBilling, settings: DemoSettings,
};

const NavList = ({ active, onSelect }: { active: ScreenKey; onSelect: (k: ScreenKey) => void }) => (
  <nav className="flex-1 overflow-y-auto p-3 space-y-4">
    {NAV.map((group, gi) => (
      <div key={gi} className="space-y-1">
        {group.heading && (
          <p className="px-2.5 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group.heading}
          </p>
        )}
        {group.items.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-sm transition-colors",
                isActive
                  ? "bg-primary/10 font-medium text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    ))}
  </nav>
);

const Brand = () => (
  <div className="flex items-center gap-2.5 border-b px-4 h-16 shrink-0">
    <img src="/vela-icon.svg" alt="Vela" className="h-8 w-8 rounded-lg ring-1 ring-border" />
    <div className="min-w-0">
      <h1 className="font-display-brand text-lg font-bold leading-none">Vela</h1>
      <p className="text-[10px] text-muted-foreground truncate">Shop Name</p>
    </div>
  </div>
);

const Demo = () => {
  const [active, setActive] = useState<ScreenKey>("dashboard");
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Theme the demo by writing dark token vars inline on :root (see DARK_VARS).
  // Capture and restore any prior inline values so the toggle never leaks out.
  useEffect(() => {
    const root = document.documentElement;
    const hadClass = root.classList.contains("dark");
    const prev: Record<string, string> = {};
    Object.keys(DARK_VARS).forEach((k) => { prev[k] = root.style.getPropertyValue(k); });
    if (dark) {
      root.classList.add("dark");
      Object.entries(DARK_VARS).forEach(([k, v]) => root.style.setProperty(k, v));
    }
    return () => {
      root.classList.toggle("dark", hadClass);
      Object.entries(prev).forEach(([k, v]) => (v ? root.style.setProperty(k, v) : root.style.removeProperty(k)));
    };
  }, [dark]);

  const Screen = SCREENS[active];
  const select = (k: ScreenKey) => { setActive(k); setMobileOpen(false); };

  return (
    <div className="flex h-screen-dvh overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 shrink-0 flex-col border-r bg-card">
        <Brand />
        <NavList active={active} onSelect={select} />
        <div className="border-t p-3">
          <Button asChild className="w-full brand-gradient text-white hover:opacity-90">
            <Link to="/register">Get Started Free</Link>
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4 md:px-6">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 flex flex-col">
              <Brand />
              <NavList active={active} onSelect={select} />
            </SheetContent>
          </Sheet>

          <h1 className="text-lg font-bold hidden sm:block">{TITLES[active]}</h1>

          <div className="relative ml-auto hidden lg:block w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              readOnly
              placeholder="Search products, orders…"
              className="h-8 w-full cursor-default rounded-md border bg-background pl-8 pr-3 text-sm text-muted-foreground focus:outline-none"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            className="shrink-0 ml-auto lg:ml-0"
            onClick={() => setDark((d) => !d)}
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex brand-gradient text-white hover:opacity-90">
            <Link to="/register">Get Started</Link>
          </Button>
        </header>

        {/* Demo banner */}
        <div className="flex items-center justify-center gap-2 border-b bg-primary/5 px-4 py-1.5 text-center text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Interactive demo with sample data — click around freely. Nothing here is saved.</span>
        </div>

        {/* Screen */}
        <main className={cn("flex-1 min-h-0", active === "storefront" ? "overflow-hidden" : "overflow-y-auto p-4 md:p-6")}>
          <Screen />
        </main>
      </div>
    </div>
  );
};

export default Demo;
