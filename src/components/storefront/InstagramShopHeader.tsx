"use client";

import React, { useState, useCallback } from "react";
import { Link, useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { ShoppingBag, ArrowLeft, Plus, Menu, ShoppingCart as ShoppingCartIcon, ChevronDown } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";

interface InstagramShopHeaderProps {
  onOpenCart: () => void;
  isDesktopSidebarOpen: boolean;
  setIsDesktopFilterSidebarOpen: (open: boolean) => void;
  setWasDesktopFilterSidebarExplicitlyOpened: (open: boolean) => void;
}

export const InstagramShopHeader = ({ onOpenCart, isDesktopSidebarOpen, setIsDesktopFilterSidebarOpen, setWasDesktopFilterSidebarExplicitlyOpened }: InstagramShopHeaderProps) => {
  const { shopDetails, appearanceSettings } = useStorefront();
  const { totalItems } = useCart();
  const { shopSlug, productId } = useParams<{ shopSlug: string; productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  if (!shopDetails) return null;

  const blurEnabled = appearanceSettings?.blurEnabled;
  const isPrimaryStyle = appearanceSettings?.sidebarStyle === 'primary';

  const isProductDetailPage = !!productId;

  const handleBack = () => {
    if (isProductDetailPage) {
      navigate(`/instagramShop/${shopSlug}`);
    } else {
      // This case shouldn't be hit if the layout is only for /instagramShop
      // but as a fallback, navigate to the main shop page
      navigate(`/shop/${shopSlug}`);
    }
  };

  const desktopHeaderStyle: React.CSSProperties = {};
  if (!isMobile && isDesktopSidebarOpen && location.pathname.includes('/instagramShop')) {
    desktopHeaderStyle.left = '20rem'; // Assuming 20rem for desktop sidebar width
    desktopHeaderStyle.width = `calc(100% - 20rem)`;
  }

  return (
    <header className={cn(
      "sticky top-0 left-0 right-0 z-40 transition-all duration-200",
    )} style={desktopHeaderStyle}>
      <div className={cn(
        "container flex h-14 md:h-16 items-center justify-between",
        "shadow-sm", // Always shadow-sm for this header
        isPrimaryStyle
          ? cn(blurEnabled ? "bg-primary/80 backdrop-blur-[20px]" : "bg-primary", "text-primary-foreground")
          : cn(blurEnabled ? "bg-card/80 backdrop-blur-[20px]" : "bg-card", "text-foreground")
      )}>

        {/* Left Section: Back Button or Shop Name */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {isProductDetailPage ? (
            <Button variant="ghost" size="icon" onClick={handleBack} className={isPrimaryStyle ? "text-primary-foreground hover:bg-primary-foreground/10" : ""}>
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold">{shopDetails.username || shopDetails.shop_name}</h1>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Right Section: Shopping Cart */}
        <nav className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenCart}
            className={cn("relative", isPrimaryStyle && "text-primary-foreground hover:bg-primary-foreground/10")}
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
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground text-xs text-primary">
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