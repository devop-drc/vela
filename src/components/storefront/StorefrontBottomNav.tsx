import { NavLink, useParams, useLocation } from "react-router-dom";
import { Home, Package, ShoppingBag, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCart } from "@/contexts/CartContext";
import { motion } from "framer-motion";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/products", icon: Package, label: "Products" },
  { to: "/orders", icon: Truck, label: "My Orders" },
];

interface StorefrontBottomNavProps {
  onOpenCart: () => void;
}

export const StorefrontBottomNav = ({ onOpenCart }: StorefrontBottomNavProps) => {
  const isMobile = useIsMobile();
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const { totalItems } = useCart();
  const location = useLocation();

  if (location.pathname.includes('/instagramShop')) {
    return null;
  }

  if (!isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 z-50 md:hidden">
      <nav className="bg-background/80 backdrop-blur-[20px] border-t shadow-lg h-full">
        <div className="flex justify-around items-center h-full">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={`/shop/${shopSlug}${item.to}`}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center text-muted-foreground w-full h-full transition-colors text-xs",
                  isActive && "text-primary"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="mt-1">{item.label}</span>
            </NavLink>
          ))}
          <button
            onClick={onOpenCart}
            className="flex flex-col items-center justify-center text-muted-foreground w-full h-full transition-colors text-xs relative"
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
                </span >
              )}
            </motion.span>
            <span className="mt-1">Cart</span>
          </button>
        </div>
      </nav>
    </div>
  );
};