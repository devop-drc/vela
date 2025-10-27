"use client";

import React from "react";
import { NavLink, useParams } from "react-router-dom";
import { Home, Grid3X3, ShoppingBag, User, SunMedium, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const navItem = (to: string, label: string, Icon: IconType) => ({ to, label, Icon });

interface SidebarProps {
  onToggleTheme?: () => void;
  isDark?: boolean;
}

export const InstagramDesktopSidebar: React.FC<SidebarProps> = ({ onToggleTheme, isDark }) => {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const items = [
    navItem(`/instagramShop/${shopSlug}`, "Home", Home),
    navItem(`/instagramShop/${shopSlug}/products`, "Products", Grid3X3),
    navItem(`#`, "Orders", ShoppingBag),
    navItem(`#`, "Profile", User),
  ];

  return (
    <aside
      className="hidden md:flex fixed left-0 top-0 bottom-0 w-[244px] border-r z-30"
      style={{
        backgroundColor: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        borderColor: "hsl(var(--border))",
      }}
      aria-label="Instagram navigation"
    >
      <div className="flex flex-col w-full h-full px-4 py-6 gap-6">
        <div className="px-2 h-12 flex items-center">
          <span className="text-xl font-bold">InstaShop</span>
        </div>
        <nav className="flex-1 flex flex-col gap-3">
          {items.map(({ to, label, Icon }) => (
            label === "Orders" ? (
              <button
                key={label}
                onClick={() => window.dispatchEvent(new CustomEvent("open-instagram-orders"))}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-lg text-base text-left",
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
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg text-base",
                    "transition-colors",
                    "hover:bg-[hsl(var(--muted))]",
                    isActive ? "bg-[hsl(var(--muted))] font-bold" : ""
                  )
                }
              >
                <Icon className="h-6 w-6" />
                <span className="ml-1">{label}</span>
              </NavLink>
            )
          ))}
        </nav>
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
