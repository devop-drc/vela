import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search, Link as LinkIcon, LogOut, User as UserIcon, Settings, Sparkles,
  Package, LayoutDashboard, ShoppingCart,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAppearance } from "@/contexts/AppearanceContext";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useShop } from "@/contexts/ShopContext";
import { showSuccess, showError } from "@/utils/toast";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

interface HeaderProps {
  title: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PageResult = { kind: 'page'; id: string; label: string; subtitle: string; path: string };
type ProductResult = { kind: 'product'; id: string; label: string; subtitle: string; path: string };
type OrderResult = { kind: 'order'; id: string; label: string; subtitle: string; path: string };

type SearchResult = PageResult | ProductResult | OrderResult;

interface GroupedResults {
  pages: PageResult[];
  products: ProductResult[];
  orders: OrderResult[];
}

// ─── Static page list ─────────────────────────────────────────────────────────

const STATIC_PAGES: Array<{ label: string; subtitle: string; path: string }> = [
  { label: 'Dashboard', subtitle: 'Overview & stats', path: '/' },
  { label: 'Products', subtitle: 'Manage your products', path: '/products' },
  { label: 'Out of Stock', subtitle: 'Products needing restock', path: '/out-of-stock' },
  { label: 'Orders', subtitle: 'Customer orders', path: '/orders' },
  { label: 'Customers', subtitle: 'Customer list', path: '/customers' },
  { label: 'Categories', subtitle: 'Product categories', path: '/categories' },
  { label: 'Keywords', subtitle: 'Keyword management', path: '/keywords' },
  { label: 'Promotions', subtitle: 'Discount & promo codes', path: '/promotions' },
  { label: 'Store Settings', subtitle: 'General store settings', path: '/settings' },
  { label: 'Appearance', subtitle: 'Theme & layout options', path: '/settings/appearance' },
  { label: 'Payments', subtitle: 'Payment method settings', path: '/settings/payments' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const Header = ({ title }: HeaderProps) => {
  const navigate = useNavigate();
  const { settings } = useAppearance();
  const { shopDetails } = useShop();
  const isFloating = settings.layoutStyle === 'floating';
  const blurEnabled = settings.blurEnabled;

  const [user, setUser] = useState<any>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [tokenStats, setTokenStats] = useState<{
    prompt: number;
    candidates: number;
    jobs: { created_at: string; prompt: number; candidates: number }[];
  }>({ prompt: 0, candidates: 0, jobs: [] });

  // ── Search state ────────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [grouped, setGrouped] = useState<GroupedResults | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('sync_jobs')
      .select('created_at, summary')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const jobs = (data || []).map((r: any) => ({
          created_at: r.created_at,
          prompt: Number(r.summary?.total_ai_tokens_used?.prompt || 0),
          candidates: Number(r.summary?.total_ai_tokens_used?.candidates || 0),
        }));
        setTokenStats({
          prompt: jobs.reduce((a, b) => a + b.prompt, 0),
          candidates: jobs.reduce((a, b) => a + b.candidates, 0),
          jobs,
        });
      });
  }, [user]);

  // ── Flatten results for keyboard nav ────────────────────────────────────────
  const flat = useMemo<SearchResult[]>(() => {
    if (!grouped) return [];
    return [
      ...grouped.pages,
      ...grouped.products,
      ...grouped.orders,
    ];
  }, [grouped]);

  // ── Debounced search (300 ms) ────────────────────────────────────────────────
  useEffect(() => {
    if (!query.trim()) {
      setGrouped(null);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const lower = query.toLowerCase();

        // Pages — static, client-side filter
        const pages: PageResult[] = STATIC_PAGES
          .filter(p => p.label.toLowerCase().includes(lower))
          .slice(0, 5)
          .map(p => ({ kind: 'page', id: p.path, label: p.label, subtitle: p.subtitle, path: p.path }));

        // Products — Supabase ilike on name, category, tags
        let products: ProductResult[] = [];
        try {
          // Try the RPC first (trigram search)
          const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_search_products', {
            q: query,
            limit_count: 5,
          });
          if (!rpcErr && Array.isArray(rpcData)) {
            products = rpcData.map((p: any) => ({
              kind: 'product',
              id: p.id,
              label: p.name,
              subtitle: p.category || 'Product',
              path: `/products?openProduct=${p.id}`,
            }));
          } else {
            throw new Error('rpc not available');
          }
        } catch {
          // Fallback: ilike on name, category, tags
          const { data: prodData } = await supabase
            .from('products')
            .select('id, name, category, tags')
            .or(`name.ilike.%${query}%,category.ilike.%${query}%,tags.cs.{${query}}`)
            .limit(5);
          products = (prodData || []).map((p: any) => ({
            kind: 'product',
            id: p.id,
            label: p.name,
            subtitle: p.category || 'Product',
            path: `/products?openProduct=${p.id}`,
          }));
        }

        // Orders — ilike on customer_name, customer_email
        let orders: OrderResult[] = [];
        const { data: orderData } = await supabase
          .from('orders')
          .select('id, customer_name, customer_email, status')
          .or(`customer_name.ilike.%${query}%,customer_email.ilike.%${query}%`)
          .limit(5);
        orders = (orderData || []).map((o: any) => ({
          kind: 'order',
          id: o.id,
          label: o.customer_name || o.customer_email,
          subtitle: o.status || 'Order',
          path: `/orders?orderId=${o.id}`,
        }));

        if (!cancelled) {
          setGrouped({ pages, products, orders });
          setOpen(true);
          setActiveIndex(-1);
          itemRefs.current.clear();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // ── Dropdown position (portal) ───────────────────────────────────────────────
  useEffect(() => {
    const updateRect = () => {
      const el = searchContainerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setDropdownRect({ top: r.bottom + 8, left: r.left, width: r.width });
    };
    if (open) {
      updateRect();
      window.addEventListener('scroll', updateRect, true);
      window.addEventListener('resize', updateRect);
      return () => {
        window.removeEventListener('scroll', updateRect, true);
        window.removeEventListener('resize', updateRect);
      };
    }
  }, [open, grouped, loading]);

  // ── Navigation ───────────────────────────────────────────────────────────────
  const navigateToResult = useCallback((item: SearchResult) => {
    navigate(item.path);
    setOpen(false);
    setQuery('');
  }, [navigate]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(flat.length - 1, activeIndex + 1);
      setActiveIndex(next);
      itemRefs.current.get(next)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(0, activeIndex - 1);
      setActiveIndex(prev);
      itemRefs.current.get(prev)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = activeIndex >= 0 ? flat[activeIndex] : flat[0];
      if (item) navigateToResult(item);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  // ── Auth actions ─────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleCopyStorefrontUrl = async () => {
    if (shopDetails?.slug) {
      const url = `${window.location.origin}/instagramShop/${shopDetails.slug}`;
      try {
        await navigator.clipboard.writeText(url);
        showSuccess('Storefront URL copied to clipboard!');
      } catch {
        showError('Failed to copy URL. Please try again manually.');
      }
    } else {
      showError('Your shop URL is not available yet. Please set your shop name in settings.');
    }
  };

  // ── Flat index counter for refs (rebuilt each render) ────────────────────────
  let flatIdx = 0;

  const renderGroup = (
    label: string,
    items: SearchResult[],
    icon: React.ReactNode,
  ) => {
    if (items.length === 0) return null;
    return (
      <div key={label}>
        <div className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        {items.map((item) => {
          const idx = flatIdx++;
          return (
            <div
              key={item.id}
              ref={(el) => {
                if (el) itemRefs.current.set(idx, el);
              }}
              className={cn(
                'flex items-center gap-2.5 px-2 py-2 rounded-md cursor-pointer transition-colors',
                idx === activeIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted',
              )}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur
                navigateToResult(item);
              }}
            >
              {icon}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{item.label}</div>
                {item.subtitle && (
                  <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const hasResults = grouped && (
    grouped.pages.length > 0 || grouped.products.length > 0 || grouped.orders.length > 0
  );

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <header
      className={cn(
        'z-50 flex items-center justify-between h-14 min-h-[56px] px-6 transition-all duration-300',
        isFloating
          ? 'fixed top-3 right-3 border rounded-lg shadow-lg'
          : 'sticky top-0 border-b shadow-sm shrink-0',
        blurEnabled ? 'bg-card/80 backdrop-blur-[20px]' : 'bg-card',
      )}
      style={isFloating ? { left: `calc(var(--sidebar-width, 16rem) + 2rem)` } : undefined}
    >
      {/* Left: title + search */}
      <div className="flex items-center gap-4 min-w-0">
        <h1 className="text-xl font-bold hidden md:block shrink-0">{title}</h1>

        {/* Search bar */}
        <div ref={searchContainerRef} className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search products, orders, pages…"
            className="pl-8 w-full"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => { if (grouped) setOpen(true); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
        </div>
      </div>

      {/* Search dropdown — portal so z-index is never clipped */}
      {open && dropdownRect && createPortal(
        <div
          style={{
            position: 'fixed',
            top: dropdownRect.top,
            left: dropdownRect.left,
            width: Math.max(dropdownRect.width, 320),
            zIndex: 9999,
          }}
          className="max-h-[420px] overflow-y-auto rounded-lg border bg-card shadow-xl"
        >
          {loading && (
            <div className="p-3 text-sm text-muted-foreground">Searching…</div>
          )}

          {!loading && grouped && (
            <div className="p-2 space-y-3">
              {renderGroup('Pages', grouped.pages, <LayoutDashboard className="h-4 w-4 shrink-0 text-muted-foreground" />)}
              {renderGroup('Products', grouped.products, <Package className="h-4 w-4 shrink-0 text-muted-foreground" />)}
              {renderGroup('Orders', grouped.orders, <ShoppingCart className="h-4 w-4 shrink-0 text-muted-foreground" />)}

              {!hasResults && (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>,
        document.body,
      )}

      {/* Right: AI stats, storefront link, avatar */}
      <div className="flex items-center gap-4 shrink-0">
        {/* AI usage */}
        <Dialog open={aiOpen} onOpenChange={setAiOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Sparkles className="mr-2 h-4 w-4" />
              {((tokenStats.prompt + tokenStats.candidates) / 1000).toFixed(1)}k &bull; {(() => {
                const cost =
                  (tokenStats.prompt / 1_000_000) * 1.25 +
                  (tokenStats.candidates / 1_000_000) * 10.0;
                return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cost);
              })()}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>AI Usage</DialogTitle>
              <DialogDescription>
                Total tokens and estimated cost using Gemini 2.5 Pro pricing (USD): $1.25 per 1M input tokens, $10.00 per 1M output tokens.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Prompt tokens</span>
                <span>{tokenStats.prompt.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Output tokens</span>
                <span>{tokenStats.candidates.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Estimated cost</span>
                <span>{(() => {
                  const cost =
                    (tokenStats.prompt / 1_000_000) * 1.25 +
                    (tokenStats.candidates / 1_000_000) * 10.0;
                  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cost);
                })()}</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="max-h-64 overflow-auto space-y-1 text-sm">
                {tokenStats.jobs.map((j, idx) => {
                  const total = (j.prompt / 1_000_000) * 1.25 + (j.candidates / 1_000_000) * 10.0;
                  return (
                    <div key={idx} className="flex items-center justify-between">
                      <span>{new Date(j.created_at).toLocaleString()}</span>
                      <span>
                        {(j.prompt + j.candidates).toLocaleString()} tokens &bull;{' '}
                        {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(total)}
                      </span>
                    </div>
                  );
                })}
                {tokenStats.jobs.length === 0 && (
                  <div className="text-muted-foreground">No sync jobs yet.</div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Storefront link */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyStorefrontUrl}
          disabled={!shopDetails?.slug}
        >
          <LinkIcon className="mr-2 h-4 w-4" />
          Get Storefront URL
        </Button>

        {/* Avatar / user menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={shopDetails?.logo_url || undefined} alt={shopDetails?.shop_name || 'User'} />
                  <AvatarFallback>
                    {shopDetails?.shop_name?.[0] || <UserIcon className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.user_metadata?.full_name || user.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};

export default Header;
