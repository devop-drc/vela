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
  Grid3X3,
} from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InstagramProductCard } from "@/components/storefront/InstagramProductCard"; // Using the smaller card
import { Skeleton } from "@/components/ui/skeleton";
import { formatLargeNumber } from "@/lib/formatters";
import { EmptyState, StatusDot } from "@/components/ui-app";
import { useReveal } from "@/lib/anim";
import { Marquee } from "@/components/ui/marquee";
import { getIcon } from '@/lib/iconLibrary';
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

const getIconComponent = (iconName: string) => {
  const Comp = getIcon(iconName);
  return <Comp className="h-5 w-5 text-primary" />;
};

/** Shared profile bio block (headline / about / location / link) — used in both
 *  the desktop and mobile placements so copy/styling only lives in one place. */
const ProfileBio = ({ shopDetails }: { shopDetails: any }) => (
  <>
    {shopDetails.headline && (
      <p className="text-sm md:text-base text-foreground">{shopDetails.headline}</p>
    )}
    {shopDetails.about && (
      <p className="text-sm md:text-base text-foreground">{shopDetails.about}</p>
    )}
    {shopDetails.location && (
      <p className="text-sm font-medium text-muted-foreground md:text-base">{shopDetails.location}</p>
    )}
    {shopDetails.instagram_url && (
      <a
        href={shopDetails.instagram_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline text-sm md:text-base inline-flex items-center gap-1 mt-1"
      >
        <LinkIcon className="h-4 w-4" />
        {shopDetails.instagram_url.replace(/^(https?:\/\/)?(www\.)?/i, '')}
      </a>
    )}
  </>
);

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

  // Derive active sort directly from the URL (single source of truth)
  const sortOption = searchParams.get('sort') || "newest";

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

  // Subtle GSAP entrance for the product grid (reduced-motion aware).
  const gridRevealRef = useReveal<HTMLDivElement>({}, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-4">
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
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-[1px] w-full">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full" />
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* InstagramFilterDrawer is now rendered in InstagramShopLayout */}

      <main className="flex-1 flex justify-center">
        <div className="w-full md:max-w-[1080px] mx-auto">
        {/* Profile Section */}
        <section className="flex flex-col md:flex-row md:items-start md:gap-10 mb-6 md:mb-8 px-3 pt-6 md:pt-10 md:w-[70%] mx-auto justify-center">
          <div className="flex-1 gap-4 md:gap-8 w-full">
            <div className="flex justify-center flex-col md:flex-row">
              <div className="flex flex-row gap-4">
                  <Avatar className="h-24 w-24 md:h-36 md:w-36 border-2 border-border flex-shrink-0 mx-0">
                    <AvatarImage src={shopDetails.logo_url || undefined} alt={shopDetails.shop_name} />
                    <AvatarFallback className="text-3xl md:text-4xl font-bold bg-muted text-foreground">
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
                    <p className="text-sm md:text-base text-muted-foreground">{shopDetails.shop_name}</p>

                    {/* Counts row */}
                    <div className="flex items-center gap-3 md:gap-8 mt-2">
                      <div className="flex flex-col items-center gap-0 text-sm md:text-base">
                        <span className="font-semibold">{formatLargeNumber(totalPosts)}</span>
                        <span className="text-muted-foreground">posts</span>
                      </div>
                      {shopDetails.followers_count != null && (
                        <div className="flex flex-col items-center gap-1 text-sm md:text-base">
                          <span className="font-semibold">{formatLargeNumber(totalFollowers)}</span>
                          <span className="text-muted-foreground">followers</span>
                        </div>
                      )}
                    </div>

                  <div className="hidden md:block">
                    <ProfileBio shopDetails={shopDetails} />
                  </div>
                </div>
              </div>
              <div className="flex-1 xs:mx-auto md:hidden">
                <ProfileBio shopDetails={shopDetails} />
              </div>
            </div>
          </div>
        </section>

        {marqueeElements.length > 0 && (
          <section className="my-2">
            <div className="border-y border-border bg-card">
              <Marquee pauseOnHover className="py-1">
                {marqueeElements.map(element => (
                  <div key={element.id} className="flex items-center gap-4 text-lg font-semibold px-4 text-foreground">
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
              className="flex-1 bg-muted text-foreground border-none hover:bg-muted rounded-xl px-4 py-2 md:px-24 md:py-5 font-semibold"
            >
              <Filter className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              Filter {hasActiveFilters && <StatusDot tone="info" className="ml-1.5" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-muted text-foreground border-none hover:bg-muted rounded-xl px-4 py-2 md:px-24 md:py-5 font-semibold"
                >
                  Sort <ArrowUpNarrowWide className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card text-foreground border-border">
                <DropdownMenuItem onClick={() => handleSortChange("newest")} className="text-sm hover:bg-muted">Newest</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("oldest")} className="text-sm hover:bg-muted">Oldest</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("price-asc")} className="text-sm hover:bg-muted">Price: Low to High</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("price-desc")} className="text-sm hover:bg-muted">Price: High to Low</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("name-asc")} className="text-sm hover:bg-muted">Name: A-Z</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("name-desc")} className="text-sm hover:bg-muted">Name: Z-A</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center justify-center w-full max-w-md mt-5">
            <span className="flex flex-col justify-center items-center">
                <Grid3X3 className="h-7 w-7" strokeWidth={1} />
                <hr className="mt-1 border-foreground border-solid border w-28" />
            </span>
          </div>
        </div>

        {/* Product Grid */}
        <section className="mt-[1px] md:px-0">
          {filteredAndSortedProducts.length === 0 ? (
            <EmptyState
              className="mx-4"
              icon={Package}
              title="No products found"
              description={
                hasActiveFilters
                  ? "No products match your current filters or search criteria."
                  : "It looks like this store doesn't have any products yet."
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={handleResetFilters}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Clear all filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div
              ref={gridRevealRef}
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
            </div>
          )}
        </section>
        </div>
      </main>
    </div>
  );
};

export default InstagramProfilePage;