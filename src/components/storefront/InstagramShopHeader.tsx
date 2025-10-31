"use client";

import React from "react";
import { Link, useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { ShoppingBag, ArrowLeft, ChevronDown, Truck, Filter, ArrowUpNarrowWide, LayoutGrid, User, Sparkles } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"; // Import DropdownMenu components

interface InstagramShopHeaderProps {
  onOpenCart: () => void;
  onOpenFilterDrawer: () => void; // Now required
  isProductsFeedPage: boolean; // New prop to indicate if it's the products feed page
  onOpenMyOrders?: () => void; // Optional for profile page
}

export const InstagramShopHeader = ({ onOpenCart, onOpenFilterDrawer, isProductsFeedPage, onOpenMyOrders }: InstagramShopHeaderProps) => {
  const { shopDetails } = useStorefront();
  const { totalItems } = useCart();
  const { shopSlug, productId } = useParams<{ shopSlug: string; productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  if (!shopDetails) return null;

  const isProfilePage = !isProductsFeedPage && !productId; // Profile page is default if not products feed or product detail

  const handleBack = () => {
    if (isProductsFeedPage) {
      // If on the products feed page, go back to the profile page
      navigate(`/instagramShop/${shopSlug}`);
    } else {
      // If on the profile page, go back to the main storefront
      navigate(`/shop/${shopSlug}`);
    }
  };

  const handleSortChange = (value: string) => {
    searchParams.set('sort', value);
    navigate(`/instagramShop/${shopSlug}/products?${searchParams.toString()}`);
  };

  return (
    <header className={cn(
      `fixed md:sticky top-[var(--sat)] left-0 right-0 z-50 transition-all duration-200`,
      "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] border-b border-[hsl(var(--border))]"
    )}>
      {isProfilePage ? (
        <div className="container flex h-full items-center justify-between px-4 py-1">
          <div className="flex items-center flex-shrink-0">
            <p className="text-md font-bold">InstaShop</p>
          </div>
          <div className="flex items-center flex-shrink-0">
            <Button variant="ghost" size="sm" asChild className="text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] px-0">
              <Link to={`/instagramShop/${shopSlug}/products`}>
                <p className="text-md font-bold">Products</p> <ChevronDown className="h-5 w-5 rotate-[-90deg]" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Row 1 */}
          <div className="container flex items-center justify-between pl-1 py-1">
            <div className="flex items-center flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={handleBack} className="text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]">
              <ChevronDown className="h-5 w-5 rotate-[90deg]" />
                <p className="text-md font-bold">Homepage</p> 
            </Button>
          </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenCart}
              className="relative text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
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
          </div>
          {/* Row 2: Filter and Sort */}
          <div className="flex items-center justify-center gap-2 pb-2 px-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenFilterDrawer}
              className="flex-1 bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] rounded-xl h-10 px-4 font-semibold"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] rounded-xl h-10 px-4 font-semibold"
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
        </div>
      )}
    </header>
  );
};