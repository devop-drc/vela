import { useStorefront } from "@/contexts/StorefrontContext";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Button, buttonVariants } from "@/components/ui/button"; // Import buttonVariants
import { Search, ListFilter, ArrowUpNarrowWide, Tag, XCircle, Filter, ArrowRight } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { getCategoryColor } from "@/lib/colorUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import { StorefrontFilterSidebar } from "@/components/storefront/StorefrontFilterSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const { shopDetails, products, isLoading, error, appearanceSettings } = useStorefront();
  const isMobile = useIsMobile();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    tags: [],
    priceRange: "all",
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const blurEnabled = appearanceSettings?.blurEnabled;

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
    let filtered = products;

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
  }, [products, searchTerm, sortOption, filters]);

  const groupedProducts = useMemo(() => {
    return filteredAndSortedProducts.reduce((acc, product) => {
      const category = product.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {} as { [key: string]: typeof products });
  }, [filteredAndSortedProducts]);

  const hasActiveFilters = searchTerm || sortOption !== 'newest' || Object.values(filters).some(f => (Array.isArray(f) && f.length > 0) || (typeof f === 'string' && f !== 'all'));

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="mb-12 p-8 md:p-12 rounded-xl text-center shadow-lg bg-card/70 backdrop-blur-lg">
          <div className="h-10 w-3/4 mx-auto mb-4 bg-muted rounded" />
          <div className="h-6 w-1/2 mx-auto bg-muted rounded" />
        </div>
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
      <StorefrontFilterSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        products={products}
        currentFilters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        isMobile={isMobile}
      />

      <div className="flex-1">
        <div className="container py-8">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={cn(
              "mb-16 p-8 md:p-16 rounded-xl text-center", // Increased padding and margin-bottom
              blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card",
              "shadow-lg"
            )}
          >
            {shopDetails.logo_url && (
              <Avatar className="h-28 w-28 mx-auto mb-6 border-4 border-primary shadow-md"> {/* Larger avatar */}
                <AvatarImage src={shopDetails.logo_url} alt={shopDetails.shop_name} />
                <AvatarFallback className="text-4xl font-bold">{shopDetails.shop_name?.[0]}</AvatarFallback>
              </Avatar>
            )}
            <h1 className="text-5xl md:text-6xl font-bold font-heading mb-4 leading-tight"> {/* Larger headline */}
              {shopDetails.headline || `Welcome to ${shopDetails.shop_name}!`}
            </h1>
            {shopDetails.about && (
              <p className="text-lg text-muted-foreground max-w-4xl mx-auto mb-8"> {/* Wider paragraph, added margin-bottom */}
                {shopDetails.about}
              </p>
            )}
            <Link
              to={`/shop/${shopDetails.slug}#products`}
              className={cn(buttonVariants({ size: "lg" }), "flex items-center")} // Apply button styles directly
            >
              Shop Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </motion.div>

          {/* Search, Filter, Sort Controls */}
          <div id="products" className={cn( // Added ID for scrolling
            "sticky top-16 z-30 py-4 -mx-4 px-4 md:-mx-6 md:px-6 mb-8 border-b border-t shadow-sm", // Added shadow-sm
            blurEnabled ? "bg-background/80 backdrop-blur-lg" : "bg-background"
          )}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-1/3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-2/3 justify-end">
                {isMobile && (
                  <Button variant="outline" onClick={() => setIsSidebarOpen(true)} className="w-full md:w-auto justify-start">
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
          </div>

          <h2 className="text-3xl font-bold font-heading mb-8 text-center">Our Products</h2>
          
          {filteredAndSortedProducts.length === 0 ? (
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
            <div className="space-y-12">
              {Object.entries(groupedProducts).map(([category, productsInCategory]) => (
                <div key={category}>
                  <h3 className={cn(
                    "text-2xl font-bold font-heading mb-6 inline-block px-4 py-2 rounded-lg",
                    blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card",
                    getCategoryColor(category).bg, getCategoryColor(category).text
                  )}>
                    {category}
                  </h3>
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                  >
                    {productsInCategory.map((product) => (
                      <StorefrontProductCard key={product.id} product={product} shopSlug={shopDetails.slug} />
                    ))}
                  </motion.div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Button Placeholder */}
          {filteredAndSortedProducts.length > 0 && (
            <div className="text-center mt-12">
              <Button variant="outline" size="lg">
                Load More Products
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StorefrontIndex;