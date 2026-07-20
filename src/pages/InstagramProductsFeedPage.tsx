"use client";

import { useMemo, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams, useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Package, XCircle, Filter, ArrowUpNarrowWide } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Button } from "@/components/ui/button";
import { InstagramProductCardFull } from "@/components/storefront/InstagramProductCardFull";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui-app";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useReveal } from "@/lib/anim";

interface Product {
  id: string;
  name: string;
  category: string;
  tags: string[];
  price: number | null;
  currency: string | null;
  inventory: number;
  media_url: string;
  media_gallery: string[] | null;
  media_type: string | null;
  thumbnail_url?: string;
  caption: string;
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  details: { [key: string]: any };
  created_at: string;
}

interface FilterState {
  categories: string[];
  tags: string[];
  priceRange: [number, number];
  [key: string]: string[] | [number, number];
}

// Define the type for the OutletContext
interface InstagramShopLayoutContext {
  isFilterDrawerOpen: boolean;
  setIsFilterDrawerOpen: (open: boolean) => void;
  filters: FilterState;
  handleFilterChange: (newFilters: FilterState) => void;
  handleResetFilters: () => void;
  maxPrice: number;
  allProducts: Product[];
  convertCurrency: (amount: number | null | undefined, fromCurrency?: string) => number;
}

const InstagramProductsFeedPage = () => {
  const { t } = useTranslation();
  const { shopSlug, productId: productIdFromUrl } = useParams<{ shopSlug: string; productId: string }>();
  const { shopDetails, products: allProductsFromContext, isLoading, error, convertCurrency: convertCurrencyFromContext, promotions } = useStorefront();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Consume context from InstagramShopLayout
  const {
    isFilterDrawerOpen,
    setIsFilterDrawerOpen,
    filters,
    handleFilterChange,
    handleResetFilters,
    maxPrice,
    allProducts, // Use allProducts from context
    convertCurrency, // Use convertCurrency from context
  } = useOutletContext<InstagramShopLayoutContext>();

  // Derive active sort directly from the URL (single source of truth)
  const sortOption = searchParams.get('sort') || "newest";

  const productRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const setProductRef = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) {
      productRefs.current.set(id, node);
    } else {
      productRefs.current.delete(id);
    }
  }, []);

  useEffect(() => {
    if (productIdFromUrl && productRefs.current.size > 0) {
      const targetElement = productRefs.current.get(productIdFromUrl);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [productIdFromUrl, allProducts]); // Re-run when products load or URL changes

  const handleSortChange = (value: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (value !== 'newest') {
      newSearchParams.set('sort', value);
    } else {
      newSearchParams.delete('sort');
    }
    setSearchParams(newSearchParams, { replace: true });
  };

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = allProducts;

    if (filters.categories.length > 0) {
      filtered = filtered.filter(p => p.category && filters.categories.includes(p.category));
    }

    if (filters.tags.length > 0) {
      filtered = filtered.filter(p => p.tags?.some(tag => filters.tags.includes(tag)));
    }

    filtered = filtered.filter(p => {
      const price = convertCurrency(p.price, p.currency);
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    for (const key in filters) {
      if (key !== 'categories' && key !== 'tags' && key !== 'priceRange' && Array.isArray(filters[key]) && (filters[key] as string[]).length > 0) {
        const selectedValues = filters[key] as string[];
        filtered = filtered.filter(p => {
          const productDetailValue = p.details?.[key];
          if (!productDetailValue) return false;
          if (Array.isArray(productDetailValue)) {
            return productDetailValue.some(val => selectedValues.includes(String(val)));
          }
          return selectedValues.includes(String(productDetailValue));
        });
      }
    }

    return filtered.sort((a, b) => {
      const priceA = convertCurrency(a.price, a.currency);
      const priceB = convertCurrency(b.price, b.currency);

      switch (sortOption) {
        case 'price-asc': return priceA - priceB;
        case 'price-desc': return priceB - priceA;
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'newest':
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [allProducts, sortOption, filters, convertCurrency]);

  const hasActiveFilters = useMemo(() => {
    return filters.categories.length > 0 || filters.tags.length > 0 || filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice;
  }, [filters, maxPrice]);

  // Subtle GSAP entrance for the feed (reduced-motion aware).
  const feedRevealRef = useReveal<HTMLDivElement>({}, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full min-w-0 bg-background text-foreground flex flex-col items-center p-4">
        <div className="w-full md:max-w-[630px] flex flex-col gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="aspect-square w-full rounded-md" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="container py-8 text-destructive text-base md:text-lg">{error}</div>;
  }

  if (!shopDetails) {
    return <div className="container py-8 text-center text-muted-foreground text-base md:text-lg">{t('ig_shop.shop_not_found')}</div>;
  }

  return (
    <div className="min-h-screen w-full min-w-0 bg-background text-foreground flex flex-col">
      {/* InstagramFilterDrawer is now rendered in InstagramShopLayout */}

      <main className="flex-1 pt-0 flex justify-center">
        <div className="w-full md:max-w-[630px]">
        {/* Filter/Sort bar — the mobile header that used to host these is gone. */}
        <div className="flex items-center gap-2 px-3 pb-2 pt-3 md:hidden">
          <Button
            variant="outline" size="sm"
            onClick={() => setIsFilterDrawerOpen(true)}
            className="h-10 flex-1 rounded-xl bg-[hsl(var(--card))] font-semibold text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
          >
            <Filter className="mr-2 h-4 w-4" /> {t('ig_shop.filter')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline" size="sm"
                className="h-10 flex-1 rounded-xl bg-[hsl(var(--card))] font-semibold text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
              >
                {t('ig_shop.sort')} <ArrowUpNarrowWide className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[['newest', t('ig_shop.sort_newest')], ['oldest', t('ig_shop.sort_oldest')], ['price-asc', t('ig_shop.sort_price_asc')], ['price-desc', t('ig_shop.sort_price_desc')], ['name-asc', t('ig_shop.sort_name_asc')], ['name-desc', t('ig_shop.sort_name_desc')]].map(([v, label]) => (
                <DropdownMenuItem key={v} className="text-sm" onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  if (v === 'newest') next.delete('sort'); else next.set('sort', v);
                  setSearchParams(next, { replace: true });
                }}>{label}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Product Grid */}
        <section className="mt-0">
          {filteredAndSortedProducts.length === 0 ? (
            <EmptyState
              className="mx-4"
              icon={Package}
              title={t('ig_shop.no_products_title')}
              description={
                hasActiveFilters
                  ? t('ig_shop.no_products_filtered')
                  : t('ig_shop.no_products_yet')
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={handleResetFilters}>
                    <XCircle className="mr-2 h-4 w-4" />
                    {t('ig_shop.clear_all_filters')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div ref={feedRevealRef} className="flex flex-col">
              {filteredAndSortedProducts.map((product) => (
                <InstagramProductCardFull
                  key={product.id}
                  ref={(node) => setProductRef(product.id, node)} // Set ref for scrolling
                  product={product}
                  shopDetails={shopDetails}
                  convertCurrency={convertCurrency}
                  promotions={promotions}
                />
              ))}
            </div>
          )}
        </section>
        </div>
      </main>
    </div>
  );
};

export default InstagramProductsFeedPage;