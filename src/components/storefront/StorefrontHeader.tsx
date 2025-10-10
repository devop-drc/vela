import React, { useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { ShoppingBag, Filter, Search, X, Menu, Home, Package, Truck, ArrowUpNarrowWide, ShoppingCart as ShoppingCartIcon } from "lucide-react"; // Renamed ShoppingCart to ShoppingCartIcon
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

const DESKTOP_SIDEBAR_WIDTH = '20rem';

interface StorefrontHeaderProps {
  onToggleFilterSidebar?: () => void;
  onOpenCart: () => void;
  isDesktopSidebarOpen: boolean; // New prop
  setIsDesktopFilterSidebarOpen: (open: boolean) => void; // New prop to control desktop sidebar
  setWasDesktopFilterSidebarExplicitlyOpened: (open: boolean) => void; // New prop to track explicit user action
}

export const StorefrontHeader = ({ onToggleFilterSidebar, onOpenCart, isDesktopSidebarOpen, setIsDesktopFilterSidebarOpen, setWasDesktopFilterSidebarExplicitlyOpened }: StorefrontHeaderProps) => {
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
  const isPrimaryStyle = appearanceSettings?.sidebarStyle === 'primary'; // Check sidebarStyle

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
    setIsDesktopFilterSidebarOpen(prev => {
      setWasDesktopFilterSidebarExplicitlyOpened(!prev); // Update explicit state
      return !prev;
    });
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
          ? "rounded-lg shadow-md" // Floating style
          : "shadow-sm", // Docked style, removed border-b
        isPrimaryStyle // Apply primary style if selected in admin
          ? cn(blurEnabled ? "bg-primary/80 backdrop-blur-[20px]" : "bg-primary", "text-primary-foreground")
          : cn(blurEnabled ? "bg-card/80 backdrop-blur-[20px]" : "bg-card", "text-foreground")
      )} style={{ borderRadius: isFloatingLayout ? borderRadius : '0' }}>

        {/* Left Section: Logo + Name */}
        <div className="flex items-center space-x-2 flex-shrink-0"> {/* Removed flex-1, added flex-shrink-0 */}
          <Link to={`/shop/${shopDetails.slug}`} className="flex items-center space-x-2">
            <Avatar className="h-7 w-7 md:h-8 md:w-8">
              <AvatarImage src={shopDetails.logo_url || undefined} alt={shopDetails.shop_name} />
              <AvatarFallback className={cn(
                "text-sm md:text-base",
                isPrimaryStyle ? "bg-primary-foreground text-primary" : "bg-muted text-muted-foreground"
              )}>{shopDetails.shop_name?.[0]}</AvatarFallback>
            </Avatar>
            <span className="font-bold text-base md:text-lg">{shopDetails.shop_name}</span>
          </Link>
        </div>

        {/* Middle Section: Desktop Nav Links & Filters/Sort (conditional) */}
        <div className="flex-1 hidden lg:flex items-center justify-center space-x-4 px-4"> {/* Added flex-1, hidden on mobile */}
          {/* Desktop Navigation Links */}
          <Link 
            to={`/shop/${shopDetails.slug}`} 
            className={cn(
              buttonVariants({ variant: "ghost" }), 
              "text-sm md:text-base",
              isPrimaryStyle && "text-primary-foreground hover:bg-primary-foreground/10"
            )}
          >
            Home
          </Link>
          <Link 
            to={`/shop/${shopDetails.slug}/products`} 
            className={cn(
              buttonVariants({ variant: "ghost" }), 
              "text-sm md:text-base",
              isPrimaryStyle && "text-primary-foreground hover:bg-primary-foreground/10"
            )}
          >
            Products
          </Link>
          <Link 
            to={`/shop/${shopDetails.slug}/orders`} 
            className={cn(
              buttonVariants({ variant: "ghost" }), 
              "text-sm md:text-base",
              isPrimaryStyle && "text-primary-foreground hover:bg-primary-foreground/10"
            )}
          >
            My Orders
          </Link>

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
                <Button 
                  variant="outline" 
                  onClick={handleDesktopFilterToggle} 
                  className={cn(
                    "flex-shrink-0 text-sm md:text-base h-9 md:h-10",
                    isPrimaryStyle && "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/30"
                  )}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
                {/* Sort Dropdown */}
                <Select value={searchParams.get('sort') || "newest"} onValueChange={handleSortChange}>
                  <SelectTrigger 
                    className={cn(
                      "w-[180px] h-9 md:h-10 text-sm",
                      isPrimaryStyle && "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/30 data-[state=open]:bg-primary-foreground/30"
                    )}
                  >
                    <ArrowUpNarrowWide className={cn("mr-2 h-4 w-4", isPrimaryStyle ? "text-primary-foreground" : "text-muted-foreground")} />
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

        {/* Right Section: Search + Cart + Mobile Toggles */}
        <nav className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
          {/* Desktop Search Input (moved here) */}
          <div className="relative hidden lg:flex items-center">
            <Search className={cn("absolute left-3 h-4 w-4", isPrimaryStyle ? "text-primary-foreground/70" : "text-muted-foreground")} />
            <Input
              type="search"
              name="searchQuery"
              placeholder="Search products..."
              className={cn(
                "pl-9 w-48 lg:w-64 text-sm",
                isPrimaryStyle 
                  ? "bg-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/70 border-primary-foreground/30 focus-visible:ring-primary-foreground" 
                  : (blurEnabled ? "bg-input/50" : "bg-input")
              )}
              value={localSearchTerm}
              onChange={handleSearchChange}
            />
          </div>

          {/* Mobile Dropdown Menu */}
          {isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={isPrimaryStyle ? "text-primary-foreground hover:bg-primary-foreground/10" : ""}>
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
                  <Link to={`/shop/${shopDetails.slug}/orders`} className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4" /> My Orders
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
            <Button variant="ghost" size="icon" onClick={() => setIsMobileSearchInputVisible(prev => !prev)} className={isPrimaryStyle ? "text-primary-foreground hover:bg-primary-foreground/10" : ""}>
              {isMobileSearchInputVisible ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
              <span className="sr-only">{isMobileSearchInputVisible ? "Close Search" : "Open Search"}</span>
            </Button>
          )}
          
          {/* Mobile Filter Toggle Button (only on products page) */}
          {isMobile && isOnProductsPage && onToggleFilterSidebar && (
            <Button variant="ghost" size="icon" onClick={onToggleFilterSidebar} className={isPrimaryStyle ? "text-primary-foreground hover:bg-primary-foreground/10" : ""}>
              <Filter className="h-5 w-5" />
              <span className="sr-only">Open Filters</span>
            </Button>
          )}

          {/* Cart Button (always visible) */}
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
      <AnimatePresence>
        {isMobile && isMobileSearchInputVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "overflow-hidden border-t",
              isPrimaryStyle 
                ? cn(blurEnabled ? "bg-primary/80 backdrop-blur-[20px]" : "bg-primary", "border-primary-foreground/20")
                : cn(blurEnabled ? "bg-background/80 backdrop-blur-[20px]" : "bg-background")
            )}
          >
            <form onSubmit={handleMobileSearchSubmit} className="container py-3 flex items-center gap-2">
              <Search className={cn("h-5 w-5", isPrimaryStyle ? "text-primary-foreground/70" : "text-muted-foreground")} />
              <Input
                type="search"
                name="searchQuery"
                placeholder="Search products..."
                className={cn(
                  "flex-1 text-sm",
                  isPrimaryStyle 
                    ? "bg-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/70 border-primary-foreground/30 focus-visible:ring-primary-foreground" 
                    : (blurEnabled ? "bg-input/50" : "bg-input")
                )}
                autoFocus
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
              />
              <Button type="submit" className={isPrimaryStyle ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : ""}>Search</Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};