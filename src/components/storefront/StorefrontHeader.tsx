import React, { useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { ShoppingBag, Filter, Search, X, Menu, Home, Package, Truck, ArrowUpNarrowWide } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "../ui/input";
import { debounce } from 'lodash'; // Import debounce
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DESKTOP_SIDEBAR_WIDTH = '20rem'; // 320px

interface StorefrontHeaderProps {
  onToggleFilterSidebar?: () => void;
  onOpenCart: () => void;
  isDesktopSidebarOpen: boolean; // New prop
  setIsDesktopFilterSidebarOpen: (open: boolean) => void; // New prop to control desktop sidebar
}

export const StorefrontHeader = ({ onToggleFilterSidebar, onOpenCart, isDesktopSidebarOpen, setIsDesktopFilterSidebarOpen }: StorefrontHeaderProps) => {
  const { shopDetails, appearanceSettings } = useStorefront();
  const { totalItems } = useCart();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [localSearchTerm, setLocalSearchTerm] = useState(searchParams.get('search') || '');
  const [isMobileSearchInputVisible, setIsMobileSearchInputVisible] = useState(false);

  if (!shopDetails) return null;

  const blurEnabled = appearanceSettings?.blurEnabled;
  const borderRadius = appearanceSettings?.['--radius'] || '0.5rem';
  const isFloatingLayout = appearanceSettings?.layoutStyle === 'floating';

  const isOnProductsPage = location.pathname.includes('/products');

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

  const handleSortChange = (value: string) => {
    searchParams.set('sort', value);
    navigate(`/shop/${shopDetails.slug}/products?${searchParams.toString()}`);
  };

  const handleDesktopFilterToggle = () => {
    setIsDesktopFilterSidebarOpen(prev => !prev);
  };

  // Dynamic styles for desktop header when sidebar is open
  const desktopHeaderStyle: React.CSSProperties = {};
  if (!isMobile && isDesktopSidebarOpen && isOnProductsPage) {
    desktopHeaderStyle.left = DESKTOP_SIDEBAR_WIDTH;
    desktopHeaderStyle.width = `calc(100% - ${DESKTOP_SIDEBAR_WIDTH})`;
  }

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-40 transition-all duration-200", // Always fixed
      isFloatingLayout ? "md:top-4 md:left-4 md:right-4" : "" // Adjust position for floating on desktop
    )} style={desktopHeaderStyle}> {/* Apply dynamic style here */}
      <div className={cn(
        "container flex h-14 md:h-16 items-center justify-between", // Restored justify-between
        isFloatingLayout
          ? "border rounded-lg shadow-md" // Floating style
          : "border-b shadow-sm", // Docked style
        blurEnabled ? "bg-background/80 backdrop-blur-lg" : "bg-background"
      )} style={{ borderRadius: isFloatingLayout ? borderRadius : '0' }}>

        {/* Left Section: Logo + Name */}
        <div className="flex items-center space-x-2 flex-shrink-0"> {/* Removed flex-1, added flex-shrink-0 */}
          <Link to={`/shop/${shopDetails.slug}`} className="flex items-center space-x-2">
            <Avatar className="h-7 w-7 md:h-8 md:w-8">
              <AvatarImage src={shopDetails.logo_url} alt={shopDetails.shop_name} />
              <AvatarFallback className="text-sm md:text-base">{shopDetails.shop_name?.[0]}</AvatarFallback>
            </Avatar>
            <span className="font-bold text-base md:text-lg">{shopDetails.shop_name}</span>
          </Link>
        </div>

        {/* Middle Section: Desktop Nav Links & Search (always present) / Filters & Sort (conditional) */}
        <div className="flex-1 hidden lg:flex items-center justify-center space-x-4 px-4"> {/* Added flex-1, hidden on mobile */}
          {/* Desktop Navigation Links */}
          <Link to={`/shop/${shopDetails.slug}`} className={cn(buttonVariants({ variant: "ghost" }), "text-sm md:text-base")}>
            Home
          </Link>
          <Link to={`/shop/${shopDetails.slug}/products`} className={cn(buttonVariants({ variant: "ghost" }), "text-sm md:text-base")}>
            Products
          </Link>
          <Link to={`/shop/${shopDetails.slug}/order-tracking`} className={cn(buttonVariants({ variant: "ghost" }), "text-sm md:text-base")}>
            Track Order
          </Link>

          {/* Desktop Search Input */}
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              name="searchQuery"
              placeholder="Search products..."
              className={cn(
                "pl-9 w-48 lg:w-64 text-sm",
                blurEnabled ? "bg-input/50" : "bg-input"
              )}
              value={localSearchTerm}
              onChange={handleSearchChange}
            />
          </div>

          {/* Filters + Sort (Desktop only, on products page) */}
          <AnimatePresence>
            {!isMobile && isOnProductsPage && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 overflow-hidden"
              >
                <Button variant="outline" onClick={handleDesktopFilterToggle} className="flex-shrink-0 text-sm md:text-base h-9 md:h-10">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
                {/* Sort Dropdown */}
                <Select value={searchParams.get('sort') || "newest"} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[180px] h-9 md:h-10 text-sm">
                    <ArrowUpNarrowWide className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Sort by" />
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Section: Mobile Toggles + Cart */}
        <nav className="flex items-center space-x-2 md:space-x-4 flex-shrink-0"> {/* Removed flex-1, added flex-shrink-0 */}
          {/* Mobile Dropdown Menu */}
          {isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open navigation menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`/shop/${shopDetails.slug}`} className="flex items-center gap-2 text-sm">
                    <Home className="h-4 w-4" /> Home
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/shop/${shopDetails.slug}/products`} className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4" /> Products
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/shop/${shopDetails.slug}/order-tracking`} className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4" /> Track Order
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/shop/${shopDetails.slug}/orders`} className="flex items-center gap-2 text-sm">
                    <ShoppingBag className="h-4 w-4" /> My Orders
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onOpenCart} className="flex items-center gap-2 text-sm">
                  <ShoppingBag className="h-4 w-4" /> Cart ({totalItems})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile Search Toggle Button */}
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setIsMobileSearchInputVisible(prev => !prev)}>
              {isMobileSearchInputVisible ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
              <span className="sr-only">{isMobileSearchInputVisible ? "Close Search" : "Open Search"}</span>
            </Button>
          )}
          
          {/* Mobile Filter Toggle Button (only on products page) */}
          {isMobile && isOnProductsPage && onToggleFilterSidebar && (
            <Button variant="ghost" size="icon" onClick={onToggleFilterSidebar}>
              <Filter className="h-5 w-5" />
              <span className="sr-only">Open Filters</span>
            </Button>
          )}

          {/* Cart Button (always visible on desktop, only icon on mobile) */}
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
                className={cn(
                  "flex-1 text-sm",
                  blurEnabled ? "bg-input/50" : "bg-input"
                )}
                autoFocus
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
              />
              <Button type="submit" className="text-sm">Search</Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};