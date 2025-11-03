import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Link as LinkIcon, LogOut, User as UserIcon, Settings, Sparkles, Package, FileText, LayoutDashboard } from "lucide-react";
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
import { useState, useEffect, useMemo, useRef } from "react"; // Import useState and useEffect
import { createPortal } from "react-dom";

interface HeaderProps {
  title: string;
}

const Header = ({ title }: HeaderProps) => {
  const navigate = useNavigate();
  const { settings } = useAppearance();
  const { shopDetails } = useShop();
  const isFloating = settings.layoutStyle === 'floating';
  const blurEnabled = settings.blurEnabled;
  const [user, setUser] = useState<any>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [tokenStats, setTokenStats] = useState<{ prompt: number; candidates: number; jobs: { created_at: string; prompt: number; candidates: number }[] }>({ prompt: 0, candidates: 0, jobs: [] });
  const [query, setQuery] = useState("");
  const [openSearch, setOpenSearch] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [results, setResults] = useState<{
    pages: Array<{ title: string; path: string }>;
    products: Array<{ id: string; name: string; media_url?: string | null }>;
    options: Array<{ product_id: string; option_name: string; value: string }>;
    settings: Array<{ title: string; path: string }>;
  } | null>(null);
  const activeIndexRef = useRef<number>(-1);
  const listRefs = useRef<Array<HTMLDivElement | null>>([]);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchTokenUsage = async () => {
      if (!user) return;
      const { data } = await supabase.from('sync_jobs').select('created_at, summary').eq('user_id', user.id).order('created_at', { ascending: false });
      const jobs = (data || []).map((r: any) => ({
        created_at: r.created_at,
        prompt: Number(r.summary?.total_ai_tokens_used?.prompt || 0),
        candidates: Number(r.summary?.total_ai_tokens_used?.candidates || 0),
      }));
      const prompt = jobs.reduce((a, b) => a + b.prompt, 0);
      const candidates = jobs.reduce((a, b) => a + b.candidates, 0);
      setTokenStats({ prompt, candidates, jobs });
    };
    fetchTokenUsage();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // Static pages and settings
  const staticPages = useMemo(() => [
    { title: "Dashboard", path: "/" },
    { title: "Products", path: "/products" },
    { title: "Out of Stock", path: "/out-of-stock" },
    { title: "Orders", path: "/orders" },
    { title: "Customers", path: "/customers" },
  ], []);

  const settingsPages = useMemo(() => [
    { title: "Store Settings", path: "/settings" },
    { title: "Appearance", path: "/settings/appearance" },
    { title: "Payments", path: "/settings/payments" },
  ], []);

  // Debounced search combining static groups with Supabase-backed resources
  useEffect(() => {
    if (!query) { setResults(null); setOpenSearch(false); return; }
    let cancelled = false;
    setLoadingSearch(true);
    const t = setTimeout(async () => {
      try {
        const lower = query.toLowerCase();
        const pages = staticPages.filter(p => p.title.toLowerCase().includes(lower)).slice(0, 5);
        const settings = settingsPages.filter(p => p.title.toLowerCase().includes(lower)).slice(0, 5);

        // Prefer trigram RPCs; fallback to ilike if RPCs not present
        let products: Array<{ id: string; name: string; media_url?: string | null }> = [];
        let options: Array<{ product_id: string; option_name: string; value: string }> = [];
        let rpcWorked = true;
        try {
          const [{ data: pRpc }, { data: oRpc }] = await Promise.all([
            supabase.rpc('admin_search_products', { q: query, limit_count: 5 }),
            supabase.rpc('admin_search_options', { q: query, limit_count: 8 }),
          ]);
          if (Array.isArray(pRpc)) {
            products = pRpc.map((p: any) => ({ id: p.id, name: p.name, media_url: p.media_url }));
          } else {
            rpcWorked = false;
          }
          if (Array.isArray(oRpc)) {
            options = oRpc.map((r: any) => ({ product_id: r.product_id, option_name: r.option_name, value: r.value }));
          } else {
            rpcWorked = false;
          }
        } catch {
          rpcWorked = false;
        }

        if (!rpcWorked) {
          const { data: prodData } = await supabase
            .from('products')
            .select('id,name,media_url')
            .or(`name.ilike.%${query}%,caption.ilike.%${query}%`)
            .limit(5);
          products = (prodData || []).map((p: any) => ({ id: p.id, name: p.name, media_url: p.media_url }));

          const { data: optionVals } = await supabase
            .from('option_values')
            .select('id,value,option_id')
            .ilike('value', `%${query}%`)
            .limit(16);
          if (optionVals && optionVals.length > 0) {
            const optionIds = Array.from(new Set(optionVals.map((v: any) => v.option_id)));
            const { data: optRows } = await supabase
              .from('product_options')
              .select('id, product_id, name')
              .in('id', optionIds);
            const optMap = new Map((optRows || []).map((o: any) => [o.id, o]));
            options = optionVals
              .map((v: any) => ({ product_id: optMap.get(v.option_id)?.product_id, option_name: optMap.get(v.option_id)?.name, value: v.value }))
              .filter(x => !!x.product_id)
              .slice(0, 8) as any;
          }
        }

        if (!cancelled) {
          setResults({ pages, products, options, settings });
          setOpenSearch(true);
          activeIndexRef.current = -1;
          listRefs.current = [];
        }
      } finally {
        if (!cancelled) setLoadingSearch(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, staticPages, settingsPages]);

  // Keep dropdown positioned above everything using portal + fixed coordinates
  useEffect(() => {
    const updateRect = () => {
      const el = searchContainerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setDropdownRect({ top: r.bottom + 8, left: r.left, width: r.width });
    };
    if (openSearch) {
      updateRect();
      window.addEventListener('scroll', updateRect, true);
      window.addEventListener('resize', updateRect);
      return () => {
        window.removeEventListener('scroll', updateRect, true);
        window.removeEventListener('resize', updateRect);
      };
    }
  }, [openSearch, results, loadingSearch]);

  const allItemsFlat = useMemo(() => {
    const items: Array<{ kind: 'page'|'product'|'option'|'setting'; label: string; path: string }> = [];
    if (results?.pages) results.pages.forEach(p => items.push({ kind: 'page', label: p.title, path: p.path }));
    if (results?.products) results.products.forEach(p => items.push({ kind: 'product', label: p.name, path: `/products?openProduct=${p.id}` }));
    if (results?.options) results.options.forEach(o => items.push({ kind: 'option', label: `${o.option_name}: ${o.value}`, path: `/products?openProduct=${o.product_id}` }));
    if (results?.settings) results.settings.forEach(s => items.push({ kind: 'setting', label: s.title, path: s.path }));
    return items;
  }, [results]);

  const onKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!openSearch || allItemsFlat.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndexRef.current = Math.min(allItemsFlat.length - 1, activeIndexRef.current + 1);
      listRefs.current[activeIndexRef.current]?.scrollIntoView({ block: 'nearest' });
      setOpenSearch(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndexRef.current = Math.max(0, activeIndexRef.current - 1);
      listRefs.current[activeIndexRef.current]?.scrollIntoView({ block: 'nearest' });
      setOpenSearch(true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = allItemsFlat[activeIndexRef.current] || allItemsFlat[0];
      if (item?.path) navigate(item.path);
      setOpenSearch(false);
    } else if (e.key === 'Escape') {
      setOpenSearch(false);
    }
  };

  const headerLeftMarginClasses = {
    compact: 'md:left-[calc(14rem+2rem)]', // 224px + 32px
    default: 'md:left-[calc(16rem+2rem)]', // 256px + 32px
    spacious: 'md:left-[calc(18rem+2rem)]', // 288px + 32px
  };

  const handleCopyStorefrontUrl = async () => {
    if (shopDetails?.slug) {
      const storefrontUrl = `${window.location.origin}/instagramShop/${shopDetails.slug}`;
      try {
        await navigator.clipboard.writeText(storefrontUrl);
        showSuccess("Storefront URL copied to clipboard!");
      } catch (err) {
        showError("Failed to copy URL. Please try again manually.");
        console.error("Failed to copy storefront URL:", err);
      }
    } else {
      showError("Your shop URL is not available yet. Please set your shop name in settings.");
    }
  };

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-[60px] px-6 transition-all shadow-md",
      isFloating
        ? "top-4 right-4 left-4 border rounded-lg"
        : "border-b",
      isFloating && (headerLeftMarginClasses[settings.sidebarWidth || 'default']),
      blurEnabled ? "bg-card/80 backdrop-blur-[20px]" : "bg-card",
      !isFloating && "md:ml-[var(--sidebar-width)] md:pr-8" // Ensure full width for docked
    )} style={{ '--sidebar-width': settings.sidebarWidth === 'compact' ? '14rem' : settings.sidebarWidth === 'spacious' ? '18rem' : '16rem' } as React.CSSProperties}>
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold hidden md:block">{title}</h1>
        <div ref={searchContainerRef} className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            type="search"
            placeholder="Search pages, products, options, settings..."
            className="pl-8 w-full"
            value={query}
            onChange={(e)=> setQuery(e.target.value)}
            onKeyDown={onKeyDownSearch}
            onFocus={() => { if (results) setOpenSearch(true); }}
          />
          {openSearch && (results || loadingSearch) && dropdownRect && createPortal(
            <div
              style={{
                position: 'fixed',
                top: dropdownRect.top,
                left: dropdownRect.left,
                width: dropdownRect.width,
                zIndex: 9999,
              }}
              className="max-h-96 overflow-auto rounded-md border bg-card shadow-lg"
            >
              {loadingSearch && <div className="p-3 text-sm text-muted-foreground">Searching…</div>}
              {!loadingSearch && results && (
                <div className="p-2 space-y-3">
                  {results.pages.length > 0 && (
                    <div>
                      <div className="px-2 pb-1 text-xs uppercase text-muted-foreground">Pages</div>
                      {results.pages.map((p, idx) => (
                        <div
                          key={`page-${p.path}`}
                          ref={(el)=>{listRefs.current.push(el);}}
                          className="px-2 py-2 rounded cursor-pointer hover:bg-muted"
                          onMouseDown={()=>{ navigate(p.path); setOpenSearch(false); }}
                        >
                          <div className="flex items-center gap-2"><LayoutDashboard className="h-4 w-4" />{p.title}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {results.products.length > 0 && (
                    <div>
                      <div className="px-2 pb-1 text-xs uppercase text-muted-foreground">Products</div>
                      {results.products.map((p) => (
                        <div
                          key={`prod-${p.id}`}
                          ref={(el)=>{listRefs.current.push(el);}}
                          className="px-2 py-2 rounded cursor-pointer hover:bg-muted"
                          onMouseDown={()=>{ navigate(`/products?openProduct=${p.id}`); setOpenSearch(false); }}
                        >
                          <div className="flex items-center gap-2"><Package className="h-4 w-4" /><span className="font-medium">{p.name}</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                  {results.options.length > 0 && (
                    <div>
                      <div className="px-2 pb-1 text-xs uppercase text-muted-foreground">Options</div>
                      {results.options.map((o, i) => (
                        <div
                          key={`opt-${i}-${o.product_id}`}
                          ref={(el)=>{listRefs.current.push(el);}}
                          className="px-2 py-2 rounded cursor-pointer hover:bg-muted"
                          onMouseDown={()=>{ navigate(`/products?openProduct=${o.product_id}`); setOpenSearch(false); }}
                        >
                          <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span className="font-medium">{o.option_name}</span><span className="text-muted-foreground">{o.value}</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                  {results.settings.length > 0 && (
                    <div>
                      <div className="px-2 pb-1 text-xs uppercase text-muted-foreground">Settings</div>
                      {results.settings.map((s) => (
                        <div
                          key={`set-${s.path}`}
                          ref={(el)=>{listRefs.current.push(el);}}
                          className="px-2 py-2 rounded cursor-pointer hover:bg-muted"
                          onMouseDown={()=>{ navigate(s.path); setOpenSearch(false); }}
                        >
                          <div className="flex items-center gap-2"><Settings className="h-4 w-4" />{s.title}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {results.pages.length===0 && results.products.length===0 && results.options.length===0 && results.settings.length===0 && (
                    <div className="px-2 py-2 text-sm text-muted-foreground">No results</div>
                  )}
                </div>
              )}
            </div>,
            document.body
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Dialog open={aiOpen} onOpenChange={setAiOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Sparkles className="mr-2 h-4 w-4" />
              {((tokenStats.prompt + tokenStats.candidates) / 1000).toFixed(1)}k • {(() => {
                const INPUT_PER_MILLION = 1.25; // USD per 1,000,000 input tokens
                const OUTPUT_PER_MILLION = 10.0; // USD per 1,000,000 output tokens
                const cost = (tokenStats.prompt / 1_000_000) * INPUT_PER_MILLION + (tokenStats.candidates / 1_000_000) * OUTPUT_PER_MILLION;
                return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cost);
              })()}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>AI Usage</DialogTitle>
              <DialogDescription>Total tokens and estimated cost using Gemini 2.5 Pro pricing (USD): $1.25 per 1M input tokens, $10.00 per 1M output tokens.</DialogDescription>
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
                  const INPUT_PER_MILLION = 1.25; // USD per 1,000,000 input tokens
                  const OUTPUT_PER_MILLION = 10.0; // USD per 1,000,000 output tokens
                  const cost = (tokenStats.prompt / 1_000_000) * INPUT_PER_MILLION + (tokenStats.candidates / 1_000_000) * OUTPUT_PER_MILLION;
                  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cost);
                })()}</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="max-h-64 overflow-auto space-y-1 text-sm">
                {tokenStats.jobs.map((j, idx) => {
                  const inputCost = (j.prompt / 1_000_000) * 1.25;
                  const outputCost = (j.candidates / 1_000_000) * 10.0;
                  const total = inputCost + outputCost;
                  return (
                    <div key={idx} className="flex items-center justify-between">
                      <span>{new Date(j.created_at).toLocaleString()}</span>
                      <span>{(j.prompt + j.candidates).toLocaleString()} tokens • {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(total)}</span>
                    </div>
                  );
                })}
                {tokenStats.jobs.length === 0 && <div className="text-muted-foreground">No sync jobs yet.</div>}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleCopyStorefrontUrl}
          disabled={!shopDetails?.slug}
        >
          <LinkIcon className="mr-2 h-4 w-4" />
          Get Storefront URL
        </Button>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={shopDetails?.logo_url || undefined} alt={shopDetails?.shop_name || "User"} />
                  <AvatarFallback>
                    {shopDetails?.shop_name?.[0] || <UserIcon className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.user_metadata?.full_name || user.email}</p>
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