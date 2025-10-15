"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom"; // Removed useOutletContext, useSearchParams
import {
  Link as LinkIcon,
  Package,
  Users,
  Image as ImageIcon,
  Share2,
  ShoppingCart as ShoppingCartIcon, // Import ShoppingCartIcon
} from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLargeNumber } from "@/lib/formatters";
import { motion } from "framer-motion";

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const StorefrontInstagramProfile = () => {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const { shopDetails, products: allProducts, isLoading, error, convertCurrency } = useStorefront(); // Removed appearanceSettings as it's ignored here
  const navigate = useNavigate();

  // No filters or sort options on this page, so these states are removed.
  // The outlet context for filter sidebar is also not needed here.

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
  const totalFollowing = 1; // Hardcoded as per image, or fetch if available

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <main className="flex-1">
        {/* Profile Section */}
        <section className="flex flex-col items-center md:items-start mb-8 md:mb-10 px-4"> {/* Added px-4 */}
          <div className="flex items-center w-full max-w-md md:max-w-none md:justify-start gap-4 md:gap-8 mb-4">
            <Avatar className="h-24 w-24 md:h-28 md:w-28 border-2 border-gray-300"> {/* Adjusted border */}
              <AvatarImage src={shopDetails.logo_url || undefined} alt={shopDetails.shop_name} />
              <AvatarFallback className="text-3xl md:text-4xl font-bold bg-gray-100 text-gray-600">
                {shopDetails.shop_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 grid grid-cols-3 text-center md:text-left gap-2">
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

          <div className="w-full max-w-md md:max-w-none md:pl-0 space-y-1 text-center md:text-left">
            <h2 className="text-base md:text-lg font-semibold">{shopDetails.shop_name}</h2>
            {shopDetails.headline && <p className="text-sm md:text-base text-gray-600">{shopDetails.headline}</p>}
            {shopDetails.about && <p className="text-sm md:text-base text-gray-600">{shopDetails.about}</p>}
            {shopDetails.instagram_url && (
              <a href={shopDetails.instagram_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm md:text-base flex items-center justify-center md:justify-start gap-1">
                <LinkIcon className="h-4 w-4" /> {shopDetails.instagram_url.replace(/^(https?:\/\/)?(www\.)?/i, '').split('/')[0]}
              </a>
            )}
          </div>

          {/* Action Buttons (Simplified for Instagram profile look) */}
          <div className="flex w-full max-w-md md:max-w-none gap-2 mt-6 md:mt-8">
            <Button
              variant="outline"
              className="flex-1 text-sm md:text-base h-9 md:h-10 border-gray-300 bg-gray-50 text-gray-800 hover:bg-gray-100"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share Profile
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-sm md:text-base h-9 md:h-10 border-gray-300 bg-gray-50 text-gray-800 hover:bg-gray-100"
              onClick={() => navigate(`/shop/${shopSlug}/products`)} // Link to full shop products
            >
              <ShoppingCartIcon className="mr-2 h-4 w-4" />
              View Shop
            </Button>
          </div>
        </section>

        {/* Product Grid */}
        <section className="mt-8 md:mt-10">
          <div className="flex items-center justify-center border-t border-gray-200 py-3 mb-6">
            <Package className="h-5 w-5 text-gray-600" /> {/* Generic product icon */}
          </div>
          {allProducts.length === 0 ? (
            <div className="text-center py-16 text-gray-600 border-2 border-dashed rounded-lg mx-4"> {/* Added mx-4 */}
              <h3 className="text-xl md:text-2xl font-semibold">No Products Found</h3>
              <p className="text-sm md:text-base mt-1 md:mt-2">
                It looks like this store doesn't have any products yet.
              </p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 gap-1"
            >
              {allProducts.map((product) => (
                <StorefrontProductCard
                  key={product.id}
                  product={product}
                  shopSlug={shopDetails.slug}
                  className="aspect-square" // Ensure square aspect ratio for grid items
                  externalShopDetails={shopDetails}
                  externalConvertCurrency={convertCurrency}
                  isInstagramStyle={true} // Pass new prop for Instagram styling
                />
              ))}
            </motion.div>
          )}
        </section>
      </main>
    </div>
  );
};

export default StorefrontInstagramProfile;