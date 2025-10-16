"use client";

import React from "react";
import { Link, useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom"; // Added useSearchParams
import { ShoppingBag, ArrowLeft, ChevronDown, Truck, Filter, ArrowUpNarrowWide, LayoutGrid } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InstagramShopHeaderProps {
  onOpenCart: () => void;
  onOpenMyOrders: () => void;
}

export const InstagramShopHeader = ({ onOpenCart, onOpenMyOrders }: InstagramShopHeaderProps) => {
  const { shopDetails } = useStorefront();
  const { totalItems } = useCart();
  const { shopSlug, productId } = useParams<{ shopSlug: string; productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  if (!shopDetails) return null;

  const isProductsFeedPage = location.pathname.includes('/products');
  const isProductDetailPage = !!productId; // This is now true if a product ID is in the URL on the feed page

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
      "sticky top-0 left-0 right-0 z-40 transition-all duration-200",
      "bg-white text-gray-800"
    )}>
      <div className="container flex h-14 items-center justify-between px-4">

        {/* Left Section: Back Button or Shop Name */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {isProductsFeedPage ? (
            <Button variant="ghost" size="icon" onClick={handleBack} className="text-gray-800 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">Products</h1>
              <p className="text-xs text-muted-foreground">{shopDetails.username || shopDetails.shop_name}</p>
            </div>
          )}
        </div>

        {/* Middle Section: Filter and Sort on Products Feed Page */}
        {isProductsFeedPage && (
          <div className="flex items-center justify-center gap-2 flex-1 max-w-xs">
            <Button variant="outline" size="sm" onClick={() => { /* Open filter drawer */ }} className="flex-1 text-gray-800 border-gray-300 hover:bg-gray-100 w-1/2">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Select value={searchParams.get('sort') || "newest"} onValueChange={handleSortChange}>
              <SelectTrigger className="flex-1 h-9 text-sm border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200 w-1/2">
                <ArrowUpNarrowWide className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest" className="text-sm">Newest</SelectItem>
                <SelectItem value="oldest" className="text-sm">Oldest</SelectItem>
                <SelectItem value="price-asc" className="text-sm">Price: Low to High</SelectItem>
                <SelectItem value="price-desc" className="text-sm">Price: High to Low</SelectItem>
                <SelectItem value="name-asc" className="text-sm">Name: A-Z</SelectItem>
                <SelectItem value="name-desc" className="text-sm">Name: Z-A</SelectItem>
              </SelectContent>
            </Select>
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