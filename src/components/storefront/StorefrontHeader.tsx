import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export const StorefrontHeader = () => {
  const { shopDetails } = useStorefront();

  if (!shopDetails) return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link to={`/shop/${shopDetails.slug}`} className="flex items-center space-x-2"> {/* Use shopDetails.slug */}
          <Avatar className="h-8 w-8">
            <AvatarImage src={shopDetails.logo_url} alt={shopDetails.shop_name} />
            <AvatarFallback>{shopDetails.shop_name?.[0]}</AvatarFallback>
          </Avatar>
          <span className="font-bold text-lg">{shopDetails.shop_name}</span>
        </Link>
        <nav className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/shop/${shopDetails.slug}/cart`}> {/* Use shopDetails.slug */}
              <ShoppingBag className="h-5 w-5" />
              <span className="sr-only">Cart</span>
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
};