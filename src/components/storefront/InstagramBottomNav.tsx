"use client";

import React from 'react';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import { ShoppingBag, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';
import { DrawerTrigger } from '@/components/ui/drawer'; // Import DrawerTrigger

interface InstagramBottomNavProps {
  onOpenCart: () => void;
  onOpenMyOrders: () => void;
  myOrdersCount: number;
}

export const InstagramBottomNav = ({ onOpenCart, onOpenMyOrders, myOrdersCount }: InstagramBottomNavProps) => {
  const { totalItems } = useCart();
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const location = useLocation();

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
      className="fixed left-0 right-0 z-50 flex justify-center w-full"
      style={{
        bottom: 0,
        // Keep the bar visually flush with the bottom while allowing safe-area padding inside
        WebkitTransform: 'translateZ(0)',
      }}
    >
      <nav
        className="bg-white text-gray-800 border-t border-gray-200 shadow-lg w-full max-w-md"
        style={{
          height: '50px',
          paddingBottom: 'var(--sab, env(safe-area-inset-bottom, 0px))',
          // Prevent content behind safe area from peeking when toolbars collapse/expand
          boxSizing: 'content-box',
        }}
      >
        <div className="flex justify-around items-center h-full">
          <button
            onClick={onOpenMyOrders}
            className="flex flex-row gap-1 items-center justify-center text-gray-800 w-full h-full transition-colors text-xs relative hover:bg-gray-50 b"
          >
            <ShoppingBag className="h-5 w-5" />
            <p className="font-semibold text-sm mt-1">My Orders</p>
            {myOrdersCount > 0 && (
              <span className="absolute top-1 right-1/2 translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
                {myOrdersCount}
              </span>
            )}
          </button>

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            className="flex flex-row-reverse gap-1 items-center justify-center text-gray-800 w-full h-full transition-colors text-xs relative hover:bg-gray-50"
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
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
                  {totalItems}
                </span>
              )}
            </motion.span>
            <span className="font-semibold text-sm mt-1">Cart</span>
          </button>
        </div>
      </nav>
    </motion.div>
  );
};