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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import {
  Search, Link as LinkIcon, LogOut, User as UserIcon, Settings,
  Sparkles, Package, LayoutDashboard, ShoppingCart,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type SearchResult = { kind: "page" | "product" | "order"; id: string; label: string; subtitle: string; path: string };
interface GroupedResults { pages: SearchResult[]; products: SearchResult[]; orders: SearchResult[] }

const PAGES = [
  { label: "Dashboard", subtitle: "Overview & stats", path: "/" },
  { label: "Products", subtitle: "Manage products", path: "/products" },
  { label: "Stock", subtitle: "Manage inventory", path: "/out-of-stock" },
  { label: "Orders", subtitle: "Customer orders", path: "/orders" },
  { label: "Categories", subtitle: "Product categories", path: "/categories" },
  { label: "Keywords", subtitle: "AI keyword hints", path: "/keywords" },
  { label: "Promotions", subtitle: "Discounts & promos", path: "/promotions" },
  { label: "Settings", subtitle: "Store settings", path: "/settings" },
];

const GROUP_ICONS: Record<string, React.ReactNode> = {
  Pages: <LayoutDashboard className="h-4 w-4 text-muted-foreground shrink-0" />,
  Products: <Package className="h-4 w-4 text-muted-foreground shrink-0" />,
  Orders: <ShoppingCart className="h-4 w-4 text-muted-foreground shrink-0" />,
};

// ── Component ────────────────────────────────────────────────────────────────

export default function Header({ title }: { title: string }) {
  const navigate = useNavigate();
  const { settings } = useAppearance();
  const { shopDetails } = useShop();

  const floating = settings.layoutStyle === "floating";
  const blur = settings.blurEnabled;

  // ── User ─────────────────────────────────────────────────────────────────
  const [user, setUser] = useState<any>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data.user)); }, []);

  // ── AI token stats ───────────────────────────────────────────────────────
  const [aiOpen, setAiOpen] = useState(false);
  const [tokens, setTokens] = useState({ prompt: 0, candidates: 0, jobs: [] as any[] });

  useEffect(() => {
    if (!user) return;
    supabase.from("sync_jobs").select("created_at, summary").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => {
        const jobs = (data || []).map((r: any) => ({
          created_at: r.created_at,
          prompt: Number(r.summary?.total_ai_tokens_used?.prompt || 0),
          candidates: Number(r.summary?.total_ai_tokens_used?.candidates || 0),
        }));
        setTokens({ prompt: jobs.reduce((a: number, b: any) => a + b.prompt, 0), candidates: jobs.reduce((a: number, b: any) => a + b.candidates, 0), jobs });
      });
  }, [user]);

  const aiCost = (tokens.prompt / 1e6) * 0.15 + (tokens.candidates / 1e6) * 0.60; // Flash pricing

  // ── Search ───────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [grouped, setGrouped] = useState<GroupedResults | null>(null);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
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
      const pages: SearchResult[] = PAGES.filter(p => p.label.toLowerCase().includes(q)).slice(0, 5).map(p => ({ kind: "page", id: p.path, ...p }));
      let products: SearchResult[] = [];
      let orders: SearchResult[] = [];
      try {
        const { data } = await supabase.from("products").select("id, name, category").or(`name.ilike.%${query}%,category.ilike.%${query}%`).limit(5);
        products = (data || []).map((p: any) => ({ kind: "product", id: p.id, label: p.name, subtitle: p.category || "Product", path: `/products?openProduct=${p.id}` }));
      } catch {}
      try {
        const { data } = await supabase.from("orders").select("id, customer_name, customer_email, status").or(`customer_name.ilike.%${query}%,customer_email.ilike.%${query}%`).limit(5);
        orders = (data || []).map((o: any) => ({ kind: "order", id: o.id, label: o.customer_name || o.customer_email || "Order", subtitle: o.status || "Order", path: `/orders?orderId=${o.id}` }));
      } catch {}
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
  const renderGroup = (label: string, items: SearchResult[]) => {
    if (!items.length) return null;
    return (
      <div key={label}>
        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        {items.map(item => {
          const i = idx++;
          return (
            <div key={item.id} ref={el => { if (el) refs.current.set(i, el); }}
              className={cn("flex items-center gap-2.5 mx-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors", i === active ? "bg-accent text-accent-foreground" : "hover:bg-muted")}
              onMouseEnter={() => setActive(i)} onMouseDown={e => { e.preventDefault(); go(item); }}>
              {GROUP_ICONS[label]}
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
    if (!shopDetails?.slug) { showError("Set your shop name in settings first."); return; }
    try { await navigator.clipboard.writeText(`${location.origin}/instagramShop/${shopDetails.slug}`); showSuccess("URL copied!"); }
    catch { showError("Copy failed."); }
  };

  // ── JSX ──────────────────────────────────────────────────────────────────

  return (
    <header
      className={cn(
        "z-50 flex items-center gap-4 h-14 min-h-14 px-5 transition-all duration-300",
        floating ? "fixed top-3 right-3 border rounded-lg shadow-lg" : "sticky top-0 border-b shadow-sm shrink-0",
        blur ? "bg-card/80 backdrop-blur-xl" : "bg-card",
      )}
      style={floating ? { left: "calc(var(--sidebar-width, 16rem) + 0.75rem + 0.75rem)" } : undefined}
    >
      {/* Title */}
      <h1 className="text-lg font-bold hidden md:block shrink-0">{title}</h1>

      {/* Search */}
      <div ref={containerRef} className="relative w-64 lg:w-80">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          type="search" placeholder="Search…" className="h-8 pl-8 text-sm"
          value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={onKey} onFocus={() => { if (grouped) setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>

      {/* Search dropdown */}
      {open && rect && createPortal(
        <div style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 9999 }}
          className="max-h-96 overflow-y-auto rounded-lg border bg-card shadow-xl py-1">
          {loading && <p className="p-3 text-sm text-muted-foreground">Searching…</p>}
          {!loading && grouped && (
            <div className="space-y-1">
              {renderGroup("Pages", grouped.pages)}
              {renderGroup("Products", grouped.products)}
              {renderGroup("Orders", grouped.orders)}
              {!hasResults && <p className="px-3 py-4 text-center text-sm text-muted-foreground">No results for "{query}"</p>}
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* AI usage */}
        <Dialog open={aiOpen} onOpenChange={setAiOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{((tokens.prompt + tokens.candidates) / 1000).toFixed(1)}k</span>
              <span className="font-semibold">{new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(aiCost)}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>AI Usage</DialogTitle>
              <DialogDescription>Gemini Flash pricing: $0.15/1M input, $0.60/1M output</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Input tokens</span><span className="font-medium">{tokens.prompt.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Output tokens</span><span className="font-medium">{tokens.candidates.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Cost</span><span className="font-semibold">{new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(aiCost)}</span></div>
              <div className="h-px bg-border my-2" />
              <div className="max-h-48 overflow-auto space-y-1">
                {tokens.jobs.map((j: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs text-muted-foreground">
                    <span>{new Date(j.created_at).toLocaleDateString()}</span>
                    <span>{((j.prompt + j.candidates) / 1000).toFixed(1)}k tokens</span>
                  </div>
                ))}
                {tokens.jobs.length === 0 && <p className="text-muted-foreground">No syncs yet</p>}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Storefront URL */}
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={copyUrl} disabled={!shopDetails?.slug}>
          <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
          <span className="hidden lg:inline">Shop URL</span>
        </Button>

        {/* User menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={shopDetails?.logo_url || undefined} />
                  <AvatarFallback className="text-xs">{shopDetails?.shop_name?.[0] || <UserIcon className="h-3.5 w-3.5" />}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium truncate">{user.user_metadata?.full_name || user.email}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")}><Settings className="mr-2 h-3.5 w-3.5" />Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}><LogOut className="mr-2 h-3.5 w-3.5" />Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
