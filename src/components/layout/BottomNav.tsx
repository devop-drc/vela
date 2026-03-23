import { NavLink } from "react-router-dom";
import { Home, Package, ShoppingBag, Archive, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const navItems = [
  { to: "/", icon: Home, labelKey: "nav.dashboard" },
  { to: "/products", icon: Package, labelKey: "nav.products" },
  { to: "/out-of-stock", icon: Archive, labelKey: "nav.stock" },
  { to: "/orders", icon: ShoppingBag, labelKey: "nav.orders" },
  { to: "/settings", icon: Settings, labelKey: "nav.settings" },
];

const BottomNav = () => {
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  if (!isMobile) {
    return null;
  }

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 h-16 z-50">
      <nav className="bg-background/80 backdrop-blur-[20px] border rounded-2xl shadow-lg h-full">
        <div className="flex justify-around items-center h-full">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center text-muted-foreground w-full h-full transition-colors",
                  isActive && "text-primary"
                )
              }
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs mt-1">{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default BottomNav;