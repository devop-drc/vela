import { useStorefront } from "@/contexts/StorefrontContext";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useRecentlyViewed } from "@/contexts/RecentlyViewedContext"; // Import useRecentlyViewed
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "../MediaItem";
import { Eye, Facebook, Instagram, Twitter, Youtube, Mail } from "lucide-react"; // Added social icons

export const StorefrontFooter = () => {
  const { shopDetails, appearanceSettings } = useStorefront();
  const { recentlyViewed } = useRecentlyViewed(); // Use the new hook

  if (!shopDetails) return null;

  const blurEnabled = appearanceSettings?.blurEnabled;

  return (
    <footer className={cn(
      "border-t py-12 text-muted-foreground",
      blurEnabled ? "bg-card/80 backdrop-blur-lg" : "bg-card",
      "shadow-inner"
    )}>
      <div className="container flex flex-col items-center justify-between gap-10 md:flex-row">
        {/* Shop Info & Socials */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">
          <Link to={`/shop/${shopDetails.slug}`} className="flex items-center space-x-2 text-foreground">
            {shopDetails.logo_url && (
              <img src={shopDetails.logo_url} alt={shopDetails.shop_name} className="h-8 w-8 rounded-full" />
            )}
            <span className="font-bold text-xl">{shopDetails.shop_name}</span>
          </Link>
          <p className="text-sm max-w-md">{shopDetails.headline || shopDetails.about}</p>
          {shopDetails.contact_email && (
            <a href={`mailto:${shopDetails.contact_email}`} className="text-sm hover:underline text-primary hover:text-primary-foreground transition-colors flex items-center gap-2">
              <Mail className="h-4 w-4" /> {shopDetails.contact_email}
            </a>
          )}
          <div className="flex space-x-4 mt-4">
            <a href="#" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Facebook className="h-5 w-5" />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Youtube className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-6 text-sm text-center md:text-left">
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground mb-2">Shop</h4>
            <ul className="space-y-1">
              <li><Link to={`/shop/${shopDetails.slug}/products`} className="hover:underline">All Products</Link></li>
              <li><Link to={`/shop/${shopDetails.slug}/cart`} className="hover:underline">Cart</Link></li>
              <li><Link to={`/shop/${shopDetails.slug}/checkout`} className="hover:underline">Checkout</Link></li>
              <li><Link to={`/shop/${shopDetails.slug}/order-tracking`} className="hover:underline">Order Tracking</Link></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground mb-2">Information</h4>
            <ul className="space-y-1">
              <li><Link to="#" className="hover:underline">About Us</Link></li>
              <li><Link to="#" className="hover:underline">Contact Us</Link></li>
              <li><Link to="#" className="hover:underline">Privacy Policy</Link></li>
              <li><Link to="#" className="hover:underline">Terms of Service</Link></li>
              <li><Link to="#" className="hover:underline">Returns & Refunds</Link></li>
            </ul>
          </div>
          {recentlyViewed.length > 0 && (
            <div className="space-y-2 col-span-2 sm:col-span-1"> {/* Ensure it takes full width on small screens */}
              <h4 className="font-semibold text-foreground mb-2 flex items-center justify-center md:justify-start gap-1"><Eye className="h-4 w-4" /> Recently Viewed</h4>
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
      <div className="container text-center text-xs mt-12 pt-8 border-t border-muted-foreground/20">
        <p>&copy; {new Date().getFullYear()} <span className="font-semibold text-foreground">{shopDetails.shop_name}</span>. All rights reserved.</p>
      </div>
    </footer>
  );
};