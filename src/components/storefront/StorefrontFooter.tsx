import { useStorefront } from "@/contexts/StorefrontContext";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export const StorefrontFooter = () => {
  const { shopDetails, appearanceSettings } = useStorefront();

  if (!shopDetails) return null;

  const blurEnabled = appearanceSettings?.blurEnabled;

  return (
    <footer className={cn(
      "border-t py-8 text-muted-foreground",
      blurEnabled ? "bg-card/80 backdrop-blur-lg" : "bg-card",
      "shadow-inner" // Added shadow-inner for a subtle effect
    )}>
      <div className="container flex flex-col items-center justify-between gap-8 md:flex-row">
        <div className="text-sm text-center md:text-left">
          <p>&copy; {new Date().getFullYear()} <span className="font-semibold text-foreground">{shopDetails.shop_name}</span>. All rights reserved.</p>
          {shopDetails.contact_email && (
            <a href={`mailto:${shopDetails.contact_email}`} className="text-sm hover:underline text-primary hover:text-primary-foreground transition-colors mt-1 block">
              {shopDetails.contact_email}
            </a>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground mb-2">Shop</h4>
            <ul className="space-y-1">
              <li><Link to={`/shop/${shopDetails.slug}`} className="hover:underline">All Products</Link></li>
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
        </div>
      </div>
    </footer>
  );
};