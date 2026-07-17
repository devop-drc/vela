"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { ShoppingBag, Sun, Moon, Truck, Box } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
//

interface InstagramBottomNavProps {
  onOpenCart: () => void;
  onOpenMyOrders: () => void;
  myOrdersCount: number;
}

export const InstagramBottomNav = ({ onOpenCart, onOpenMyOrders, myOrdersCount }: InstagramBottomNavProps) => {
  const { totalItems } = useCart();
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const location = useLocation();

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const updateFromAttr = () => {
      const mode = root.getAttribute('data-instagram-shop-theme');
      setIsDark(mode === 'dark');
    };
    updateFromAttr();
    const onThemeUpdated = () => updateFromAttr();
    window.addEventListener('instagram-shop-theme-updated', onThemeUpdated as EventListener);
    document.addEventListener('visibilitychange', updateFromAttr);
    return () => {
      window.removeEventListener('instagram-shop-theme-updated', onThemeUpdated as EventListener);
      document.removeEventListener('visibilitychange', updateFromAttr);
    };
  }, []);
  const toggleTheme = useCallback(() => {
    window.dispatchEvent(new CustomEvent('instagram-shop-toggle-theme'));
  }, []);

  // Only show this bottom nav for InstagramShop routes
  if (!location.pathname.startsWith(`/instagramShop/${shopSlug}`)) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed left-0 right-0 bottom-0 z-50 flex w-[100vw]"
      style={{
        bottom: 0,
        // Keep the bar visually flush with the bottom while allowing safe-area padding inside
        WebkitTransform: 'translateZ(0)',
      }}
    >
      <nav
        className="w-full max-w-md bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-t border-[hsl(var(--border))] shadow-lg"
        style={{
          height: '56px',
          // Curved-edge phones need clearance even when the safe-area env
          // resolves to 0 — keep at least 10px under the buttons.
          paddingBottom: 'max(var(--sab, env(safe-area-inset-bottom, 0px)), 10px)',
          boxSizing: 'content-box',
        }}
      >
        <div className="flex justify-around items-center h-full">
          <button
            onClick={onOpenMyOrders}
            aria-label="My Orders"
            className="flex flex-row gap-1 items-center justify-center w-full h-full transition-colors text-xs relative hover:bg-[hsl(var(--muted))]"
          >
            <ShoppingBag className="h-[18px] w-[18px]" />
            <p className="font-semibold text-xs mt-0.5">My Orders</p>
            {myOrdersCount > 0 && (
              <span className="absolute top-1 right-1/2 translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
                {myOrdersCount}
              </span>
            )}
          </button>

          {/* Theme toggle (icon only) */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-full h-full hover:bg-[hsl(var(--muted))]"
            aria-label="Toggle theme"
          >
            {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            aria-label="Cart"
            className="flex flex-row-reverse gap-1 items-center justify-center w-full h-full transition-colors text-xs relative hover:bg-[hsl(var(--muted))]"
          >
            <motion.span
              key={totalItems}
              initial={{ scale: 1 }}
              animate={totalItems > 0 ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
                  {totalItems}
                </span>
              )}
            </motion.span>
            <span className="font-semibold text-xs mt-0.5">Cart</span>
          </button>
        </div>
      </nav>
    </motion.div>
  );
};