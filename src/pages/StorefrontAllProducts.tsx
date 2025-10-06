import { useStorefront } from "@/contexts/StorefrontContext";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { Search, ListFilter, ArrowUpNarrowWide, Tag, XCircle, Filter, ArrowRight, ChevronRight, Sparkles, Gift, Truck, RefreshCw, Crown } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { getCategoryColor } from "@/lib/colorUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import { StorefrontFilterSidebar } from "@/components/storefront/StorefrontFilterSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { StorefrontBreadcrumb } from "@/components/storefront/StorefrontBreadcrumb";

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
  priceRange: string;
  [key: string]: string[] | string; // For dynamic attributes
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const StorefrontAllProducts = () => {
  const { shopDetails, products: allProducts, isLoading, error, appearanceSettings, hasMoreProducts, fetchMoreProducts, isLoadingMore } = useStorefront();
  const isMobile = useIsMobile();
  const { onToggleFilterSidebar, isFilterSidebarOpen, setIsFilterSidebarOpen } = useOutletContext<{ onToggleFilterSidebar: () => void; isFilterSidebarOpen: boolean; setIsFilterSidebarOpen: (open: boolean) => void }>();
  const [searchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "");
  const [sortOption, setSortOption] = useState("newest");
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    tags: [],
    priceRange: "all",
  });
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(false);

  const blurEnabled = appearanceSettings?.blurEnabled;
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const urlSearchTerm = searchParams.get('search');
    if (urlSearchTerm && urlSearchTerm !== searchTerm) {
      setSearchTerm(urlSearchTerm);
    } else if (!urlSearchTerm && searchTerm) {
      setSearchTerm("");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!observerTarget.current || !hasMoreProducts || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreProducts && !isLoading && !isLoadingMore) {
          fetchMoreProducts();
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(observerTarget.current);

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [observerTarget, hasMoreProducts, isLoading, isLoadingMore, fetchMoreProducts]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSortOption("newest");
    setFilters({
      categories: [],
      tags: [],
      priceRange: "all",
    });
  };

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = allProducts;

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filters.categories.length > 0) {
      filtered = filtered.filter(p => p.category && filters.categories.includes(p.category));
    }

    if (filters.tags.length > 0) {
      filtered = filtered.filter(p => p.tags?.some(tag => filters.tags.includes(tag)));
    }

    if (filters.priceRange !== 'all') {
      filtered = filtered.filter(p => {
        const price = p.price || 0;
        switch (filters.priceRange) {
          case 'under-50': return price < 50;
          case '50-100': return price >= 50 && price <= 100;
          case '100-200': return price > 100 && price <= 200;
          case 'over-200': return price > 200;
          default: return true;
        }
      });
    }

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
      switch (sortOption) {
        case 'price-asc': return (a.price || 0) - (b.price || 0);
        case 'price-desc': return (b.price || 0) - (a.price || 0);
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'newest':
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [allProducts, searchTerm, sortOption, filters]);

  const groupedProducts = useMemo(() => {
    return filteredAndSortedProducts.reduce((acc, product) => {
      const category = product.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {} as { [key: string]: typeof allProducts });
  }, [filteredAndSortedProducts]);

  const hasActiveFilters = searchTerm || sortOption !== 'newest' || Object.values(filters).some(f => (Array.isArray(f) && f.length > 0) || (typeof f === 'string' && f !== 'all'));

  if (isLoading && allProducts.length === 0) {
    return (
      <div className="container py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." className="pl-10" disabled />
          </div>
          <div className="flex gap-2 w-full md:w-2/3 justify-end">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="container py-8 text-destructive">{error}</div>;
  }

  if (!shopDetails) {
    return <div className="container py-8 text-center text-muted-foreground">Shop details not found.</div>;
  }

  return (
    <div className="flex">
      {isMobile && (
        <StorefrontFilterSidebar
          isOpen={isFilterSidebarOpen}
          onClose={() => setIsFilterSidebarOpen(false)}
          products={allProducts}
          currentFilters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          isMobile={isMobile}
        />
      )}

      {!isMobile && (
        <AnimatePresence initial={false}>
          {isDesktopSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '20rem', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "hidden lg:flex flex-col border-r h-full flex-shrink-0 sticky top-0 max-h-screen overflow-y-auto",
                blurEnabled ? "bg-card/80 backdrop-blur-lg" : "bg-card"
              )}
            >
              <StorefrontFilterSidebar
                isOpen={true}
                onClose={() => setIsDesktopSidebarOpen(false)}
                products={allProducts}
                currentFilters={filters}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                isMobile={false}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      )}

      <div className="flex-1">
        <div className="container py-8">
          <StorefrontBreadcrumb />

          <div className={cn(
            "sticky top-16 z-30 py-4 -mx-4 px-4 md:-mx-6 md:px-6 mb-8 border-b border-t shadow-md flex flex-col md:flex-row items-center justify-between gap-4",
            blurEnabled ? "bg-background/80 backdrop-blur-lg" : "bg-background"
          )}>
            <div className="flex items-center gap-2 w-full md:w-auto">
              {!isMobile && (
                <Button variant="outline" onClick={() => setIsDesktopSidebarOpen(prev => !prev)} className="flex-shrink-0">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  <ChevronRight className={cn("ml-2 h-4 w-4 transition-transform", isDesktopSidebarOpen && "rotate-180")} />
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-2/3 justify-end">
              {isMobile && (
                <Button variant="outline" onClick={onToggleFilterSidebar} className="w-full md:w-auto justify-start">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters ({Object.values(filters).filter(f => (Array.isArray(f) && f.length > 0) || (typeof f === 'string' && f !== 'all')).length})
                </Button>
              )}
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <ArrowUpNarrowWide className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="name-asc">Name: A-Z</SelectItem>
                  <SelectItem value="name-desc">Name: Z-A</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" onClick={handleResetFilters} className="w-full md:w-auto">
                  <XCircle className="mr-2 h-4 w-4" />
                  Reset Filters
                </Button>
              )}
            </div>
          </div>

          <h2 className="text-4xl font-bold font-heading mb-10 text-center">All Products</h2>
          
          {filteredAndSortedProducts.length === 0 && !isLoading && !isLoadingMore ? (
            <div className={cn(
              "text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg",
              blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
            )}>
              <h3 className="text-xl font-semibold">No Products Found</h3>
              <p className="text-base mt-2">
                It looks like you don't have any active products yet.
                <br />
                Please go to your <Link to="/" className="text-primary hover:underline">dashboard</Link>, then the "Products" section, and set some products to "Active" status to display them here.
              </p>
            </div>
          ) : (
            <div className="space-y-16">
              {Object.entries(groupedProducts).map(([category, productsInCategory]) => (
                <div key={category}>
                  <h3 className={cn(
                    "text-3xl font-bold font-heading mb-8 inline-block px-6 py-3 rounded-full",
                    blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card",
                    getCategoryColor(category).bg, getCategoryColor(category).text, "shadow-md"
                  )}>
                    {category}
                  </h3>
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
                  >
                    {productsInCategory.map((product) => (
                      <StorefrontProductCard key={product.id} product={product} shopSlug={shopDetails.slug} />
                    ))}
                  </motion.div>
                </div>
              ))}
            </div>
          )}

          {isLoadingMore && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mt-16">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          )}
          {!isLoading && hasMoreProducts && (
            <div ref={observerTarget} className="h-1 w-full" />
          )}
        </div>
      </div>
    </div>
  );
};

export default StorefrontAllProducts;