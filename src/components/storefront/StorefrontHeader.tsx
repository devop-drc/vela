import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Filter, Search, X } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "../ui/input";

interface StorefrontHeaderProps {
  onToggleFilterSidebar?: () => void;
}

export const StorefrontHeader = ({ onToggleFilterSidebar }: StorefrontHeaderProps) => {
  const { shopDetails, appearanceSettings } = useStorefront();
  const { totalItems } = useCart();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [isMobileSearchInputVisible, setIsMobileSearchInputVisible] = useState(false); // Local state for mobile search input visibility

  if (!shopDetails) return null;

  const blurEnabled = appearanceSettings?.blurEnabled;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const query = formData.get('searchQuery') as string;
    if (query) {
      navigate(`/shop/${shopDetails.slug}?search=${encodeURIComponent(query)}`);
      if (isMobile) setIsMobileSearchInputVisible(false); // Hide mobile search input after search
    }
  };

  return (
    <header className={cn(
      "sticky top-0 z-40 w-full border-b",
      blurEnabled ? "bg-background/80 backdrop-blur-lg" : "bg-background",
      "shadow-md"
    )}>
      <div className="container flex h-16 items-center justify-between">
        <Link to={`/shop/${shopDetails.slug}`} className="flex items-center space-x-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={shopDetails.logo_url} alt={shopDetails.shop_name} />
            <AvatarFallback>{shopDetails.shop_name?.[0]}</AvatarFallback>
          </Avatar>
          <span className="font-bold text-lg">{shopDetails.shop_name}</span>
        </Link>
        <nav className="flex items-center space-x-4">
          <Link to={`/shop/${shopDetails.slug}`} className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}>
            Shop
          </Link>
          {/* Desktop Search Input - Always visible */}
          {!isMobile && (
            <form onSubmit={handleSearchSubmit} className="relative hidden md:flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                name="searchQuery"
                placeholder="Search products..."
                className="pl-9 w-64"
                defaultValue={new URLSearchParams(location.search).get('search') || ''}
              />
            </form>
          )}
          {/* Mobile Search Toggle Button */}
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setIsMobileSearchInputVisible(prev => !prev)}>
              {isMobileSearchInputVisible ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
              <span className="sr-only">{isMobileSearchInputVisible ? "Close Search" : "Open Search"}</span>
            </Button>
          )}
          {isMobile && onToggleFilterSidebar && (
            <Button variant="ghost" size="icon" onClick={onToggleFilterSidebar}>
              <Filter className="h-5 w-5" />
              <span className="sr-only">Open Filters</span>
            </Button>
          )}
          <Link
            to={`/shop/${shopDetails.slug}/cart`}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
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
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </motion.span>
          </Link>
        </nav>
      </div>
      <AnimatePresence>
        {isMobile && isMobileSearchInputVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "overflow-hidden border-t",
              blurEnabled ? "bg-background/80 backdrop-blur-lg" : "bg-background"
            )}
          >
            <form onSubmit={handleSearchSubmit} className="container py-3 flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                name="searchQuery"
                placeholder="Search products..."
                className="flex-1"
                autoFocus
                defaultValue={new URLSearchParams(location.search).get('search') || ''}
              />
              <Button type="submit">Search</Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};