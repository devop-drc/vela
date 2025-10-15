import { useStorefront } from "@/contexts/StorefrontContext";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { useRecentlyViewed } from "@/contexts/RecentlyViewedContext";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "../MediaItem";
import { Eye, Instagram, Mail } from "lucide-react";
import React from "react";

export const StorefrontFooter = React.forwardRef<HTMLDivElement>((props, ref) => {
  const { shopDetails, appearanceSettings } = useStorefront();
  const { recentlyViewed } = useRecentlyViewed();
  const location = useLocation();

  if (location.pathname.includes('/instagramShop')) {
    return null;
  }

  if (!shopDetails) return null;

  const blurEnabled = appearanceSettings?.blurEnabled;

  return (
    <footer ref={ref} className={cn(
      "border-t py-8 md:py-12 text-muted-foreground",
      blurEnabled ? "bg-card/80 backdrop-blur-[20px]" : "bg-card",
      "shadow-inner"
    )}>
      <div className="container flex flex-col items-center justify-between gap-8 md:gap-10 md:flex-row">
        {/* Shop Info & Socials */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3 md:space-y-4">
          <Link to={`/shop/${shopDetails.slug}`} className="flex items-center space-x-2 text-foreground">
            {shopDetails.logo_url && (
              <img src={shopDetails.logo_url} alt={shopDetails.shop_name} className="h-7 w-7 md:h-8 md:w-8 rounded-full" />
            )}
            <span className="font-bold text-lg md:text-xl">{shopDetails.shop_name}</span>
          </Link>
          <p className="text-sm max-w-md">{shopDetails.headline || shopDetails.about}</p>
          {shopDetails.contact_email && (
            <a href={`mailto:${shopDetails.contact_email}`} className="text-sm hover:underline text-primary hover:text-primary-foreground transition-colors flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> {shopDetails.contact_email}
            </a>
          )}
          <div className="flex space-x-3 md:space-x-4 mt-3 md:mt-4">
            {shopDetails.instagram_url && (
              <a href={shopDetails.instagram_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 md:gap-x-12 gap-y-6 text-sm text-center md:text-left">
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground mb-2 text-base">Shop</h4>
            <ul className="space-y-1">
              <li><Link to={`/shop/${shopDetails.slug}/products`} className="hover:underline">All Products</Link></li>
              <li><Link to={`/shop/${shopDetails.slug}/cart`} className="hover:underline">Cart</Link></li>
              <li><Link to={`/shop/${shopDetails.slug}/checkout`} className="hover:underline">Checkout</Link></li>
              <li><Link to={`/shop/${shopDetails.slug}/orders`} className="hover:underline">My Orders</Link></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground mb-2 text-base">Information</h4>
            <ul className="space-y-1">
              <li><Link to="#" className="hover:underline">About Us</Link></li>
              <li><Link to="#" className="hover:underline">Contact Us</Link></li>
              <li><Link to="#" className="hover:underline">Privacy Policy</Link></li>
              <li><Link to="#" className="hover:underline">Terms of Service</Link></li>
              <li><Link to="#" className="hover:underline">Returns & Refunds</Link></li>
            </ul>
          </div>
          {recentlyViewed.length > 0 && (
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <h4 className="font-semibold text-foreground mb-2 flex items-center justify-center md:justify-start gap-1 text-base"><Eye className="h-4 w-4 text-primary" /> Recently Viewed</h4>
              <ul className="space-y-2">
                {recentlyViewed.map(product => (
                  <li key={product.id}>
                    <Link to={`/shop/${product.shopSlug}/product/${product.id}`} className="flex items-center gap-2 hover:text-foreground transition-colors">
                      <div className="h-8 w-8 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                        <MediaItem src={product.media_url} alt={product.name} className="object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-tight line-clamp-1">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(product.price, product.currency)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className="container text-center text-xs mt-8 md:mt-12 pt-6 md:pt-8 border-t border-muted-foreground/20">
        <p>&copy; {new Date().getFullYear()} <span className="font-semibold text-foreground">{shopDetails.shop_name}</span>. All rights reserved.</p>
      </div>
    </footer>
  );
});
StorefrontFooter.displayName = "StorefrontFooter";