"use client";

import React, { useEffect, useRef } from 'react';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import { ShoppingBag, Truck } from 'lucide-react';
import { motion, useAnimation } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';
import { DrawerTrigger } from '@/components/ui/drawer';
import { useViewportHeight } from '@/hooks/useViewportHeight';

interface InstagramBottomNavProps {
  onOpenCart: () => void;
  onOpenMyOrders: () => void;
  myOrdersCount: number;
}

export const InstagramBottomNav = ({ onOpenCart, onOpenMyOrders, myOrdersCount }: InstagramBottomNavProps) => {
  const { totalItems } = useCart();
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  
  // Use the viewport height hook
  useViewportHeight();
  
  // Handle scroll to hide/show nav
  useEffect(() => {
    let lastScrollY = window.scrollY;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        controls.start({ y: '100%' });
      } else {
        // Scrolling up
        controls.start({ y: 0 });
      }
      
      lastScrollY = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [controls]);

  // Only show this bottom nav for InstagramShop routes
  if (!location.pathname.startsWith(`/instagramShop/${shopSlug}`)) {
    return null;
  }

  return (
    <motion.div
      ref={navRef}
      initial={{ opacity: 0, y: 50 }}
      animate={{ ...controls, opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 w-full h-[var(--bottom-nav-height,3.5rem)] safe-bottom"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        // Use dynamic viewport height for better mobile support
        height: 'calc(var(--bottom-nav-height, 3.5rem) + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <nav className="bg-white/95 backdrop-blur-sm text-gray-800 border-t border-gray-200 shadow-lg h-full w-full max-w-md mx-auto">
        <div className="flex justify-around items-center h-full">
          <button
            onClick={onOpenMyOrders}
            className="flex flex-row gap-1 items-center justify-center text-gray-800 w-full h-full transition-colors text-xs relative hover:bg-gray-50 b"
          >
            <ShoppingBag className="h-6 w-6" />
            <p className="font-semibold text-base mt-1">My Orders</p>
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
              <ShoppingBag className="h-6 w-6" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
                  {totalItems}
                </span>
              )}
            </motion.span>
            <span className="font-semibold text-base mt-1">Cart</span>
          </button>
        </div>
      </nav>
    </motion.div>
  );
};