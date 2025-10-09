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
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { getCategoryColor } from "@/lib/colorUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import { StorefrontFilterSidebar } from "@/components/storefront/StorefrontFilterSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { StorefrontBreadcrumb } from "@/components/storefront/StorefrontBreadcrumb";
import { debounce } from 'lodash'; // Import debounce

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
  [key: string]: string[] | [number, number]; // For dynamic attributes
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const DESKTOP_SIDEBAR_WIDTH = '20rem'; // 320px

const StorefrontAllProducts = () => {
  const { shopDetails, products: allProducts, isLoading, error, appearanceSettings, hasMoreProducts, fetchMoreProducts, isLoadingMore, convertCurrency } = useStorefront();
  const isMobile = useIsMobile();
  const { 
    onToggleFilterSidebar, 
    isFilterSidebarOpen, 
    setIsFilterSidebarOpen, 
    isDesktopFilterSidebarOpen, // New context prop
    setIsDesktopFilterSidebarOpen, // New context prop
  } = useOutletContext<{ 
    onToggleFilterSidebar: () => void; 
    isFilterSidebarOpen: boolean; 
    setIsFilterSidebarOpen: (open: boolean) => void;
    isDesktopFilterSidebarOpen: boolean;
    setIsDesktopFilterSidebarOpen: (open: boolean) => void;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "");
  const [sortOption, setSortOption] = useState(searchParams.get('sort') || "newest");
  const [filters, setFilters] = useState<FilterState>({
    categories: searchParams.getAll('category') || [],
    tags: searchParams.getAll('tag') || [],
    priceRange: [0, 1000], // Default max price, will be updated by maxPrice from useMemo
  });
  
  const blurEnabled = appearanceSettings?.blurEnabled;
  const borderRadius = appearanceSettings?.['--radius'] || '0.5rem';
  const isFloatingLayout = appearanceSettings?.layoutStyle === 'floating';
  const observerTarget = useRef<HTMLDivElement>(null);

  // Determine max price for the slider
  const maxPrice = useMemo(() => {
    let currentMax = 0;
    allProducts.forEach(p => {
      if (p.price !== null) {
        const convertedPrice = convertCurrency(p.price, p.currency);
        if (convertedPrice > currentMax) {
          currentMax = convertedPrice;
        }
      }
    });
    return Math.ceil(currentMax / 10) * 10 || 100; // Round up to nearest 10, or 100 if no products
  }, [allProducts, convertCurrency]);

  useEffect(() => {
    // Initialize priceRange with maxPrice once it's determined
    if (filters.priceRange[1] === 1000 && maxPrice !== 1000) { // Only update if default and maxPrice is different
      setFilters(prev => ({ ...prev, priceRange: [0, maxPrice] }));
    }
  }, [maxPrice, filters.priceRange]);

  useEffect(() => {
    const urlSearchTerm = searchParams.get('search');
    if (urlSearchTerm !== null && urlSearchTerm !== searchTerm) {
      setSearchTerm(urlSearchTerm);
    } else if (urlSearchTerm === null && searchTerm) {
      setSearchTerm("");
    }

    const urlCategories = searchParams.getAll('category');
    const urlTags = searchParams.getAll('tag');
    const urlSort = searchParams.get('sort');

    setFilters(prev => {
      const newFilters = { ...prev };
      if (JSON.stringify(urlCategories) !== JSON.stringify(prev.categories)) {
        newFilters.categories = urlCategories;
      }
      if (JSON.stringify(urlTags) !== JSON.stringify(prev.tags)) {
        newFilters.tags = urlTags;
      }
      return newFilters;
    });

    if (urlSort !== null && urlSort !== sortOption) {
      setSortOption(urlSort);
    } else if (urlSort === null && sortOption !== 'newest') {
      setSortOption('newest');
    }

  }, [searchParams, searchTerm, filters.categories, filters.tags, sortOption]);

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
    // Update URL search params based on new filters
    const newSearchParams = new URLSearchParams();
    if (searchTerm) newSearchParams.set('search', searchTerm);
    if (sortOption !== 'newest') newSearchParams.set('sort', sortOption);
    newFilters.categories.forEach(cat => newSearchParams.append('category', cat));
    newFilters.tags.forEach(tag => newSearchParams.append('tag', tag));
    // Price range and other dynamic attributes can also be added if needed
    setSearchParams(newSearchParams, { replace: true });
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSortOption("newest");
    setFilters({
      categories: [],
      tags: [],
      priceRange: [0, maxPrice],
    });
    setSearchParams({}, { replace: true }); // Clear all search params
  };

  const debouncedSetSearchTerm = useCallback(
    debounce((query: string) => {
      setSearchTerm(query); // Update local state immediately for responsive input
      const newSearchParams = new URLSearchParams(searchParams);
      if (query) {
        newSearchParams.set('search', query);
      } else {
        newSearchParams.delete('search');
      }
      setSearchParams(newSearchParams, { replace: true });
    }, 300),
    [searchParams, setSearchParams]
  );

  const handleLocalSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    debouncedSetSearchTerm(query); // Debounce the actual search param update
  };

  const handleSortChange = (value: string) => {
    setSortOption(value);
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

    // Apply price range filter using converted prices
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
  }, [allProducts, searchTerm, sortOption, filters, convertCurrency]);

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

  const hasActiveFilters = searchTerm || sortOption !== 'newest' || filters.categories.length > 0 || filters.tags.length > 0 || filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice;

  const headerHeight = '3.5rem'; // 56px for mobile, 64px for desktop
  const floatingHeaderOffset = '1rem'; // 16px

  // Calculate dynamic padding for main content
  const mainContentPaddingLeft = !isMobile && isDesktopFilterSidebarOpen
    ? `calc(${DESKTOP_SIDEBAR_WIDTH} + 2rem)` // Sidebar width + gap
    : '0';

  // Calculate top position for sticky elements (like the filter/sort bar)
  const stickyBarTop = isFloatingLayout 
    ? `calc(${headerHeight} + ${floatingHeaderOffset} + ${floatingHeaderOffset})` 
    : `calc(${headerHeight} + 1rem)`; // 1rem for some spacing below header

  if (isLoading && allProducts.length === 0) {
    return (
      <div className="container py-6 md:py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 md:mb-8">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." className="pl-10 text-sm" disabled />
          </div>
          <div className="flex gap-2 w-full md:w-2/3 justify-end">
            <Skeleton className="h-9 w-24 md:h-10 md:w-32" />
            <Skeleton className="h-9 w-24 md:h-10 md:w-32" />
            <Skeleton className="h-9 w-24 md:h-10 md:w-32" />
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
    return <div className="container py-8 text-destructive text-base md:text-lg">{error}</div>;
  }

  if (!shopDetails) {
    return <div className="container py-8 text-center text-muted-foreground text-base md:text-lg">Shop details not found.</div>;
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
        <StorefrontFilterSidebar
          isOpen={isDesktopFilterSidebarOpen}
          onClose={() => setIsDesktopFilterSidebarOpen(false)}
          products={allProducts}
          currentFilters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          isMobile={false}
        />
      )}

      <div className="flex-1 transition-all duration-200" style={{ paddingLeft: mainContentPaddingLeft }}>
        <div className="container py-6 md:py-8">
          <StorefrontBreadcrumb />

          {/* Filter and Sort Bar (Mobile only, Desktop controls are in Header) */}
          {isMobile && (
            <div className={cn(
              "sticky z-30 py-3 md:py-4 -mx-4 px-4 md:-mx-6 md:px-6 mb-6 md:mb-8 border-b border-t shadow-md flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4",
              blurEnabled ? "bg-background/80 backdrop-blur-[20px]" : "bg-background"
            )} style={{ borderRadius: borderRadius, top: stickyBarTop }}>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button variant="outline" onClick={onToggleFilterSidebar} className="w-full md:w-auto justify-start text-sm h-9">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters ({Object.values(filters).filter(f => (Array.isArray(f) && f.length > 0) || (typeof f === 'string' && f !== 'all')).length})
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-2/3 justify-end">
                <Select value={sortOption} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-full md:w-[180px] h-9 md:h-10 text-sm">
                    <ArrowUpNarrowWide className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest" className="text-sm">Newest</SelectItem>
                    <SelectItem value="oldest" className="text-sm">Oldest</SelectItem>
                    <SelectItem value="price-asc" className="text-sm">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc" className="text-sm">Price: High to Low</SelectItem>
                    <SelectItem value="name-asc" className="text-sm">Name: A-Z</SelectItem>
                    <SelectItem value="name-desc" className="text-sm">Name: Z-A</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" onClick={handleResetFilters} className="w-full md:w-auto text-sm h-9 md:h-10">
                    <XCircle className="mr-2 h-4 w-4" />
                    Reset Filters
                  </Button>
                )}
              </div>
            </div>
          )}

          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-8 md:mb-10 text-center">All Products</h2>
          
          {filteredAndSortedProducts.length === 0 && !isLoading && !isLoadingMore ? (
            <div className="text-center py-16 md:py-20 text-muted-foreground border-2 border-dashed rounded-lg">
              <h3 className="text-xl md:text-2xl font-semibold">No Products Found</h3>
              <p className="text-sm md:text-base mt-1 md:mt-2">
                {hasActiveFilters
                  ? "No products match your current filters or search criteria."
                  : "It looks like this store doesn't have any products yet. Come back later! :)"}
              </p>
              {hasActiveFilters && (
                <Button onClick={handleResetFilters} className="mt-4 text-sm md:text-base">
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-12 md:space-y-16">
              {Object.entries(groupedProducts).map(([category, productsInCategory]) => (
                <div key={category}>
                  <h3 className={cn(
                    "text-2xl md:text-3xl font-bold font-heading mb-6 md:mb-8 inline-block px-3 py-1 md:px-4 md:py-2 rounded-md",
                    blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card",
                    "bg-primary/10 text-primary border-primary/30",
                    "shadow-sm"
                  )}>
                    {category}
                  </h3>
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mt-12 md:mt-16">
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