"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Link, useParams, useOutletContext, useSearchParams, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Plus,
  Menu,
  Grid,
  Camera,
  Link as LinkIcon,
  Filter,
  ArrowUpNarrowWide,
  Package,
  Users,
  Image as ImageIcon,
  Settings,
  Share2,
  XCircle,
} from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import { StorefrontFilterSidebar } from "@/components/storefront/StorefrontFilterSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { debounce } from 'lodash';
import { formatLargeNumber } from "@/lib/formatters";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile

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

const StorefrontInstagramProfile = () => {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const { shopDetails, products: allProducts, isLoading, error, appearanceSettings, convertCurrency } = useStorefront();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile(); // Use the hook here

  const {
    onToggleFilterSidebar,
    isFilterSidebarOpen,
    setIsFilterSidebarOpen,
    isDesktopFilterSidebarOpen,
    setIsDesktopFilterSidebarOpen,
    setWasDesktopFilterSidebarExplicitlyOpened,
  } = useOutletContext<{
    onToggleFilterSidebar: () => void;
    isFilterSidebarOpen: boolean;
    setIsFilterSidebarOpen: (open: boolean) => void;
    isDesktopFilterSidebarOpen: boolean;
    setIsDesktopFilterSidebarOpen: (open: boolean) => void;
    setWasDesktopFilterSidebarExplicitlyOpened: (open: boolean) => void;
  }>();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "");
  const [sortOption, setSortOption] = useState(searchParams.get('sort') || "newest");
  const [filters, setFilters] = useState<FilterState>({
    categories: searchParams.getAll('category') || [],
    tags: searchParams.getAll('tag') || [],
    priceRange: [0, 1000], // Default max price, will be updated by maxPrice from useMemo
  });

  const blurEnabled = appearanceSettings?.blurEnabled;
  const isPrimaryStyle = appearanceSettings?.sidebarStyle === 'primary'; // Check sidebarStyle

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

  const hasActiveFilters = searchTerm || sortOption !== 'newest' || filters.categories.length > 0 || filters.tags.length > 0 || filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-4">
        <Skeleton className="h-16 w-full mb-4" />
        <div className="flex flex-col items-center mb-8">
          <Skeleton className="h-24 w-24 rounded-full mb-4" />
          <Skeleton className="h-6 w-48 mb-2" />
          <div className="flex gap-4 mb-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-3 gap-1 w-full max-w-md">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
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

  const totalPosts = allProducts.length;
  const totalFollowers = shopDetails.followers_count || 0;
  const totalFollowing = 1; // Hardcoded as per image, or fetch if available

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Mobile Filter Sidebar */}
      <StorefrontFilterSidebar
        isOpen={isFilterSidebarOpen}
        onClose={() => setIsFilterSidebarOpen(false)}
        products={allProducts}
        currentFilters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        isMobile={true}
      />

      {/* Desktop Filter Sidebar */}
      <StorefrontFilterSidebar
        isOpen={isDesktopFilterSidebarOpen}
        onClose={() => setIsDesktopFilterSidebarOpen(false)}
        products={allProducts}
        currentFilters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        isMobile={false}
        setWasDesktopFilterSidebarExplicitlyOpened={setWasDesktopFilterSidebarExplicitlyOpened}
      />

      <div className="flex-1 transition-all duration-200" style={{ paddingLeft: !isMobile && isDesktopFilterSidebarOpen ? 'calc(20rem + 2rem)' : '0' }}>
        {/* Instagram-like Header */}
        <header className={cn(
          "sticky top-0 z-30 flex items-center justify-between h-14 px-4 md:px-6 border-b",
          blurEnabled ? "bg-background/80 backdrop-blur-[20px]" : "bg-background"
        )}>
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold">{shopDetails.username || shopDetails.shop_name}</h1>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Plus className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {/* Profile Section */}
          <section className="flex flex-col items-center md:items-start mb-8 md:mb-10">
            <div className="flex items-center w-full max-w-md md:max-w-none md:justify-start gap-4 md:gap-8 mb-4">
              <Avatar className="h-24 w-24 md:h-28 md:w-28 border-2 border-primary">
                <AvatarImage src={shopDetails.logo_url || undefined} alt={shopDetails.shop_name} />
                <AvatarFallback className="text-3xl md:text-4xl font-bold bg-primary/10 text-primary">
                  {shopDetails.shop_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 grid grid-cols-3 text-center md:text-left gap-2">
                <div>
                  <p className="text-lg md:text-xl font-bold">{formatLargeNumber(totalPosts)}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">posts</p>
                </div>
                <div>
                  <p className="text-lg md:text-xl font-bold">{formatLargeNumber(totalFollowers)}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">followers</p>
                </div>
                <div>
                  <p className="text-lg md:text-xl font-bold">{formatLargeNumber(totalFollowing)}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">following</p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-md md:max-w-none md:pl-0 space-y-1 text-center md:text-left">
              <h2 className="text-base md:text-lg font-semibold">{shopDetails.shop_name}</h2>
              {shopDetails.headline && <p className="text-sm md:text-base text-muted-foreground">{shopDetails.headline}</p>}
              {shopDetails.about && <p className="text-sm md:text-base text-muted-foreground">{shopDetails.about}</p>}
              {shopDetails.instagram_url && (
                <a href={shopDetails.instagram_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm md:text-base flex items-center justify-center md:justify-start gap-1">
                  <LinkIcon className="h-4 w-4" /> {shopDetails.instagram_url.replace(/^(https?:\/\/)?(www\.)?/i, '').split('/')[0]}
                </a>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex w-full max-w-md md:max-w-none gap-2 mt-6 md:mt-8">
              <Button
                variant="outline"
                className="flex-1 text-sm md:text-base h-9 md:h-10"
                onClick={onToggleFilterSidebar}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 text-sm md:text-base h-9 md:h-10"
                  >
                    <ArrowUpNarrowWide className="mr-2 h-4 w-4" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup value={sortOption} onValueChange={handleSortChange}>
                    <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="oldest">Oldest</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="price-asc">Price: Low to High</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="price-desc">Price: High to Low</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name-asc">Name: A-Z</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name-desc">Name: Z-A</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={handleResetFilters} className="w-full max-w-md md:max-w-none text-sm md:text-base mt-2">
                <XCircle className="mr-2 h-4 w-4" />
                Clear All Filters
              </Button>
            )}
          </section>

          {/* Product Grid */}
          <section className="mt-8 md:mt-10">
            <div className="flex items-center justify-center border-t border-b py-3 mb-6">
              <Grid className="h-5 w-5 text-primary" />
            </div>
            {filteredAndSortedProducts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                <h3 className="text-xl md:text-2xl font-semibold">No Products Found</h3>
                <p className="text-sm md:text-base mt-1 md:mt-2">
                  {hasActiveFilters
                    ? "No products match your current filters or search criteria."
                    : "It looks like this store doesn't have any products yet."}
                </p>
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-3 gap-1"
              >
                {filteredAndSortedProducts.map((product) => (
                  <StorefrontProductCard
                    key={product.id}
                    product={product}
                    shopSlug={shopDetails.slug}
                    className="aspect-square" // Ensure square aspect ratio for grid items
                    externalShopDetails={shopDetails}
                    externalAppearanceSettings={appearanceSettings}
                  />
                ))}
              </motion.div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default StorefrontInstagramProfile;