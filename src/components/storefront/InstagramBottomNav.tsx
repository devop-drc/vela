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
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center w-full"
    >
      <nav className="bg-white text-gray-800 border-t border-gray-200 shadow-lg h-14 w-full max-w-md rounded-t-xl">
        <div className="flex justify-around items-center h-full">
          {/* My Orders Button */}
          <button
            onClick={onOpenMyOrders}
            className="flex flex-col items-center justify-center text-gray-800 w-full h-full transition-colors text-xs relative hover:bg-gray-50"
          >
            <ShoppingBag className="h-6 w-6" />
            <span className="font-semibold mt-1">My Orders</span>
            {myOrdersCount > 0 && (
              <span className="absolute top-1 right-1/2 translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
                {myOrdersCount}
              </span>
            )}
          </button>

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            className="flex flex-col items-center justify-center text-gray-800 w-full h-full transition-colors text-xs relative hover:bg-gray-50"
          >
            <motion.span
              key={totalItems}
              initial={{ scale: 1 }}
              animate={totalItems > 0 ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <ShoppingCart className="h-6 w-6" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
                  {totalItems}
                </span>
              )}
            </motion.span>
            <span className="font-semibold mt-1">Cart</span>
          </button>
        </div>
      </nav>
    </motion.div>
  );
};