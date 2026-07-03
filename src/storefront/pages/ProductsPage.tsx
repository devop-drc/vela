// Products listing — grid or list, with search, category and sort filters.
// Filters presented as sidebar / drawer / topbar per config.pages.products.

import { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useStorefrontConfig, useStorefrontTokenStyle } from '../theme/StorefrontThemeProvider';
import { ProductCard } from '../components/ProductCard';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name A–Z' },
];

export const ProductsPage = () => {
  const { products, isLoading, hasMoreProducts, fetchMoreProducts, isLoadingMore, convertCurrency, shopDetails } = useStorefront();
  const config = useStorefrontConfig();
  const token = useStorefrontTokenStyle();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const category = params.get('category') || 'all';
  const sort = params.get('sort') || 'newest';
  const layout = config.pages.products.layout;
  const filtersMode = config.pages.products.filters;

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v && v !== 'all') next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (category !== 'all') list = list.filter((p) => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name?.toLowerCase().includes(q) || p.caption?.toLowerCase().includes(q));
    }
    const price = (p: any) => convertCurrency(p.price, p.currency) ?? 0;
    switch (sort) {
      case 'price-asc': list.sort((a, b) => price(a) - price(b)); break;
      case 'price-desc': list.sort((a, b) => price(b) - price(a)); break;
      case 'name': list.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      default: list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [products, category, search, sort, convertCurrency]);

  // Search / sort / filter only operate on already-loaded products (infinite
  // scroll), so matches living on not-yet-fetched pages are hidden. The
  // storefront context exposes no "load all" or server-side search endpoint —
  // adding one (e.g. `searchProducts(query)` or a `fetchAllProducts()` on
  // StorefrontContext) would be the complete fix. Until then, when a search or
  // category filter is active we auto-page through the rest of the catalog so
  // results converge, and we surface a notice while that's still happening.
  const isFiltering = search.trim().length > 0 || category !== 'all';

  useEffect(() => {
    if (isFiltering && hasMoreProducts && !isLoadingMore) fetchMoreProducts();
  }, [isFiltering, hasMoreProducts, isLoadingMore, fetchMoreProducts]);

  // Infinite scroll sentinel.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMoreProducts) return;
    const obs = new IntersectionObserver((e) => e[0].isIntersecting && fetchMoreProducts(), { rootMargin: '400px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMoreProducts, fetchMoreProducts]);

  const cols = config.layout.productGrid.columns;
  const gridCls = cn('grid gap-[var(--sf-grid-gap)] grid-cols-2 sm:grid-cols-3', cols >= 4 && 'lg:grid-cols-4', cols >= 5 && 'xl:grid-cols-5');

  const Filters = () => (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
        <div className="flex flex-col gap-1">
          <button onClick={() => setParam('category', 'all')} className={cn('text-left text-sm px-2 py-1.5 rounded hover:bg-accent', category === 'all' && 'bg-accent font-medium')}>All Products</button>
          {categories.map((c) => (
            <button key={c} onClick={() => setParam('category', c)} className={cn('text-left text-sm px-2 py-1.5 rounded hover:bg-accent', category === c && 'bg-accent font-medium')}>{c}</button>
          ))}
        </div>
      </div>
    </div>
  );

  const Toolbar = (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="pl-9" />
      </div>
      {filtersMode !== 'sidebar' && categories.length > 0 && (
        <Select value={category} onValueChange={(v) => setParam('category', v)}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Categories</SelectItem>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      )}
      <Select value={sort} onValueChange={(v) => setParam('sort', v)}>
        <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
        <SelectContent>{SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
      </Select>
      {filtersMode === 'sidebar' && categories.length > 0 && (
        <Sheet>
          <SheetTrigger asChild><Button variant="outline" className="lg:hidden"><SlidersHorizontal className="h-4 w-4 mr-2" /> Filters</Button></SheetTrigger>
          <SheetContent side="left" className={cn('w-72 bg-background text-foreground', token.className)} style={token.style} {...token.attrs}><div className="pt-8"><Filters /></div></SheetContent>
        </Sheet>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="sf-container py-8">
        <Skeleton className="h-10 w-full max-w-md mb-6" />
        <div className={gridCls}>{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="sf-container py-8">
      <h1 className="sf-heading text-3xl md:text-4xl font-bold mb-6">{category !== 'all' ? category : 'All Products'}</h1>
      <div className={cn(filtersMode === 'sidebar' ? 'grid lg:grid-cols-[220px_1fr] gap-8' : 'block')}>
        {filtersMode === 'sidebar' && <aside className="hidden lg:block"><Filters /></aside>}
        <div>
          {Toolbar}
          {isFiltering && hasMoreProducts && (
            <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Showing matches from loaded products — loading the rest of the catalog…
            </p>
          )}
          {filtered.length === 0 ? (
            <p className="text-muted-foreground py-16 text-center">No products match your filters.</p>
          ) : layout === 'list' ? (
            <div className="space-y-3">{filtered.map((p) => <ProductCard key={p.id} product={p} variant="compact" />)}</div>
          ) : (
            <div className={gridCls}>{filtered.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          )}
          <div ref={sentinel} className="h-10 flex items-center justify-center mt-8">{isLoadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}</div>
        </div>
      </div>
    </div>
  );
};
