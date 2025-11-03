"use client";

import React from "react";
import { NavLink, useParams, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Home, Grid3X3, ShoppingBag, User, SunMedium, Moon, Filter, ArrowDownWideNarrow } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const navItem = (to: string, label: string, Icon: IconType) => ({ to, label, Icon });

interface SidebarProps {
  onToggleTheme?: () => void;
  isDark?: boolean;
}

export const InstagramDesktopSidebar: React.FC<SidebarProps> = ({ onToggleTheme, isDark }) => {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const items = [
    navItem(`/instagramShop/${shopSlug}`, "Home", Home),
    navItem(`/instagramShop/${shopSlug}/products`, "Products", Grid3X3),
    navItem(`#`, "My Orders", ShoppingBag),
  ];
  const onProductsPage = location.pathname.includes(`/instagramShop/${shopSlug}/products`);
  

  return (
    <aside
      className="hidden md:flex fixed left-0 top-0 bottom-0 w-[336px] border-r z-30"
      style={{
        backgroundColor: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        borderColor: "hsl(var(--border))",
      }}
      aria-label="Instagram navigation"
    >
      <div className="flex flex-col w-full h-full px-2 py-9 gap-6">
        <div className="px-2 h-12 w-full flex items-center">
          <span className="text-2xl font-light fancyFont">InstaShop</span>
        </div>
        <nav className="flex-1 flex flex-col gap-3">
          {items.map(({ to, label, Icon }) => (
            label === "My Orders" ? (
              <button
                key={label}
                onClick={() => window.dispatchEvent(new CustomEvent("open-instagram-orders"))}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-lg text-base",
                  "transition-colors",
                  "hover:bg-[hsl(var(--muted))]"
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="ml-1">{label}</span>
              </button>
            ) : (
              <NavLink
                key={label}
                to={to}
                end={to === `/instagramShop/${shopSlug}`}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg text-base",
                    "transition-colors",
                    "hover:bg-[hsl(var(--muted))]",
                    isActive ? "bg-[hsl(var(--muted))] font-semibold" : ""
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className="h-6 w-6"
                    />
                    <span className="ml-1">{label}</span>
                  </>
                )}
              </NavLink>
            )
          ))}
        </nav>
        {onProductsPage && (
          <div className="mt-auto px-8 py-3">
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">Filter & Sort Products</h2>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-instagram-filter'))}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-lg text-base border border-[hsl(var(--border))]",
                  "transition-colors",
                  "hover:bg-[hsl(var(--muted))]"
                )}
              >
                <Filter className="h-6 w-6" />
                Filter
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-lg text-base border border-[hsl(var(--border))]",
                      "transition-colors hover:bg-[hsl(var(--muted))]"
                    )}
                  >
                    <ArrowDownWideNarrow className="h-6 w-6" />
                    {(() => {
                      const sort = searchParams.get('sort');
                      switch (sort) {
                        case 'oldest': return 'Sort: Oldest';
                        case 'price-asc': return 'Sort: Price ↑';
                        case 'price-desc': return 'Sort: Price ↓';
                        case 'name-asc': return 'Sort: A→Z';
                        case 'name-desc': return 'Sort: Z→A';
                        default: return 'Sort: Newest';
                      }
                    })()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-[hsl(var(--border))]">
                  <DropdownMenuItem onClick={() => navigate(`/instagramShop/${shopSlug}/products?sort=newest`)}>Newest</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/instagramShop/${shopSlug}/products?sort=oldest`)}>Oldest</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/instagramShop/${shopSlug}/products?sort=price-asc`)}>Price: Low to High</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/instagramShop/${shopSlug}/products?sort=price-desc`)}>Price: High to Low</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/instagramShop/${shopSlug}/products?sort=name-asc`)}>Name: A-Z</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/instagramShop/${shopSlug}/products?sort=name-desc`)}>Name: Z-A</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
        
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium hover:bg-[hsl(var(--muted))]"
          aria-label="Toggle theme"
        >
          {isDark ? <SunMedium className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          <span>{isDark ? "Light mode" : "Dark mode"}</span>
        </button>
      </div>
    </aside>
  );
};

export default InstagramDesktopSidebar;
