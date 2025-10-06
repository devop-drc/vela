import { useStorefront } from "@/contexts/StorefrontContext";
import { Link, useOutletContext } from "react-router-dom";
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
import { Search, ListFilter, ArrowUpNarrowWide, Tag, XCircle, Filter, ArrowRight, ChevronRight, Sparkles, Gift, Truck, RefreshCw } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { getCategoryColor } from "@/lib/colorUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import { StorefrontFilterSidebar } from "@/components/storefront/StorefrontFilterSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { curatedImages } from "@/contexts/AppearanceContext"; // Import curated images

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

const StorefrontIndex = () => {
  const { shopDetails, products: allProducts, isLoading, error, appearanceSettings, hasMoreProducts, fetchMoreProducts, isLoadingMore } = useStorefront();
  const isMobile = useIsMobile();
  const { onToggleFilterSidebar, isFilterSidebarOpen, setIsFilterSidebarOpen } = useOutletContext<{ onToggleFilterSidebar: () => void; isFilterSidebarOpen: boolean; setIsFilterSidebarOpen: (open: boolean) => void }>();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    tags: [],
    priceRange: "all",
  });
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(false); // Desktop sidebar starts hidden

  const blurEnabled = appearanceSettings?.blurEnabled;
  const observerTarget = useRef<HTMLDivElement>(null); // Ref for the intersection observer target

  useEffect(() => {
    if (!observerTarget.current || !hasMoreProducts || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreProducts && !isLoading && !isLoadingMore) {
          fetchMoreProducts();
        }
      },
      { threshold: 1.0 } // Trigger when 100% of the target is visible
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

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(p => p.category && filters.categories.includes(p.category));
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(p => p.tags?.some(tag => filters.tags.includes(tag)));
    }

    // Price filter
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

    // Dynamic attributes filter
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

    // Sort
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

  const heroBackgroundImage = useMemo(() => {
    if (appearanceSettings?.backgroundImageUrl) {
      return appearanceSettings.backgroundImageUrl;
    }
    // Fallback to a random curated image if no custom background is set
    const randomIndex = Math.floor(Math.random() * curatedImages.length);
    return curatedImages[randomIndex].src;
  }, [appearanceSettings?.backgroundImageUrl]);

  const featuredProducts = useMemo(() => {
    // Take the first 4 products from allProducts as featured
    return allProducts.slice(0, 4);
  }, [allProducts]);

  if (isLoading && allProducts.length === 0) { // Only show initial loading skeleton if no products are loaded yet
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
      {/* Mobile Filter Sidebar (Sheet) */}
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

      {/* Desktop Filter Sidebar (Collapsible Aside) */}
      {!isMobile && (
        <AnimatePresence initial={false}>
          {isDesktopSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '20rem', opacity: 1 }} // w-80
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "hidden lg:flex flex-col border-r h-full flex-shrink-0 sticky top-0 max-h-screen overflow-y-auto",
                blurEnabled ? "bg-card/80 backdrop-blur-lg" : "bg-card"
              )}
            >
              <StorefrontFilterSidebar
                isOpen={true} // Always open when rendered
                onClose={() => setIsDesktopSidebarOpen(false)} // Close button for desktop
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
          {/* Shop Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={cn(
              "mb-12 p-8 md:p-12 rounded-xl text-center relative overflow-hidden",
              blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card",
              "shadow-lg"
            )}
            style={{
              backgroundImage: `url(${heroBackgroundImage})`,
              backgroundSize: appearanceSettings?.backgroundSize || 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: appearanceSettings?.backgroundRepeat || 'no-repeat',
              filter: `
                brightness(${appearanceSettings?.backgroundBrightness || 100}%)
                contrast(${appearanceSettings?.backgroundContrast || 100}%)
                saturate(${appearanceSettings?.backgroundSaturation || 100}%)
                hue-rotate(${appearanceSettings?.backgroundHue || 0}deg)
              `,
            }}
          >
            <div className="absolute inset-0 bg-black/40" /> {/* Dark overlay for text readability */}
            <div className="relative z-10 text-primary-foreground"> {/* Ensure text is above overlay */}
              {shopDetails.logo_url && (
                <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-primary-foreground shadow-md">
                  <AvatarImage src={shopDetails.logo_url} alt={shopDetails.shop_name} />
                  <AvatarFallback className="text-4xl font-bold bg-primary-foreground text-primary">{shopDetails.shop_name?.[0]}</AvatarFallback>
                </Avatar>
              )}
              <h1 className="text-4xl md:text-5xl font-bold font-heading mb-2 leading-tight">
                {shopDetails.shop_name}
              </h1>
              {shopDetails.headline && (
                <p className="text-xl max-w-3xl mx-auto">
                  {shopDetails.headline}
                </p>
              )}
              {/* Value Proposition */}
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <Badge variant="outline" className="text-base px-4 py-2 flex items-center gap-2 text-primary-foreground border-primary-foreground/50 bg-white/20 backdrop-blur-sm">
                  <Sparkles className="h-5 w-5 text-amber-300" />
                  Handcrafted Quality
                </Badge>
                <Badge variant="outline" className="text-base px-4 py-2 flex items-center gap-2 text-primary-foreground border-primary-foreground/50 bg-white/20 backdrop-blur-sm">
                  <Truck className="h-5 w-5 text-blue-300" />
                  Fast & Free Shipping
                </Badge>
                <Badge variant="outline" className="text-base px-4 py-2 flex items-center gap-2 text-primary-foreground border-primary-foreground/50 bg-white/20 backdrop-blur-sm">
                  <RefreshCw className="h-5 w-5 text-emerald-300" />
                  Easy 30-Day Returns
                </Badge>
              </div>
              {/* Featured Products / Promotions (Placeholder) */}
              <div className="mt-10 p-6 border border-primary-foreground/30 rounded-lg bg-black/30 backdrop-blur-sm text-primary-foreground text-center">
                <Gift className="h-8 w-8 mx-auto mb-3" />
                <p className="font-semibold text-lg">Limited Time Offer: 20% Off All New Arrivals!</p>
                <p className="text-sm mt-2">Shop our latest collection and save big. Ends soon!</p>
                <Button asChild className="mt-4">
                  <Link to={`/shop/${shopDetails.slug}#products`}>Shop Now</Link>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Featured Products Section */}
          {featuredProducts.length > 0 && (
            <div className="mb-12">
              <h2 className="text-4xl font-bold font-heading mb-8 text-center">Featured Products</h2>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
              >
                {featuredProducts.map((product) => (
                  <StorefrontProductCard key={product.id} product={product} shopSlug={shopDetails.slug} />
                ))}
              </motion.div>
            </div>
          )}

          {/* Search, Filter, Sort Controls */}
          <div id="products" className={cn(
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
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-2/3 justify-end">
              {isMobile && (
                <Button variant="outline" onClick={onToggleFilterSidebar} className="w-full md:w-auto justify-start">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters ({Object.values(filters).filter(f => (Array.isArray(f) && f.length > 0) || (typeof f === 'string' && f !== 'all')).length})
                </Button>
              )}
              {/* Sort Dropdown */}
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
          
          {filteredAndSortedProducts.length === 0 && !isLoading && !isLoadingMore ? ( // Check for no products after all loading
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
              {Array.from({ length: 4 }).map((_, i) => ( // Show a few skeletons
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          )}
          {!isLoading && hasMoreProducts && (
            <div ref={observerTarget} className="h-1 w-full" /> // Invisible target for observer
          )}
        </div>
      </div>
    </div>
  );
};

export default StorefrontIndex;