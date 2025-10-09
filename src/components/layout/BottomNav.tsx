import { NavLink } from "react-router-dom";
import { Home, Package, ShoppingBag, Archive, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/products", icon: Package, label: "Products" },
  { to: "/out-of-stock", icon: Archive, label: "Out of Stock" },
  { to: "/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const BottomNav = () => {
  const isMobile = useIsMobile();

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
              <span className="text-xs mt-1">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default BottomNav;