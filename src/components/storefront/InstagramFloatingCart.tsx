"use client";

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InstagramFloatingCartProps {
  onOpenCart: () => void;
}

export const InstagramFloatingCart = ({ onOpenCart }: InstagramFloatingCartProps) => {
  const { totalItems } = useCart();
  const isMobile = useIsMobile();
  const { shopSlug } = useParams<{ shopSlug: string }>();

  if (isMobile || !shopSlug) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-4 right-4 z-50"
    >
      <Button
        variant="secondary"
        size="icon"
        onClick={onOpenCart}
        className={cn(
          "relative h-12 w-12 rounded-full shadow-lg",
          "bg-white text-gray-800 hover:bg-gray-100 border border-gray-200"
        )}
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
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
              {totalItems}
            </span>
          )}
        </motion.span>
        <span className="sr-only">View Cart</span>
      </Button>
    </motion.div>
  );
};