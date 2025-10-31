"use client";

import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";

interface FloatingCartPillProps {
  label?: string;
}

export const FloatingCartPill: React.FC<FloatingCartPillProps> = ({ label = "Cart" }) => {
  const { totalItems, cartItems } = useCart();
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("open-instagram-cart"));
  };

  const thumbs = Array.isArray(cartItems)
    ? [...cartItems]
        .filter(it => it && (it.media_url || it.productId))
        .slice(-3)
        .reverse()
    : [];

  return (
    <div
      className={cn(
        "hidden md:block fixed right-4 bottom-[calc(16px+var(--instagram-bottom-nav-height,0px))] md:bottom-6 md:right-6 z-40",
        "select-none"
      )}
    >
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-3 rounded-full shadow-lg",
          "px-4 py-2 md:px-5 md:py-2.5",
          "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]"
        )}
        aria-label="Open cart"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--muted))]">
          <ShoppingBag className="h-4 w-4" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {totalItems > 99 ? '99+' : totalItems}
            </span>
          )}
        </span>
        <span className="font-semibold">{label}</span>
        {thumbs.length > 0 && (
          <span className="ml-1 flex items-center">
            {thumbs.map((it, idx) => (
              <span
                key={`${it.productId || idx}-${idx}`}
                className={cn(
                  "h-7 w-7 rounded-full overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--muted))]",
                  idx > 0 ? "-ml-2" : ""
                )}
              >
                {it.media_url ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <img src={it.media_url} className="h-full w-full object-cover" />
                ) : (
                  <span className="h-full w-full flex items-center justify-center text-[10px]">
                    {String(it.name || 'P').slice(0,1).toUpperCase()}
                  </span>
                )}
              </span>
            ))}
          </span>
        )}
      </button>
    </div>
  );
};

export default FloatingCartPill;
