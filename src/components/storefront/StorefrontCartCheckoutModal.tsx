import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingBag, X, Minus, Plus, Trash2, Loader2, CreditCard, CheckCircle, ArrowLeft, Bookmark, MoveRight, ArrowRight, User, Mail, MapPin, City, Globe, StickyNote, Calendar, Lock, DollarSign } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useStorefront } from "@/contexts/StorefrontContext";
import { formatCurrency } from "@/lib/formatters";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { MediaItem } from "@/components/MediaItem";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { CheckoutForm } from "./CheckoutForm";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface StorefrontCartCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorefrontCartCheckoutModal = ({ isOpen, onClose }: StorefrontCartCheckoutModalProps) => {
  const { cartItems, savedItems, totalItems, subtotal, shipping, total, updateQuantity, removeFromCart, clearCart, saveForLater, moveToCart, removeSavedItem } = useCart();
  const { shopDetails, appearanceSettings, convertCurrency } = useStorefront();
  const { toast } = useToast();
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false); // New state for order confirmation
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null); // Store order ID for confirmation message

  const blurEnabled = appearanceSettings?.blurEnabled;

  useEffect(() => {
    if (!isOpen) {
      setIsCheckoutMode(false); // Reset to cart view when modal closes
      setIsOrderConfirmed(false); // Reset confirmation state
      setConfirmedOrderId(null); // Clear confirmed order ID
    }
  }, [isOpen]);

  const convertedTotalPrice = useMemo(() => {
    if (!shopDetails?.currency) return 0;
    return total; // total is already in the shop's display currency from useCart
  }, [total, shopDetails?.currency]);

  const handleOrderSuccess = (orderId: string) => {
    setIsOrderConfirmed(true);
    setConfirmedOrderId(orderId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "sm:max-w-5xl h-[90vh] flex flex-col p-0",
          blurEnabled ? "bg-card/80 backdrop-blur-lg" : "bg-card"
        )}
      >
        <DialogHeader className="p-4 md:p-6 border-b flex-row items-center justify-between flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl md:text-2xl font-bold">
            {isCheckoutMode && !isOrderConfirmed ? (
              <Button variant="ghost" size="icon" onClick={() => setIsCheckoutMode(false)} className="mr-2 h-8 w-8 md:h-9 md:w-9">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back to Cart</span>
              </Button>
            ) : (
              <ShoppingBag className="h-6 w-6 md:h-7 md:w-7" />
            )}
            {isOrderConfirmed ? "Order Confirmed!" : (isCheckoutMode ? "Checkout" : "Your Cart")}
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
            <span className="sr-only">Close cart</span>
          </Button>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {isOrderConfirmed ? (
            <motion.div
              key="order-confirmed"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center flex-1 p-8 text-center"
            >
              <CheckCircle className="h-20 w-20 md:h-24 md:w-24 text-emerald-500 mb-6" />
              <h3 className="text-2xl md:text-3xl font-bold mb-4">Thank You for Your Order!</h3>
              <p className="text-base md:text-lg text-muted-foreground mb-4">Your order <span className="font-semibold">#{confirmedOrderId?.substring(0, 8)}</span> has been placed successfully.</p>
              <p className="text-sm md:text-base text-muted-foreground mb-8">You will receive an email confirmation shortly with details and tracking information.</p>
              <Button onClick={onClose} className="text-base md:text-lg">Continue Shopping</Button>
              <Button asChild variant="link" className="mt-2 text-base md:text-lg">
                <Link to={`/shop/${shopDetails?.slug}/orders?orderId=${confirmedOrderId}`} onClick={onClose}>View My Orders</Link>
              </Button>
            </motion.div>
          ) : (cartItems.length === 0 && savedItems.length === 0 && !isCheckoutMode ? (
            <motion.div
              key="empty-cart"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center flex-1 p-8 text-center"
            >
              <ShoppingBag className="h-20 w-20 md:h-24 md:w-24 text-muted-foreground mb-6" />
              <h3 className="text-2xl md:text-3xl font-bold mb-4">Your cart is empty</h3>
              <p className="text-base md:text-lg text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet.</p>
              <Button onClick={onClose} className="text-base md:text-lg">Start Shopping</Button>
            </motion.div>
          ) : (
            <motion.div
              key={isCheckoutMode ? "checkout-mode" : "cart-mode"}
              initial={{ opacity: 0, x: isCheckoutMode ? 50 : -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isCheckoutMode ? -50 : 50 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              {isCheckoutMode ? (
                <CheckoutForm 
                  onOrderSuccess={handleOrderSuccess} // Pass the new prop
                  onBackToCart={() => setIsCheckoutMode(false)}
                  isSubmitting={false} // isSubmitting is handled internally by CheckoutForm
                  totalPrice={convertedTotalPrice}
                  currency={shopDetails?.currency || 'USD'}
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 overflow-hidden">
                  <div className="lg:col-span-2 flex flex-col overflow-y-auto p-4 md:p-6 border-r">
                    <div className="space-y-6">
                      {cartItems.length > 0 && (
                        <div className="space-y-4">
                          <h2 className="text-lg md:text-xl font-bold font-heading">Items in Cart ({cartItems.length})</h2>
                          <AnimatePresence>
                            {cartItems.map(item => (
                              <motion.div
                                key={item.productId}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ duration: 0.2 }}
                              >
                                <Card className={cn(
                                  "flex flex-col sm:flex-row items-center p-3 md:p-4 gap-3 md:gap-4 shadow-md",
                                  blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
                                )}>
                                  <Link to={`/shop/${shopDetails?.slug}/product/${item.productId}`} onClick={onClose} className="flex-shrink-0">
                                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-md overflow-hidden bg-muted border">
                                      <MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="object-cover" />
                                    </div>
                                  </Link>
                                  <div className="flex-1 w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 text-center sm:text-left">
                                    <div className="flex-1">
                                      <Link to={`/shop/${shopDetails?.slug}/product/${item.productId}`} onClick={onClose}>
                                        <h3 className="font-semibold text-base md:text-lg hover:underline">{item.name}</h3>
                                      </Link>
                                      <p className="text-muted-foreground text-sm">
                                        {formatCurrency(convertCurrency(item.price, item.currency), shopDetails?.currency)}
                                      </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 mt-3 sm:mt-0">
                                      <div className="flex items-center border rounded-md">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                          disabled={item.quantity <= 1}
                                          className="h-8 w-8"
                                        >
                                          <Minus className="h-4 w-4" />
                                        </Button>
                                        <Input
                                          type="number"
                                          value={item.quantity}
                                          onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                                          className="w-14 md:w-16 text-center border-y-0 border-x rounded-none focus-visible:ring-0 text-sm"
                                          min={1}
                                        />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                          className="h-8 w-8"
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      <p className="font-semibold text-base md:text-lg">
                                        {formatCurrency(item.price * item.quantity, shopDetails?.currency)}
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.productId)} className="text-destructive hover:text-destructive h-8 w-8">
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">Remove {item.name}</span>
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => saveForLater(item)} className="text-sm">
                                            <Bookmark className="mr-2 h-4 w-4" />
                                            Save for Later
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}

                      {savedItems.length > 0 && (
                        <div className="space-y-4 mt-6 md:mt-8">
                          <h2 className="text-lg md:text-xl font-bold font-heading">Saved for Later ({savedItems.length})</h2>
                          <AnimatePresence>
                            {savedItems.map(item => (
                              <motion.div
                                key={item.productId}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ duration: 0.2 }}
                              >
                                <Card className={cn(
                                  "flex flex-col sm:flex-row items-center p-3 md:p-4 gap-3 md:gap-4 shadow-md",
                                  blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
                                )}>
                                  <Link to={`/shop/${shopDetails?.slug}/product/${item.productId}`} onClick={onClose} className="flex-shrink-0">
                                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-md overflow-hidden bg-muted border">
                                      <MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="object-cover" />
                                    </div>
                                  </Link>
                                  <div className="flex-1 w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 text-center sm:text-left">
                                    <div className="flex-1">
                                      <Link to={`/shop/${shopDetails?.slug}/product/${item.productId}`} onClick={onClose}>
                                        <h3 className="font-semibold text-base md:text-lg hover:underline">{item.name}</h3>
                                      </Link>
                                      <p className="text-muted-foreground text-sm">
                                        {formatCurrency(convertCurrency(item.price, item.currency), shopDetails?.currency)}
                                      </p>
                                    </div>
                                    <div className="flex items-center justify-center gap-3 md:gap-4 mt-3 sm:mt-0">
                                      <Button variant="outline" size="sm" onClick={() => moveToCart(item.productId)} className="text-sm">
                                          <MoveRight className="mr-2 h-4 w-4" />
                                          Move to Cart
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => removeSavedItem(item.productId)} className="text-destructive hover:text-destructive h-8 w-8">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Remove {item.name}</span>
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-1 flex flex-col p-4 md:p-6 border-t lg:border-t-0">
                    <div className="space-y-4 flex-1">
                      <h2 className="text-lg md:text-xl font-bold font-heading">Order Summary</h2>
                      <div className="flex justify-between text-sm md:text-base">
                        <span>Subtotal ({totalItems} items):</span>
                        <span className="font-semibold">{formatCurrency(subtotal, shopDetails?.currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm md:text-base">
                        <span>Shipping:</span>
                        <span className="font-semibold">{formatCurrency(shipping, shopDetails?.currency)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg md:text-xl font-bold pt-2">
                        <span>Total:</span>
                        <span>{formatCurrency(total, shopDetails?.currency)}</span>
                      </div>
                    </div>
                    <div className="mt-6 flex-shrink-0">
                      <Button className="w-full text-base md:text-lg" onClick={() => setIsCheckoutMode(true)} disabled={cartItems.length === 0}>
                        Proceed to Checkout
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button variant="ghost" className="w-full text-base md:text-lg mt-2" onClick={onClose}>
                        Continue Shopping
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};