import { NavLink } from "react-router-dom";
import { Home, ShoppingBag, Settings, Package, Archive, MessageSquareQuote, Link as LinkIcon, MessageSquareWarning, Megaphone, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/contexts/AppearanceContext";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { useShop } from "@/contexts/ShopContext";
import { showSuccess, showError } from "@/utils/toast";

const Sidebar = () => {
  const { settings } = useAppearance();
  const { shopDetails } = useShop();
  const isFloating = settings.layoutStyle === 'floating';
  const isPrimary = settings.sidebarStyle === 'primary';
  const blurEnabled = settings.blurEnabled;

  const navItems = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/products", icon: Package, label: "Products" },
    { to: "/out-of-stock", icon: Archive, label: "Out of Stock" },
    { to: "/orders", icon: ShoppingBag, label: "Orders" },
    { to: "/disputes", icon: MessageSquareWarning, label: "Disputes" },
    { to: "/promotions", icon: Megaphone, label: "Promotions" },
    // { to: "/marquee", icon: Sparkles, label: "Marquee" }, // Removed Marquee settings page link
    { to: "/keywords", icon: MessageSquareQuote, label: "AI Keywords" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  const sidebarWidthClasses = {
    compact: 'w-56', // 224px
    default: 'w-64', // 256px
    spacious: 'w-72', // 288px
  };

  const handleCopyStorefrontUrl = async () => {
    if (shopDetails?.slug) {
      const storefrontUrl = `${window.location.origin}/shop/${shopDetails.slug}`;
      try {
        await navigator.clipboard.writeText(storefrontUrl);
        showSuccess("Storefront URL copied to clipboard!");
      } catch (err) {
        showError("Failed to copy URL. Please try again manually.");
        console.error("Failed to copy storefront URL:", err);
      }
    } else {
      showError("Your shop URL is not available yet. Please set your shop name in settings.");
    }
  };

  return (
    <aside className={cn(
      "z-30 hidden md:flex flex-col transition-all",
      sidebarWidthClasses[settings.sidebarWidth || 'default'],
      isFloating 
        ? "fixed top-4 left-4 bottom-4 border rounded-lg" 
        : "h-full border-r",
      isPrimary
        ? cn(
            "text-primary-foreground border-primary-foreground/20",
            blurEnabled ? "bg-primary/80 backdrop-blur-lg" : "bg-primary"
          )
        : cn(
            "border-border",
            blurEnabled ? "bg-card/80 backdrop-blur-lg" : "bg-card"
          )
    )} style={{ '--sidebar-width': sidebarWidthClasses[settings.sidebarWidth || 'default'] } as React.CSSProperties}>
      <div className={cn(
        "p-4 border-b flex items-center",
        isPrimary ? 'border-primary-foreground/20' : 'border-border'
      )}>
        <ShoppingBag className="h-6 w-6 mr-2" />
        <h1 className="text-xl font-bold">InstaShopify</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <motion.div key={item.to} whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isPrimary
                    ? "text-primary-foreground/70 hover:bg-primary-foreground/10"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  isActive && (isPrimary
                    ? "bg-primary-foreground/10 text-primary-foreground"
                    : "bg-accent text-accent-foreground")
                )
              }
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.label}
            </NavLink>
          </motion.div>
        ))}
      </nav>
      <div className="p-4 border-t">
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleCopyStorefrontUrl}
          disabled={!shopDetails?.slug}
        >
          <LinkIcon className="mr-2 h-4 w-4" />
          Get Storefront URL
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;