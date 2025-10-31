"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link, useParams, useNavigate, useSearchParams, useOutletContext } from "react-router-dom"; // Import useOutletContext
import {
  Link as LinkIcon,
  Package,
  Users,
  Image as ImageIcon,
  Share2,
  ShoppingCart as ShoppingCartIcon,
  LayoutGrid,
  Filter,
  ArrowUpNarrowWide,
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const getIconComponent = (iconName: keyof typeof LucideIcons) => {
  const Icon = LucideIcons[iconName] as unknown as React.ElementType | undefined;
  const Comp = Icon ?? Sparkles;
  return <Comp className="h-5 w-5 text-red-500" />;
};

const InstagramProfilePage = () => {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const { shopDetails, products: allProductsFromContext, isLoading, error, convertCurrency: convertCurrencyFromContext, marqueeElements, promotions } = useStorefront();
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

  const [sortOption, setSortOption] = useState(searchParams.get('sort') || "newest");

  useEffect(() => {
    const urlSort = searchParams.get('sort');
    if (urlSort !== null && urlSort !== sortOption) {
      setSortOption(urlSort);
    } else if (urlSort === null && sortOption !== 'newest') {
      setSortOption('newest');
    }
  }, [searchParams, sortOption]);

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
        <div className="grid grid-cols-5 gap-1 w-full max-w-md">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full" />
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
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex flex-col">
      {/* InstagramFilterDrawer is now rendered in InstagramShopLayout */}

      <main className="flex-1 flex justify-center">
        <div className="w-full md:max-w-[1080px] mx-auto">
        {/* Profile Section */}
        <section className="flex flex-col md:flex-row md:items-start md:gap-10 mb-6 md:mb-8 px-3 pt-6 md:pt-10 md:w-[70%] mx-auto justify-center">
          <div className="flex-1 gap-4 md:gap-8 w-full">
            <div className="flex justify-center flex-col md:flex-row">
              <div className="flex flex-row gap-4">
                  <Avatar className="h-24 w-24 md:h-36 md:w-36 border-2 flex-shrink-0 mx-0" style={{borderColor:'hsl(var(--border))'}}>
                    <AvatarImage src={shopDetails.logo_url || undefined} alt={shopDetails.shop_name} />
                    <AvatarFallback className="text-3xl md:text-4xl font-bold" style={{backgroundColor:'hsl(var(--muted))', color:'hsl(var(--foreground))'}}>
                      {shopDetails.shop_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                <div className="flex-col">
                    {/* Handle */}
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-xl md:text-2xl font-semibold leading-tight">
                        {(() => {
                          const fromUrl = shopDetails.instagram_url?.replace(/^(https?:\/\/)?(www\.)?/i, '').split('/')[1];
                          return fromUrl || shopDetails.shop_name?.toLowerCase().replace(/\s+/g,'_') || '';
                        })()}
                      </h1>
                    </div>

                    {/* Name */}
                    <p className="text-sm md:text-base" style={{color:'hsl(var(--muted-foreground))'}}>{shopDetails.shop_name}</p>

                    {/* Counts row */}
                    <div className="flex items-center gap-3 md:gap-8 mt-2">
                      <div className="flex flex-col items-center gap-0 text-sm md:text-base">
                        <span className="font-semibold">{formatLargeNumber(totalPosts)}</span>
                        <span style={{color:'hsl(var(--muted-foreground))'}}>posts</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 text-sm md:text-base">
                        <span className="font-semibold">{formatLargeNumber(totalFollowers)}</span>
                        <span style={{color:'hsl(var(--muted-foreground))'}}>followers</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 text-sm md:text-base">
                        <span className="font-semibold">{formatLargeNumber(totalFollowing)}</span>
                        <span style={{color:'hsl(var(--muted-foreground))'}}>following</span>
                      </div>
                    </div>

                  <div className="hidden md:block">
                    {/* Category */}
                  <p className="mt-2 text-sm md:text-base font-normal" style={{color:'hsl(var(--muted-foreground))'}}>Advertising/Marketing</p>

                  {/* Bio */}
                  {shopDetails.headline && (
                    <p className="text-sm md:text-base" style={{color:'hsl(var(--foreground))'}}>{shopDetails.headline}</p>
                  )}
                  {shopDetails.about && (
                    <p className="text-sm md:text-base" style={{color:'hsl(var(--foreground))'}}>{shopDetails.about}</p>
                  )}

                    <p className="text-sm font-medium text-[hsl(var(--muted-foreground))] md:text-base">Test{shopDetails.location}</p>

                  {/* Website link */}
                  {shopDetails.instagram_url && (
                    <a
                      href={shopDetails.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline text-sm md:text-base inline-flex items-center gap-1 mt-1"
                    >
                      <LinkIcon className="h-4 w-4" />
                      {shopDetails.instagram_url.replace(/^(https?:\/\/)?(www\.)?/i, '')}
                    </a>
                  )}
                  </div>
                </div>
              </div>
              <div className="flex-1 xs:mx-auto md:hidden">
                  {/* Category */}
                  <p className="mt-2 text-sm md:text-base font-normal" style={{color:'hsl(var(--muted-foreground))'}}>Advertising/Marketing</p>

                  {/* Bio */}
                  {shopDetails.headline && (
                    <p className="text-sm md:text-base" style={{color:'hsl(var(--foreground))'}}>{shopDetails.headline}</p>
                  )}
                  {shopDetails.about && (
                    <p className="text-sm md:text-base" style={{color:'hsl(var(--foreground))'}}>{shopDetails.about}</p>
                  )}

                    <p className="text-sm font-medium text-[hsl(var(--muted-foreground))] md:text-base">Test{shopDetails.location}</p>

                  {/* Website link */}
                  {shopDetails.instagram_url && (
                    <a
                      href={shopDetails.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline text-sm md:text-base inline-flex items-center gap-1 mt-1"
                    >
                      <LinkIcon className="h-4 w-4" />
                      {shopDetails.instagram_url.replace(/^(https?:\/\/)?(www\.)?/i, '')}
                    </a>
                  )}
              </div>
            </div>
          </div>
        </section>
        
        {marqueeElements.length > 0 && (
          <section className="my-2">
            <div className="border-y bg-[hsl(var(--card))]" style={{borderColor: 'hsl(var(--border))'}}>
              <Marquee pauseOnHover className="py-1">
                {marqueeElements.map(element => (
                  <div key={element.id} className="flex items-center gap-4 text-lg font-semibold px-4 text-[hsl(var(--foreground))]">
                    {getIconComponent(element.icon_name)}
                    <span>{element.message}</span>
                  </div>
                ))}
              </Marquee>
            </div>
          </section>
        )}

        <div className="flex flex-col items-center justify-center pt-1 mb-0 px-4">
          <div className="flex items-center justify-center gap-2 w-full md:w-[60%] px-2 md:px-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsFilterDrawerOpen(true);
              }}
              className="flex-1 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border-none hover:bg-[hsl(var(--muted))] rounded-xl px-4 py-2 md:px-24 md:py-5 font-semibold"
            >
              <Filter className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              Filter {hasActiveFilters && <span className="ml-1 text-xs text-red-500">(Active)</span>}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border-none hover:bg-[hsl(var(--muted))] rounded-xl px-4 py-2 md:px-24 md:py-5 font-semibold"
                >
                  Sort <ArrowUpNarrowWide className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-[hsl(var(--border))]">
                <DropdownMenuItem onClick={() => handleSortChange("newest")} className="text-sm hover:bg-[hsl(var(--muted))]">Newest</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("oldest")} className="text-sm hover:bg-[hsl(var(--muted))]">Oldest</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("price-asc")} className="text-sm hover:bg-[hsl(var(--muted))]">Price: Low to High</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("price-desc")} className="text-sm hover:bg-[hsl(var(--muted))]">Price: High to Low</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("name-asc")} className="text-sm hover:bg-[hsl(var(--muted))]">Name: A-Z</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("name-desc")} className="text-sm hover:bg-[hsl(var(--muted))]">Name: Z-A</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center justify-center w-full max-w-md mt-5">
            <span className="flex flex-col justify-center items-center">
                <LucideIcons.Grid3X3 className="h-7 w-7" stroke-weight="1" />
                <hr className="mt-1 border-[hsl(var(--foreground))] border-solid border-[1px] w-28" />
            </span>
          </div>
        </div>

        {/* Product Grid */}
        <section className="mt-[1px] md:px-0">
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
              className="grid grid-cols-3 lg:grid-cols-5 gap-[1px]"
            >
              {filteredAndSortedProducts.map((product) => (
                <InstagramProductCard
                  key={product.id}
                  product={product}
                  shopSlug={shopSlug}
                  className="aspect-[3/4]"
                  externalShopDetails={shopDetails}
                  externalConvertCurrency={convertCurrency}
                  externalPromotions={promotions}
                />
              ))}
            </motion.div>
          )}
        </section>
        </div>
      </main>
    </div>
  );
};

export default InstagramProfilePage;