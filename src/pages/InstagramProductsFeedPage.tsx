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
import { InstagramProductCardFull } from "@/components/storefront/InstagramProductCardFull";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLargeNumber } from "@/lib/formatters";
import { motion } from "framer-motion";
import { Marquee } from "@/components/ui/marquee";
import * as LucideIcons from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InstagramFilterDrawer } from "@/components/storefront/InstagramFilterDrawer";
import { debounce } from 'lodash';
import { InstagramShopHeader } from "@/components/storefront/InstagramShopHeader"; // Import the updated header

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

const InstagramProductsFeedPage = () => {
  const { shopSlug, productId: productIdFromUrl } = useParams<{ shopSlug: string; productId: string }>();
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

      <main className="flex-1 pt-0"> {/* Removed padding-top as header now handles it */}
        {/* Removed Marquee, Filter/Sort, and Grid Icon */}

        {/* Product Grid */}
        <section className="mt-0"> {/* Removed margin-top */}
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
              className="flex flex-col gap-4" // Changed to flex-col for feed-like layout
            >
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
            </motion.div>
          )}
        </section>
      </main>
    </div>
  );
};

export default InstagramProductsFeedPage;