import { Link } from "react-router-dom";
import { ShoppingBag, Filter } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button"; // Import buttonVariants
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile

interface StorefrontHeaderProps {
  onToggleFilterSidebar?: () => void; // Add prop for toggling sidebar
}

export const StorefrontHeader = ({ onToggleFilterSidebar }: StorefrontHeaderProps) => {
  const { shopDetails, appearanceSettings } = useStorefront();
  const { totalItems } = useCart();
  const isMobile = useIsMobile(); // Use the hook

  if (!shopDetails) return null;

  const blurEnabled = appearanceSettings?.blurEnabled;

  return (
    <header className={cn(
      "sticky top-0 z-40 w-full border-b",
      blurEnabled ? "bg-background/80 backdrop-blur-lg" : "bg-background",
      "shadow-sm"
    )}>
      <div className="container flex h-16 items-center justify-between">
        <Link to={`/shop/${shopDetails.slug}`} className="flex items-center space-x-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={shopDetails.logo_url} alt={shopDetails.shop_name} />
            <AvatarFallback>{shopDetails.shop_name?.[0]}</AvatarFallback>
          </Avatar>
          <span className="font-bold text-lg">{shopDetails.shop_name}</span>
        </Link>
        <nav className="flex items-center space-x-4"> {/* Adjusted gap for filter button */}
          <Link to={`/shop/${shopDetails.slug}`} className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}>
            Shop
          </Link>
          {isMobile && onToggleFilterSidebar && (
            <Button variant="ghost" size="icon" onClick={onToggleFilterSidebar}>
              <Filter className="h-5 w-5" />
              <span className="sr-only">Open Filters</span>
            </Button>
          )}
          <Link
            to={`/shop/${shopDetails.slug}/cart`}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")} // Apply button styles directly
          >
            <span className="relative">
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
};