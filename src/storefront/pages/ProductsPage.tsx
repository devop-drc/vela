// Products listing — grid or list, with search, sort and a full facet system
// (categories, price, availability, rating, tags, options, specifications).
// Which facets appear is merchant-controlled via the Storefront Studio
// (config.pages.products.filterVisibility); presentation (sidebar / drawer /
// topbar) comes from config.pages.products.filters.

import { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, SlidersHorizontal, Loader2, Tag, X, Package, Star, ChevronDown, PackageCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useProductRatings } from '@/hooks/useProductRating';
import { useVariantOptionsMap } from '@/hooks/useVariantOptions';
import { useStorefrontConfig, useStorefrontTokenStyle } from '../theme/StorefrontThemeProvider';
import { ProductCard } from '../components/ProductCard';
import {
  deriveAttributeKeys, attributeValues, filterKeyTitle, isFilterVisible, productMatchesAttr,
} from '@/components/filters/filterVisibility';
import { getAttributeIcon } from '@/lib/attributeIcons';
import { useSfT, type SfKey } from '../lib/visitorPrefs';

const SORTS: Array<{ value: string; label: SfKey }> = [
  { value: 'newest', label: 'newest' },
  { value: 'price-asc', label: 'priceLowHigh' },
  { value: 'price-desc', label: 'priceHighLow' },
  { value: 'rating', label: 'topRated' },
  { value: 'name', label: 'nameAZ' },
];

const AVAILABILITY: Array<{ value: string; label: SfKey }> = [
  { value: 'in', label: 'inStock' },
  { value: 'out', label: 'outOfStock' },
];

const RATING_STEPS = [4, 3, 2, 1];

/** Collapsible facet section (chevron header, optional clear). */
const Facet = ({ title, icon: Icon, active, onClear, defaultOpen = true, children }: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  active?: boolean;
  onClear?: () => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/60 pb-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="group flex flex-1 items-center gap-1.5 py-1 text-left"
        >
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground/75 transition-colors group-hover:text-foreground">{title}</span>
          {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="Active" />}
          <ChevronDown className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>
        {active && onClear && (
          <button type="button" onClick={onClear} aria-label={`Clear ${title}`}
            className="ml-1 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && <div className="pt-2.5">{children}</div>}
    </div>
  );
};

// Facet option chips need to stay comfortably readable — larger type and
// padding than the base .sf-chip, darker ink when idle.
const chipCls = (active: boolean) =>
  cn(
    'sf-chip !px-3 !py-1.5 !text-sm transition-colors',
    active ? '!bg-primary !text-primary-foreground font-medium' : '!text-foreground/80 hover:!bg-muted/80 hover:!text-foreground'
  );

export const ProductsPage = () => {
  const { products, promotions, isLoading, hasMoreProducts, fetchMoreProducts, isLoadingMore, convertCurrency, shopDetails, capabilities } = useStorefront();
  const config = useStorefrontConfig();
  const token = useStorefrontTokenStyle();
  const { t, lang } = useSfT();
  const [params, setParams] = useSearchParams();
  const currency = shopDetails?.currency || 'USD';

  // `searchInput` drives the field; `search` (debounced) drives filtering +
  // auto-paging so keystrokes don't hammer fetchMoreProducts across the catalog.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Section "View all" links can pass ?sort=bestSellers|newArrivals|recommended,
  // which aren't real sort options — fall back to newest so the Select never
  // renders blank and ordering stays sensible.
  const rawSort = params.get('sort');
  const sort = SORTS.some((s) => s.value === rawSort) ? (rawSort as string) : 'newest';
  const promotionId = params.get('promotion');
  const layout = config.pages.products.layout;
  const filtersMode = config.pages.products.filters;
  const visibility = config.pages.products.filterVisibility ?? {};
  const show = (key: string) => isFilterVisible(visibility, key);

  // ── Facet state ─────────────────────────────────────────────────────────────
  // Categories are multi-select; the ?category= URL param (nav links, category
  // grid) seeds the selection and stays shareable.
  const urlCategory = params.get('category') || '';
  const [categories, setCategories] = useState<string[]>(urlCategory ? [urlCategory] : []);
  useEffect(() => { setCategories(urlCategory ? [urlCategory] : []); }, [urlCategory]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [attrSel, setAttrSel] = useState<Record<string, string[]>>({});
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v && v !== 'all') next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const toggleCategory = (c: string) => {
    setCategories((prev) => toggleIn(prev, c));
    // Keep the URL param meaningful for single selections; drop it otherwise.
    if (urlCategory) setParam('category', '');
  };
  const toggleAttr = (key: string, value: string) =>
    setAttrSel((prev) => ({ ...prev, [key]: toggleIn(prev[key] || [], value) }));

  // Price facet: bounds follow the loaded catalog until the user touches the
  // slider, then their range sticks.
  const maxPrice = useMemo(() => {
    let max = 0;
    products.forEach((p) => {
      const v = convertCurrency(p.price, p.currency) ?? 0;
      if (v > max) max = v;
    });
    return Math.max(1, Math.ceil(max));
  }, [products, convertCurrency]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1]);
  const priceTouched = useRef(false);
  useEffect(() => {
    if (!priceTouched.current) setPriceRange(([lo]) => [lo, maxPrice]);
  }, [maxPrice]);
  const priceActive = priceTouched.current && (priceRange[0] > 0 || priceRange[1] < maxPrice);

  // ── Derived catalog facts ───────────────────────────────────────────────────
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [products]);

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    products.forEach((p) => p.category && m.set(p.category, (m.get(p.category) || 0) + 1));
    return m;
  }, [products]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => (p as any).tags?.forEach((t: string) => t && set.add(t)));
    return Array.from(set).sort();
  }, [products]);

  // Review summaries (single batched query, session-cached) — powers the
  // rating facet and the "Top Rated" sort.
  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const ratings = useProductRatings(capabilities?.reviews ? productIds : []);

  // Real purchase options live in product_variants — fold each product's
  // variant options into its details so facets and matching see them too.
  const variantMap = useVariantOptionsMap(productIds);
  const augmentedDetails = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>();
    products.forEach((p: any) => {
      const vo = variantMap[p.id]?.options;
      m.set(p.id, vo && Object.keys(vo).length ? { ...(p.details || {}), ...vo } : (p.details || {}));
    });
    return m;
  }, [products, variantMap]);
  const facetProducts = useMemo(
    () => products.map((p) => ({ id: p.id, details: augmentedDetails.get(p.id) })),
    [products, augmentedDetails]
  );

  const { options: optionKeys, specs: specKeys } = useMemo(
    () => deriveAttributeKeys([], facetProducts),
    [facetProducts]
  );
  const valuesFor = useMemo(() => {
    const cache = new Map<string, string[]>();
    return (key: string) => {
      if (!cache.has(key)) cache.set(key, attributeValues(key, [], facetProducts));
      return cache.get(key)!;
    };
  }, [facetProducts]);

  // When arriving from a promotion announcement, scope the list to that
  // promotion's products.
  const activePromo = useMemo(
    () => (promotionId ? promotions.find((p) => p.id === promotionId) : undefined),
    [promotions, promotionId]
  );
  const promoProductIds = useMemo(
    () => (activePromo?.target_products?.length ? new Set(activePromo.target_products) : null),
    [activePromo]
  );

  const isOutOfStock = (p: any) =>
    p.status === 'Out of Stock' || (p.pricing_type === 'one_time' && (p.inventory ?? 0) <= 0);

  // ── Filtering + sorting ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...products];
    if (promoProductIds) list = list.filter((p) => promoProductIds.has(p.id));
    if (categories.length > 0) list = list.filter((p) => p.category && categories.includes(p.category));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name?.toLowerCase().includes(q) ||
        p.caption?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        ((p as any).sku || '').toLowerCase().includes(q) ||
        (p as any).tags?.some((t: string) => t?.toLowerCase().includes(q))
      );
    }
    const price = (p: any) => convertCurrency(p.price, p.currency) ?? 0;
    if (priceActive) list = list.filter((p) => price(p) >= priceRange[0] && price(p) <= priceRange[1]);
    if (availability.length > 0 && availability.length < AVAILABILITY.length) {
      const wantIn = availability.includes('in');
      list = list.filter((p) => (wantIn ? !isOutOfStock(p) : isOutOfStock(p)));
    }
    if (minRating > 0) {
      list = list.filter((p) => {
        const s = ratings[p.id];
        return !!s && s.count > 0 && s.avg >= minRating;
      });
    }
    if (tags.length > 0) list = list.filter((p) => (p as any).tags?.some((t: string) => tags.includes(t)));
    for (const [key, selected] of Object.entries(attrSel)) {
      if (!selected.length) continue;
      const wanted = selected.map((v) => v.trim().toLowerCase());
      list = list.filter((p) => productMatchesAttr(augmentedDetails.get(p.id) ?? (p as any).details, key, wanted));
    }
    switch (sort) {
      case 'price-asc': list.sort((a, b) => price(a) - price(b)); break;
      case 'price-desc': list.sort((a, b) => price(b) - price(a)); break;
      case 'name': list.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'rating': list.sort((a, b) => (ratings[b.id]?.avg ?? 0) - (ratings[a.id]?.avg ?? 0) || (ratings[b.id]?.count ?? 0) - (ratings[a.id]?.count ?? 0)); break;
      default: list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [products, promoProductIds, categories, search, priceActive, priceRange, availability, minRating, tags, attrSel, sort, ratings, convertCurrency, augmentedDetails]);

  // ── Active filter chips + clear all ────────────────────────────────────────
  const activeChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; clear: () => void }> = [];
    categories.forEach((c) => chips.push({ id: `cat:${c}`, label: c, clear: () => toggleCategory(c) }));
    if (priceActive) chips.push({
      id: 'price',
      label: `${formatCurrency(priceRange[0], currency)} – ${formatCurrency(priceRange[1], currency)}`,
      clear: () => { priceTouched.current = false; setPriceRange([0, maxPrice]); },
    });
    availability.forEach((a) => {
      const key = AVAILABILITY.find((x) => x.value === a)?.label;
      chips.push({
        id: `avail:${a}`, label: key ? t(key) : a,
        clear: () => setAvailability((prev) => prev.filter((x) => x !== a)),
      });
    });
    if (minRating > 0) chips.push({ id: 'rating', label: `${minRating}★ ${t('andUp')}`, clear: () => setMinRating(0) });
    tags.forEach((t) => chips.push({ id: `tag:${t}`, label: `#${t}`, clear: () => setTags((prev) => prev.filter((x) => x !== t)) }));
    Object.entries(attrSel).forEach(([key, vals]) => vals.forEach((v) =>
      chips.push({ id: `${key}:${v}`, label: `${filterKeyTitle(key)}: ${v}`, clear: () => toggleAttr(key, v) })
    ));
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, priceActive, priceRange, availability, minRating, tags, attrSel, currency, maxPrice, lang]);

  const clearAll = () => {
    setSearchInput('');
    setCategories([]);
    setAvailability([]);
    setMinRating(0);
    setTags([]);
    setAttrSel({});
    priceTouched.current = false;
    setPriceRange([0, maxPrice]);
    setParam('category', '');
    setParam('promotion', '');
  };

  // Search / facets only operate on already-loaded products (infinite scroll),
  // so while any filter is active we auto-page through the rest of the catalog
  // until results converge, surfacing a notice meanwhile.
  const isFiltering = search.trim().length > 0 || activeChips.length > 0 || !!promoProductIds;
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
  // Respect the chosen columns distinctly (2 ≠ 3 ≠ 4 ≠ 5) at desktop, with a
  // sensible responsive ramp. Literal class strings so Tailwind detects them.
  const COL_MAP: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  };
  const gridCls = cn('grid gap-[var(--sf-grid-gap)]', COL_MAP[cols] ?? COL_MAP[4]);

  // Which facets have anything to offer (visibility × data).
  const facetAvailable = {
    categories: show('categories') && allCategories.length > 0,
    priceRange: show('priceRange') && maxPrice > 1,
    availability: show('availability'),
    rating: show('rating') && capabilities?.reviews,
    tags: show('tags') && allTags.length > 0,
    options: optionKeys.filter((k) => show(k) && valuesFor(k).length > 0),
    specs: specKeys.filter((k) => show(k) && valuesFor(k).length > 0),
  };
  const anyFacet =
    facetAvailable.categories || facetAvailable.priceRange || facetAvailable.availability ||
    facetAvailable.rating || facetAvailable.tags || facetAvailable.options.length > 0 || facetAvailable.specs.length > 0;

  // ── Facet panel (shared by sidebar and drawer) ─────────────────────────────
  // JSX helpers (not components!) so the module-level <Facet> keeps its
  // open/closed state across re-renders instead of remounting.
  const renderAttrFacet = (attrKey: string, defaultOpen = true) => {
    const values = valuesFor(attrKey);
    const selected = attrSel[attrKey] || [];
    return (
      <Facet
        key={attrKey}
        title={filterKeyTitle(attrKey)}
        icon={getAttributeIcon(attrKey)}
        active={selected.length > 0}
        onClear={() => setAttrSel((prev) => ({ ...prev, [attrKey]: [] }))}
        defaultOpen={defaultOpen}
      >
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {values.map((v) => (
            <button key={v} onClick={() => toggleAttr(attrKey, v)} className={chipCls(selected.includes(v))}>{v}</button>
          ))}
        </div>
      </Facet>
    );
  };

  const facetPanel = (
    <div className="space-y-4">
      {facetAvailable.categories && (
        <Facet title={t('category')} active={categories.length > 0} onClear={() => { setCategories([]); setParam('category', ''); }}>
          <div className="flex flex-col gap-1">
            {[{ id: '__all', label: t('allProducts'), count: products.length },
              ...allCategories.map((c) => ({ id: c, label: c, count: categoryCounts.get(c) || 0 }))].map((c) => {
              const active = c.id === '__all' ? categories.length === 0 : categories.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => (c.id === '__all' ? (setCategories([]), setParam('category', '')) : toggleCategory(c.id))}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
                    active ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-muted'
                  )}
                >
                  <span className="min-w-0 truncate">{c.label}</span>
                  <span className={cn('shrink-0 text-xs tabular-nums', active ? 'text-primary/70' : 'text-muted-foreground')}>{c.count}</span>
                </button>
              );
            })}
          </div>
        </Facet>
      )}

      {facetAvailable.priceRange && (
        <Facet title={t('price')} active={priceActive} onClear={() => { priceTouched.current = false; setPriceRange([0, maxPrice]); }}>
          <div className="space-y-3 px-1">
            <Slider
              min={0}
              max={maxPrice}
              step={1}
              value={[Math.min(priceRange[0], maxPrice), Math.min(priceRange[1], maxPrice)]}
              onValueChange={(v) => { priceTouched.current = true; setPriceRange([v[0], v[1]]); }}
            />
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium tabular-nums">{formatCurrency(priceRange[0], currency)}</span>
              <span className="text-muted-foreground">—</span>
              <span className="font-medium tabular-nums">{formatCurrency(priceRange[1], currency)}</span>
            </div>
          </div>
        </Facet>
      )}

      {facetAvailable.availability && (
        <Facet title={t('availability')} icon={PackageCheck} active={availability.length > 0} onClear={() => setAvailability([])}>
          <div className="flex flex-wrap gap-1.5">
            {AVAILABILITY.map((a) => (
              <button key={a.value} onClick={() => setAvailability((prev) => toggleIn(prev, a.value))} className={chipCls(availability.includes(a.value))}>
                {t(a.label)}
              </button>
            ))}
          </div>
        </Facet>
      )}

      {facetAvailable.rating && (
        <Facet title={t('rating')} icon={Star} active={minRating > 0} onClear={() => setMinRating(0)}>
          <div className="flex flex-wrap gap-1.5">
            {RATING_STEPS.map((min) => (
              <button
                key={min}
                onClick={() => setMinRating((prev) => (prev === min ? 0 : min))}
                className={cn(chipCls(minRating === min), 'inline-flex items-center gap-1')}
              >
                <Star className={cn('h-3 w-3', minRating === min ? 'fill-current' : 'fill-amber-400 text-amber-400')} />
                {min}+ {t('stars')}
              </button>
            ))}
          </div>
        </Facet>
      )}

      {facetAvailable.tags && (
        <Facet title={t('tags')} icon={Tag} active={tags.length > 0} onClear={() => setTags([])} defaultOpen={false}>
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            {allTags.map((t) => (
              <button key={t} onClick={() => setTags((prev) => toggleIn(prev, t))} className={chipCls(tags.includes(t))}>{t}</button>
            ))}
          </div>
        </Facet>
      )}

      {facetAvailable.options.map((k) => renderAttrFacet(k))}
      {facetAvailable.specs.map((k) => renderAttrFacet(k, false))}
    </div>
  );

  // Shared filter drawer: mobile fallback for sidebar mode, the primary
  // presentation for 'drawer' mode, and the "all filters" surface for topbar.
  // Controlled so re-renders (facet clicks inside it) never close it.
  const filterTrigger = (triggerClassName?: string, triggerLabel?: string) => (
    <Button variant="outline" className={cn('relative', triggerClassName)} onClick={() => setFilterSheetOpen(true)}>
      <SlidersHorizontal className="mr-2 h-4 w-4" /> {triggerLabel ?? t('filters')}
      {activeChips.length > 0 && (
        <span className="ml-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
          {activeChips.length}
        </span>
      )}
    </Button>
  );

  const Toolbar = (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={t('searchPlaceholder')} className="pl-9 pr-9" />
          {searchInput && (
            <button type="button" onClick={() => setSearchInput('')} aria-label={t('clearSearch')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={sort} onValueChange={(v) => setParam('sort', v)}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>{SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{t(s.label)}</SelectItem>)}</SelectContent>
        </Select>
        {anyFacet && filtersMode === 'drawer' && filterTrigger()}
        {anyFacet && filtersMode === 'sidebar' && filterTrigger('lg:hidden')}
        {anyFacet && filtersMode === 'topbar' && filterTrigger(undefined, t('allFilters'))}
      </div>
      {/* Topbar mode: categories as a wrapping chip row — scannable in one glance. */}
      {filtersMode === 'topbar' && facetAvailable.categories && (
        <div className="flex flex-wrap gap-1.5">
          {['all', ...allCategories].map((c) => {
            const active = c === 'all' ? categories.length === 0 : categories.includes(c);
            return (
              <button
                key={c}
                onClick={() => (c === 'all' ? (setCategories([]), setParam('category', '')) : toggleCategory(c))}
                className={chipCls(active)}
              >
                {c === 'all' ? t('all') : c}
              </button>
            );
          })}
        </div>
      )}
      {/* Active filters as removable chips + clear-all. */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              onClick={chip.clear}
              className="sf-chip inline-flex items-center gap-1 !bg-primary/10 !text-primary transition-colors hover:!bg-primary/20"
            >
              {chip.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button onClick={clearAll} className="ml-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            {t('clearAll')}
          </button>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="sf-container py-8">
        <Skeleton className="mb-6 h-10 w-full max-w-md" />
        <div className={gridCls}>{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square w-full" />)}</div>
      </div>
    );
  }

  const heading = activePromo
    ? activePromo.name
    : categories.length === 1 ? categories[0] : t('allProducts');

  return (
    <div className="sf-container py-8">
      {anyFacet && (
        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetContent side="left" aria-describedby={undefined} className={cn('w-80 overflow-y-auto bg-background text-foreground', token.className)} style={token.style} {...token.attrs}>
            {/* Sheet is built on the Radix dialog primitive — a11y title required. */}
            <DialogTitle className="sr-only">{t('productFilters')}</DialogTitle>
            <div className="pt-8">{facetPanel}</div>
          </SheetContent>
        </Sheet>
      )}
      <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="sf-heading text-3xl font-bold md:text-4xl">{heading}</h1>
        <span className="text-sm tabular-nums text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? t('productWord') : t('productsWord')}
        </span>
      </div>
      {activePromo && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
          <Tag className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm font-medium">
            {t('showingIn')} <span className="font-semibold">{activePromo.name}</span>
          </span>
          <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1 text-xs" onClick={() => setParam('promotion', '')}>
            <X className="h-3.5 w-3.5" /> {t('clear')}
          </Button>
        </div>
      )}
      <div className={cn(filtersMode === 'sidebar' && anyFacet ? 'grid gap-8 lg:grid-cols-[240px_1fr]' : 'block')}>
        {filtersMode === 'sidebar' && anyFacet && (
          <aside className="hidden lg:block">
            <div className="sticky top-24">{facetPanel}</div>
          </aside>
        )}
        <div>
          {Toolbar}
          {isFiltering && hasMoreProducts && (
            <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('loadingRest')}
            </p>
          )}
          {filtered.length === 0 && !(isFiltering && hasMoreProducts) ? (
            <div className="py-16 text-center text-muted-foreground">
              {products.length === 0 ? (
                <><Package className="mx-auto mb-4 h-12 w-12 opacity-40" /><p>{t('noProductsYet')}</p></>
              ) : (
                <>
                  <p className="mb-4">{t('noProductsMatch')}</p>
                  <Button variant="outline" size="sm" onClick={clearAll}>{t('clearFilters')}</Button>
                </>
              )}
            </div>
          ) : filtered.length === 0 ? (
            null
          ) : layout === 'list' ? (
            <div className="space-y-3">{filtered.map((p) => <ProductCard key={p.id} product={p} variant="compact" />)}</div>
          ) : (
            <div className={gridCls}>{filtered.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          )}
          <div ref={sentinel} className="mt-8 flex h-10 items-center justify-center">{isLoadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}</div>
        </div>
      </div>
    </div>
  );
};
