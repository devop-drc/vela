"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { ShoppingBag, Sun, Moon, Package, House, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';

interface InstagramBottomNavProps {
  onOpenCart: () => void;
  onOpenMyOrders: () => void;
  myOrdersCount: number;
}

/** Compact vertical icon+label item — five of these fit a 360px viewport. */
const NavItem = ({ active, onClick, ariaLabel, children }: {
  active?: boolean;
  onClick?: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel}
    className={cn(
      'relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 transition-colors',
      active ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
    )}
  >
    {children}
  </button>
);

const ItemLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="max-w-full truncate text-[10px] font-semibold leading-none">{children}</span>
);

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

  const base = `/instagramShop/${shopSlug}`;
  const onProducts = location.pathname.startsWith(`${base}/products`);
  const onHome = !onProducts;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed left-0 right-0 bottom-0 z-50 flex w-[100vw]"
      style={{ bottom: 0, WebkitTransform: 'translateZ(0)' }}
    >
      <nav
        className="w-full bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-t border-[hsl(var(--border))] shadow-lg"
        style={{
          height: '56px',
          // Curved-edge phones need clearance even when the safe-area env
          // resolves to 0 — keep at least 10px under the buttons.
          paddingBottom: 'max(var(--sab, env(safe-area-inset-bottom, 0px)), 10px)',
          boxSizing: 'content-box',
        }}
      >
        <div className="flex h-full items-stretch justify-around">
          <Link to={base} aria-label="Shop home"
            className={cn('relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 transition-colors',
              onHome ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]')}>
            <House className="h-[18px] w-[18px]" />
            <ItemLabel>Shop</ItemLabel>
          </Link>

          <Link to={`${base}/products`} aria-label="Products"
            className={cn('relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 transition-colors',
              onProducts ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]')}>
            <LayoutGrid className="h-[18px] w-[18px]" />
            <ItemLabel>Products</ItemLabel>
          </Link>

          <NavItem onClick={onOpenMyOrders} ariaLabel="My Orders">
            <span className="relative">
              <Package className="h-[18px] w-[18px]" />
              {myOrdersCount > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">
                  {myOrdersCount}
                </span>
              )}
            </span>
            <ItemLabel>Orders</ItemLabel>
          </NavItem>

          <NavItem onClick={onOpenCart} ariaLabel="Cart">
            <motion.span
              key={totalItems}
              initial={{ scale: 1 }}
              animate={totalItems > 0 ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              {totalItems > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </motion.span>
            <ItemLabel>Cart</ItemLabel>
          </NavItem>

          <NavItem onClick={toggleTheme} ariaLabel="Toggle theme">
            {isDark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
            <ItemLabel>Theme</ItemLabel>
          </NavItem>
        </div>
      </nav>
    </motion.div>
  );
};
