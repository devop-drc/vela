"use client";

import React from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { ShoppingBag, ArrowLeft, ChevronDown, Truck } from "lucide-react"; // Import Truck icon
import { useStorefront } from "@/contexts/StorefrontContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { motion } from "framer-motion";

interface InstagramShopHeaderProps {
  onOpenCart: () => void;
  onOpenMyOrders: () => void; // New prop for opening My Orders drawer
}

export const InstagramShopHeader = ({ onOpenCart, onOpenMyOrders }: InstagramShopHeaderProps) => {
  const { shopDetails } = useStorefront();
  const { totalItems } = useCart();
  const { shopSlug, productId } = useParams<{ shopSlug: string; productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  if (!shopDetails) return null;

  const isProductDetailPage = !!productId; // Now refers to a product being scrolled to on the feed

  const handleBack = () => {
    if (isProductDetailPage) {
      // If on a specific product within the feed, navigate back to the root of the feed
      navigate(`/instagramShop/${shopSlug}`);
    } else {
      // If on the root of the feed, navigate back to the main storefront
      navigate(`/shop/${shopSlug}`);
    }
  };

  return (
    <header className={cn(
      "sticky top-0 left-0 right-0 z-40 transition-all duration-200",
      "bg-white text-gray-800" // Fixed Instagram-like styles, removed border-b and shadow-sm
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
              <h1 className="text-lg font-bold">Products</h1> {/* Changed title to "Products" */}
              <p className="text-xs text-muted-foreground">{shopDetails.username || shopDetails.shop_name}</p> {/* Username below */}
            </div>
          )}
        </div>

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