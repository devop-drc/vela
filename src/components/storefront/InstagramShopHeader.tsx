"use client";

import React from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { ShoppingBag, ArrowLeft, ChevronDown } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { motion } from "framer-motion";

interface InstagramShopHeaderProps {
  onOpenCart: () => void;
}

export const InstagramShopHeader = ({ onOpenCart }: InstagramShopHeaderProps) => {
  const { shopDetails } = useStorefront();
  const { totalItems } = useCart();
  const { shopSlug, productId } = useParams<{ shopSlug: string; productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  if (!shopDetails) return null;

  const isProductDetailPage = !!productId;

  const handleBack = () => {
    if (isProductDetailPage) {
      navigate(`/instagramShop/${shopSlug}`);
    } else {
      // Fallback if somehow on root of instagramShop and no product ID
      navigate(`/shop/${shopSlug}`); // Or a more appropriate fallback
    }
  };

  return (
    <header className={cn(
      "sticky top-0 left-0 right-0 z-40 transition-all duration-200",
      "bg-white border-b border-gray-200 text-gray-800 shadow-sm" // Fixed Instagram-like styles
    )}>
      <div className="container flex h-14 items-center justify-between px-4">

        {/* Left Section: Back Button or Shop Name */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {isProductDetailPage ? (
            <Button variant="ghost" size="icon" onClick={handleBack} className="text-gray-800 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">{shopDetails.username || shopDetails.shop_name}</h1>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </div>
          )}
        </div>

        {/* Middle Section: Title for Product Detail Page */}
        {isProductDetailPage && (
          <div className="flex flex-col items-center justify-center flex-1 min-w-0">
            <h2 className="text-base font-semibold truncate">Products</h2>
            <p className="text-xs text-muted-foreground truncate">{shopDetails.username || shopDetails.shop_name}</p>
          </div>
        )}

        {/* Right Section: Shopping Cart */}
        <nav className="flex items-center space-x-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenCart}
            className="relative text-gray-800 hover:bg-gray-100"
          >
            <motion.span
              key={totalItems}
              initial={{ scale: 1 }}
              animate={totalItems > 0 ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
                  {totalItems}
                </span>
              )}
            </motion.span>
          </Button>
        </nav>
      </div>
    </header>
  );
};