"use client";

import React from 'react';
import { ShoppingBag, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InstagramFixedMyOrdersButtonProps {
  onOpenMyOrders: () => void;
  orderCount: number; // Prop to display the number of orders
}

export const InstagramFixedMyOrdersButton = ({ onOpenMyOrders, orderCount }: InstagramFixedMyOrdersButtonProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
    >
      <Button
        variant="ghost"
        onClick={onOpenMyOrders}
        className={cn(
          "relative h-14 w-full max-w-xs rounded-t-xl rounded-b-none shadow-lg",
          "bg-white text-gray-800 hover:bg-gray-100 border-t border-gray-200",
          "flex flex-col items-center justify-center pt-2 pb-1" // Adjust padding for icon and text
        )}
      >
        <ChevronUp className="h-5 w-5 text-gray-500 absolute -top-3" /> {/* Up arrow icon */}
        <ShoppingBag className="h-6 w-6 text-gray-800" />
        <span className="text-xs font-semibold mt-1">My Orders</span>
        {orderCount > 0 && (
          <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
            {orderCount}
          </span>
        )}
      </Button>
    </motion.div>
  );
};