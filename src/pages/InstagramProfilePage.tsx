"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Link as LinkIcon,
  Package,
  Users,
  Image as ImageIcon,
  Share2,
  ShoppingCart as ShoppingCartIcon,
  Filter,
  ArrowUpNarrowWide,
  LayoutGrid,
  List,
  XCircle,
  Sparkles,
} from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InstagramProductCard } from "@/components/storefront/InstagramProductCard"; // Using the smaller card
import { Skeleton } from "@/components/ui/skeleton";
import { formatLargeNumber } from "@/lib/formatters";
import { motion } from "framer-motion";
import { Marquee } from "@/components/ui/marquee";
import * as LucideIcons from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InstagramFilterDrawer } from "@/components/storefront/InstagramFilterDrawer";
import { debounce } from 'lodash';
import { InstagramShopHeader } from "@/components/storefront/InstagramShopHeader"; // Import the updated header
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"; // Import DropdownMenu components

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const getIconComponent = (iconName: keyof typeof LucideIcons) => {
  const Icon = LucideIcons[iconName];
  return Icon ? <Icon className="h-5 w-5 text-red-500" /> : <Sparkles className="h-5 w-5 text-red-500" />;
};

const InstagramProfilePage = () => {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const { shopDetails, products: allProducts, isLoading, error, convertCurrency, marqueeElements, promotions } = useStorefront();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sortOption, setSortOption] = useState(searchParams.get('sort') || "newest");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    categories: searchParams.getAll('category') || [],
    tags: searchParams.getAll('tag') || [],
    priceRange: [0, 1000], // Initial dummy value, will be updated by maxPrice
  });

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
    return Math.ceil(currentMax / 10) * 10 || 100;
  }, [allProducts, convertCurrency]);

  useEffect(() => {
    if (filters.priceRange[1] === 1000 && maxPrice !== 1000) {
      setFilters(prev => ({ ...prev, priceRange: [0, maxPrice] }));
    }
  }, [maxPrice, filters.priceRange]);

  useEffect(() => {
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
  }, [searchParams, sortOption]);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    const newSearchParams = new URLSearchParams();
    if (sortOption !== 'newest') newSearchParams.set('sort', sortOption);
    newFilters.categories.forEach(cat => newSearchParams.append('category', cat));
    newFilters.tags.forEach(tag => newSearchParams.append('tag', tag));
    setSearchParams(newSearchParams, { replace: true });
  }, [sortOption, setSearchParams]);

  const handleResetFilters = useCallback(() => {
    setSortOption("newest");
    setFilters({
      categories: [],
      tags: [],
      priceRange: [0, maxPrice],
    });
    setSearchParams({}, { replace: true });
  }, [maxPrice, setSearchParams]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center p-4">
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
    return <div className="container py-8 text-red-600 text-base md:text-lg">{error}</div>;
  }

  if (!shopDetails) {
    return <div className="container py-8 text-center text-gray-600 text-base md:text-lg">Shop details not found.</div>;
  }

  const totalPosts = allProducts.length;
  const totalFollowers = shopDetails.followers_count || 0;
  const totalFollowing = 1; // Placeholder for 'following' count as it's not in shopDetails

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <InstagramFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        products={allProducts}
        currentFilters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
      />

      <main className="flex-1" style={{ paddingTop: 'var(--instagram-header-height)', paddingBottom: 'var(--instagram-bottom-nav-height)' }}>
        {/* Profile Section */}
        <section className="flex flex-col items-center mb-8 md:mb-10 px-4 pt-4">
          <div className="flex items-center w-full max-w-md md:max-w-none md:justify-start gap-4 md:gap-8 mb-4">
            <Avatar className="h-24 w-24 md:h-28 md:w-28 border-2 border-gray-300 flex-shrink-0">
              <AvatarImage src={shopDetails.logo_url || undefined} alt={shopDetails.shop_name} />
              <AvatarFallback className="text-3xl md:text-4xl font-bold bg-gray-100 text-gray-600">
                {shopDetails.shop_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1"> {/* This div will contain the two rows */}
                <h2 className="text-base md:text-lg font-semibold mb-1">{shopDetails.shop_name}</h2> {/* Shop Name */}
                <div className="grid grid-cols-3 text-center gap-2"> {/* Counters row */}
                    <div>
                        <p className="text-lg md:text-xl font-bold">{formatLargeNumber(totalPosts)}</p>
                        <p className="text-xs md:text-sm text-gray-500">posts</p>
                    </div>
                    <div>
                        <p className="text-lg md:text-xl font-bold">{formatLargeNumber(totalFollowers)}</p>
                        <p className="text-xs md:text-sm text-gray-500">followers</p>
                    </div>
                    <div>
                        <p className="text-lg md:text-xl font-bold">{formatLargeNumber(totalFollowing)}</p>
                        <p className="text-xs md:text-sm text-gray-500">following</p>
                    </div>
                </div>
            </div>
          </div>

          <div className="w-full max-w-md md:max-w-none md:pl-0 space-y-1 text-left">
            <p className="text-sm md:text-base text-gray-600">Advertising/marketing</p>
            {shopDetails.headline && <p className="text-sm md:text-base text-gray-600">{shopDetails.headline}</p>}
            {shopDetails.about && <p className="text-sm md:text-base text-gray-600">{shopDetails.about}</p>}
            {shopDetails.instagram_url && (
              <a href={shopDetails.instagram_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm md:text-base flex items-center justify-start gap-1">
                {shopDetails.instagram_url.replace(/^(https?:\/\/)?(www\.)?/i, '').split('/')[0]}
              </a>
            )}
          </div>
        </section>

        {/* Storefront Announcements */}
        {marqueeElements.length > 0 && (
          <section className="my-4">
            <Marquee pauseOnHover className="py-2 border-y border-gray-200 bg-gray-50">
              {marqueeElements.map(element => (
                <div key={element.id} className="flex items-center gap-4 text-sm font-semibold text-gray-800 px-4">
                  {getIconComponent(element.icon_name)}
                  <span>{element.message}</span>
                </div>
              ))}
            </Marquee>
          </section>
        )}

        {/* Filter, Sort, and Grid Icon for Profile Page */}
        <div className="flex flex-col items-center justify-center py-2 mb-6 px-4">
          <div className="flex items-center justify-center gap-2 w-full max-w-md mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterDrawerOpen(true)}
              className="flex-1 text-gray-800 bg-gray-50 border-gray-300 hover:bg-gray-100 rounded-xl h-10 px-4 font-semibold" // Updated styling
            >
              <Filter className="mr-2 h-4 w-4" />
              Filter {hasActiveFilters && <span className="ml-1 text-xs text-red-500">(Active)</span>}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-gray-800 bg-gray-50 border-gray-300 hover:bg-gray-100 rounded-xl h-10 px-4 font-semibold" // Updated styling
                >
                  Sort <ArrowUpNarrowWide className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSortChange("newest")} className="text-sm">Newest</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("oldest")} className="text-sm">Oldest</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("price-asc")} className="text-sm">Price: Low to High</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("price-desc")} className="text-sm">Price: High to Low</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("name-asc")} className="text-sm">Name: A-Z</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("name-desc")} className="text-sm">Name: Z-A</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center justify-center w-full max-w-md">
            <span className="p-2 rounded-md text-gray-800">
                <LayoutGrid className="h-4 w-4" />
            </span>
          </div>
        </div>

        {/* Product Grid */}
        <section className="mt-4">
          {filteredAndSortedProducts.length === 0 ? (
            <div className="text-center py-16 text-gray-600 border-2 border-dashed rounded-lg mx-4">
              <h3 className="text-xl md:text-2xl font-semibold">No Products Found</h3>
              <p className="text-sm md:text-base mt-1 md:mt-2">
                {hasActiveFilters
                  ? "No products match your current filters or search criteria."
                  : "It looks like this store doesn't have any products yet."}
              </p>
              {hasActiveFilters && (
                <Button onClick={handleResetFilters} className="mt-4 text-sm md:text-base bg-red-500 hover:bg-red-600 text-white">
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 gap-1"
            >
              {filteredAndSortedProducts.map((product) => (
                <InstagramProductCard
                  key={product.id}
                  product={product}
                  shopSlug={shopSlug}
                  className="aspect-square"
                  externalShopDetails={shopDetails}
                  externalConvertCurrency={convertCurrency}
                  externalPromotions={promotions}
                />
              ))}
            </motion.div>
          )}
        </section>
      </main>
    </div>
  );
};

export default InstagramProfilePage;