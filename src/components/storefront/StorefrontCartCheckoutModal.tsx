import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AnimatePresence, motion } from "framer-motion";
import { StorefrontCartModal } from './StorefrontCartModal';
import { StorefrontCheckoutModal } from './StorefrontCheckoutModal';
import { useStorefront } from '@/contexts/StorefrontContext';
import { cn } from '@/lib/utils';

interface StorefrontCartCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorefrontCartCheckoutModal = ({ isOpen, onClose }: StorefrontCartCheckoutModalProps) => {
  const { appearanceSettings } = useStorefront();
  const blurEnabled = appearanceSettings?.blurEnabled;
  const [currentView, setCurrentView] = useState<'cart' | 'checkout'>('cart');
  const [direction, setDirection] = useState(0); // 0 for no slide, 1 for right, -1 for left

  useEffect(() => {
    if (!isOpen) {
      // Reset view and direction when modal closes
      const timer = setTimeout(() => {
        setCurrentView('cart');
        setDirection(0);
      }, 300); // Allow exit animation to complete
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleProceedToCheckout = () => {
    setDirection(1); // Slide left (checkout comes from right)
    setCurrentView('checkout');
  };

  const handleBackToCart = () => {
    setDirection(-1); // Slide right (cart comes from left)
    setCurrentView('cart');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-5xl h-[90vh] p-0 flex flex-col overflow-hidden", // Increased max-w to 5xl
        blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
      )}>
        <AnimatePresence initial={false} custom={direction}>
          {currentView === 'cart' && (
            <motion.div
              key="cart"
              custom={direction}
              initial={{ x: direction === 1 ? '100%' : direction === -1 ? '-100%' : 0, opacity: direction === 0 ? 1 : 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction === 1 ? '-100%' : '100%', opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-0 flex flex-col"
            >
              <StorefrontCartModal onClose={onClose} onProceedToCheckout={handleProceedToCheckout} />
            </motion.div>
          )}
          {currentView === 'checkout' && (
            <motion.div
              key="checkout"
              custom={direction}
              initial={{ x: direction === 1 ? '100%' : direction === -1 ? '-100%' : 0, opacity: direction === 0 ? 1 : 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction === 1 ? '-100%' : '100%', opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-0 flex flex-col"
            >
              <StorefrontCheckoutModal onClose={onClose} onBackToCart={handleBackToCart} />
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};