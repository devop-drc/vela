import React, { useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingBag, Filter, Search, X } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "../ui/input";
import { debounce } from 'lodash'; // Import debounce

interface StorefrontHeaderProps {
  onToggleFilterSidebar?: () => void;
  onOpenCart: () => void; // New prop to open the cart modal
}

export const StorefrontHeader = ({ onToggleFilterSidebar, onOpenCart }: StorefrontHeaderProps) => {
  const { shopDetails, appearanceSettings } = useStorefront();
  const { totalItems } = useCart();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [localSearchTerm, setLocalSearchTerm] = useState(searchParams.get('search') || '');
  const [isMobileSearchInputVisible, setIsMobileSearchInputVisible] = useState(false);

  if (!shopDetails) return null;

  const blurEnabled = appearanceSettings?.blurEnabled;
  const borderRadius = appearanceSettings?.['--radius'] || '0.5rem';

  // Debounced function to update search params
  const debouncedSetSearchParam = useCallback(
    debounce((query: string) => {
      if (query) {
        searchParams.set('search', query);
      } else {
        searchParams.delete('search');
      }
      navigate(`/shop/${shopDetails.slug}/products?${searchParams.toString()}`);
    }, 300), // 300ms debounce
    [shopDetails.slug, navigate, searchParams]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setLocalSearchTerm(query);
    debouncedSetSearchParam(query);
  };

  const handleMobileSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    debouncedSetSearchParam(localSearchTerm);
    if (isMobile) setIsMobileSearchInputVisible(false);
  };

  return (
    <header className={cn(
      "sticky top-0 z-40 w-full border-b",
      blurEnabled ? "bg-background/80 backdrop-blur-lg" : "bg-background",
      "shadow-md",
      appearanceSettings?.layoutStyle === 'floating' && "md:fixed md:top-4 md:left-4 md:right-4 md:w-[calc(100%-2rem)] md:max-w-[1400px] md:mx-auto"
    )} style={{ borderRadius: appearanceSettings?.layoutStyle === 'floating' ? borderRadius : '0' }}>
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
            Home
          </Link>
          <Link to={`/shop/${shopDetails.slug}/products`} className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}>
            Products
          </Link>
          {/* Desktop Search Input */}
          {!isMobile && (
            <div className="relative hidden md:flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                name="searchQuery"
                placeholder="Search products..."
                className="pl-9 w-64"
                value={localSearchTerm}
                onChange={handleSearchChange}
              />
            </div>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenCart}
            className="relative"
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
          </Button>
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
            <form onSubmit={handleMobileSearchSubmit} className="container py-3 flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                name="searchQuery"
                placeholder="Search products..."
                className="flex-1"
                autoFocus
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
              />
              <Button type="submit">Search</Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};