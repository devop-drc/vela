import { Link } from "react-router-dom";
import { ShoppingBag, Filter } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
        <nav className="flex items-center space-x-2"> {/* Adjusted gap for filter button */}
          {isMobile && onToggleFilterSidebar && (
            <Button variant="ghost" size="icon" onClick={onToggleFilterSidebar}>
              <Filter className="h-5 w-5" />
              <span className="sr-only">Open Filters</span>
            </Button>
          )}
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/shop/${shopDetails.slug}/cart`} className="relative">
              <ShoppingBag className="h-5 w-5" />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
};