import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingBag, X, Minus, Plus, Trash2, Loader2, CreditCard, CheckCircle, ArrowLeft, Bookmark, MoveRight, ArrowRight, User, Mail, MapPin, Phone, StickyNote, Info, Wallet, ShieldCheck, Lock, Banknote, Hash, XCircle, Truck } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useStorefront } from "@/contexts/StorefrontContext";
import { formatCurrency } from "@/lib/formatters";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MediaItem } from "@/components/MediaItem";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckoutForm, CheckoutFormData } from "./CheckoutForm";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

interface StorefrontCartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorefrontCartModal = ({ isOpen, onClose }: StorefrontCartModalProps) => {
  const { cartItems, savedItems, totalItems, subtotal, shipping, total, totalSaved, updateQuantity, removeFromCart, clearCart, saveForLater, moveToCart, removeSavedItem, hasSubscriptionProducts } = useCart();
  const { shopDetails, appearanceSettings, convertCurrency } = useStorefront();
  const navigate = useNavigate();
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'contact-shipping' | 'payment'>('cart');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const blurEnabled = appearanceSettings?.blurEnabled;

  useEffect(() => {
    if (isOpen) {
      setCheckoutStep('cart');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && cartItems.length > 0) {
      cartItems.forEach(item => {
      });
    }
  }, [isOpen, cartItems, shopDetails, convertCurrency]);


  const handleProceedToCheckout = () => {
    if (!shopDetails?.slug) {
      toast.error("Shop details not available.");
      return;
    }
    if (cartItems.length === 0) {
      toast.error("Your cart is empty. Please add items before checking out.");
      return;
    }
    setCheckoutStep('contact-shipping');
  };

  const handleBack = () => {
    if (checkoutStep === 'payment') {
      setCheckoutStep('contact-shipping');
    } else if (checkoutStep === 'contact-shipping') {
      setCheckoutStep('cart');
    } else {
      onClose();
    }
  };

  const handlePlaceOrder = async (data: CheckoutFormData) => {
    if (!shopDetails) {
      showError("Shop details not loaded. Cannot place order.");
      return;
    }
    if (cartItems.length === 0) {
      showError("Your cart is empty. Please add items before placing an order.");
      return;
    }

    setIsSubmittingOrder(true);
    let toastId: string | number | undefined;
    setTimeout(() => {
      toastId = toast.loading("Placing your order...");
    }, 0);
    
    try {
      const orderPayload = {
        shopSlug: shopDetails.slug,
        customerInfo: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
        },
        cartItems: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          currency: item.currency,
        })),
        totalAmount: total,
        currency: shopDetails.currency,
        paymentMethod: data.paymentMethod,
        shippingAddress: data.shippingAddress,
        shippingCity: data.shippingCity,
        shippingState: data.shippingState,
        shippingZip: data.shippingZip,
        shippingCountry: data.shippingCountry,
        shippingNotesSeller: data.shippingNotesSeller,
        shippingNotesCourier: data.shippingNotesCourier,
      };

      const { data: responseData, error: invokeError } = await supabase.functions.invoke('create-order', {
        body: orderPayload,
      });

      if (invokeError) throw invokeError;
      if (responseData.error) throw new Error(responseData.error);

      if (toastId) toast.success("Order placed successfully! Redirecting to your orders.", { id: toastId });
      else showSuccess("Order placed successfully! Redirecting to your orders.");
      clearCart();
      onClose();
      navigate(`/shop/${shopDetails.slug}/orders?orderId=${responseData.order.id}`);
    } catch (err: any) {
      console.error("Checkout failed:", err);
      if (toastId) toast.error(`Failed to place order: ${err.message || "An unexpected error occurred."}`, { id: toastId });
      else showError(`Failed to place order: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const getDialogTitle = () => {
    switch (checkoutStep) {
      case 'cart': return "Your Cart";
      case 'contact-shipping': return "Checkout";
      case 'payment': return "Checkout";
      default: return "Your Cart";
    }
  };

  const getHeaderBackButton = () => {
    return (
      <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 md:h-9 md:w-9">
        <X className="h-5 w-5" />
        <span className="sr-only">Close</span>
      </Button>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "sm:max-w-5xl h-[90vh] flex flex-col p-0",
          blurEnabled ? "bg-card/80 backdrop-blur-[20px]" : "bg-card"
        )}
      >
        <DialogHeader className="p-4 md:p-6 border-b flex-row items-center justify-between flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl md:text-2xl font-bold">
            <ShoppingBag className="h-6 w-6 md:h-7 md:w-7" />
            {getDialogTitle()}
          </DialogTitle>
          {getHeaderBackButton()}
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 overflow-hidden">
          <div className="lg:col-span-2 flex flex-col h-full">
            {checkoutStep === 'cart' ? (
              <>
                {cartItems.length === 0 && savedItems.length === 0 ? (
                  <motion.div
                    key="empty-cart"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center justify-center flex-1 p-8 text-center"
                  >
                    <ShoppingBag className="h-20 w-20 md:h-24 md:w-24 text-muted-foreground mb-6" />
                    <h3 className="text-2xl md:text-3xl font-bold mb-4">Your cart is empty</h3>
                    <p className="text-base md:text-lg text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet.</p>
                    <Button onClick={onClose} className="text-base md:text-lg">Start Shopping</Button>
                  </motion.div>
                ) : (
                  <ScrollArea className="flex-1 p-4 md:p-6 pr-6">
                    <div className="space-y-6">
                      {cartItems.length > 0 && (
                        <div className="space-y-4">
                          <h2 className="text-lg md:text-xl font-bold font-heading">Items in Cart ({cartItems.length})</h2>
                          {hasSubscriptionProducts && (
                            <div className="flex items-center gap-2 p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                              <Info className="h-4 w-4 flex-shrink-0" />
                              <span>This cart includes subscription products. Cash on Delivery is not available.</span>
                            </div>
                          )}
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
                                  "flex items-start p-3 md:p-4 gap-3 md:gap-4 shadow-md",
                                  blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card"
                                )}>
                                  <Link to={`/shop/${shopDetails?.slug}/product/${item.productId}`} onClick={onClose} className="flex-shrink-0">
                                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-md overflow-hidden bg-muted border">
                                      <MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="object-cover" />
                                    </div>
                                  </Link>
                                  <div className="flex-1 flex flex-col justify-between">
                                    <Link to={`/shop/${shopDetails?.slug}/product/${item.productId}`} onClick={onClose}>
                                      <h3 className="font-semibold text-base md:text-lg hover:underline leading-tight">{item.name}</h3>
                                    </Link>

                                    {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {Object.entries(item.selectedOptions).map(([key, value]) => (
                                          <span key={key} className="capitalize">
                                            {key}: {Array.isArray(value) ? value.join(', ') : value}
                                          </span>
                                        )).join(' | ')}
                                      </p>
                                    )}
                                    {item.pricing_type === 'subscription' && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Subscription: {item.billing_interval === 'month' ? 'Monthly' : 'Yearly'}
                                      </p>
                                    )}

                                    <div className="flex items-center justify-between gap-2 mt-2">
                                      <div className="flex items-center border rounded-md h-9 flex-shrink-0">
                                        <motion.button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                          disabled={item.quantity <= 1}
                                          className="h-full w-8 rounded-r-none flex items-center justify-center"
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                        >
                                          <Minus className="h-4 w-4" />
                                        </motion.button>
                                        <Input
                                          type="number"
                                          value={item.quantity}
                                          onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                                          className="w-14 text-center border-y-0 border-x focus-visible:ring-0 text-sm h-full rounded-none"
                                          min={1}
                                        />
                                        <motion.button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                          disabled={item.quantity >= 99}
                                          className="h-full w-8 rounded-l-none flex items-center justify-center"
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                        >
                                          <Plus className="h-4 w-4" />
                                        </motion.button>
                                      </div>
                                      
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        {item.isDiscounted && (
                                          <p className="text-sm text-muted-foreground line-through">
                                            {formatCurrency(convertCurrency(item.originalPrice, item.currency, shopDetails?.currency), shopDetails?.currency)}
                                          </p>
                                        )}
                                        <p className={cn("font-semibold text-base md:text-lg", item.isDiscounted && "text-emerald-600")}>
                                          {formatCurrency(convertCurrency(item.price * item.quantity, item.currency, shopDetails?.currency), shopDetails?.currency)}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => saveForLater(item)}
                                          className="text-sm h-9 px-3"
                                        >
                                            <Bookmark className="mr-2 h-4 w-4" />
                                            Save
                                        </Button>
                                        <motion.button
                                          type="button"
                                          variant="destructive"
                                          size="icon"
                                          onClick={() => removeFromCart(item.productId)}
                                          className="text-destructive hover:text-destructive h-9 w-9 rounded-full"
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                        >
                                          <XCircle className="h-5 w-5" />
                                          <span className="sr-only">Remove {item.name}</span>
                                        </motion.button>
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
                          <h2 className="text-lg md:text-xl font-bold font-heading">Saved ({savedItems.length})</h2>
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
                                  "flex items-start p-3 md:p-4 gap-3 md:gap-4 shadow-md",
                                  blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card"
                                )}>
                                  <Link to={`/shop/${shopDetails?.slug}/product/${item.productId}`} onClick={onClose} className="flex-shrink-0">
                                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-md overflow-hidden bg-muted border">
                                      <MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="object-cover" />
                                    </div>
                                  </Link>
                                  <div className="flex-1 flex flex-col justify-between">
                                    <Link to={`/shop/${shopDetails?.slug}/product/${item.productId}`} onClick={onClose}>
                                      <h3 className="font-semibold text-base md:text-lg hover:underline leading-tight">{item.name}</h3>
                                    </Link>

                                    {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {Object.entries(item.selectedOptions).map(([key, value]) => (
                                          <span key={key} className="capitalize">
                                            {key}: {Array.isArray(value) ? value.join(', ') : value}
                                          </span>
                                        )).join(' | ')}
                                      </p>
                                    )}
                                    {item.pricing_type === 'subscription' && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Subscription: {item.billing_interval === 'month' ? 'Monthly' : 'Yearly'}
                                      </p>
                                    )}

                                    <div className="flex items-center justify-between gap-2 mt-2">
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        {item.isDiscounted && (
                                          <p className="text-sm text-muted-foreground line-through">
                                            {formatCurrency(convertCurrency(item.originalPrice, item.currency, shopDetails?.currency), shopDetails?.currency)}
                                          </p>
                                        )}
                                        <p className={cn("font-semibold text-base md:text-lg", item.isDiscounted && "text-emerald-600")}>
                                          {formatCurrency(convertCurrency(item.price, item.currency, shopDetails?.currency), shopDetails?.currency)}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => moveToCart(item.productId)}
                                          className="text-sm h-9"
                                        >
                                            <MoveRight className="mr-2 h-4 w-4" />
                                            Move to Cart
                                        </Button>
                                        <motion.button
                                          type="button"
                                          variant="destructive"
                                          size="icon"
                                          onClick={() => removeSavedItem(item.productId)}
                                          className="text-destructive hover:text-destructive h-9 w-9 rounded-full"
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                        >
                                          <XCircle className="h-5 w-5" />
                                          <span className="sr-only">Remove {item.name}</span>
                                        </motion.button>
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </>
            ) : (
              <CheckoutForm
                onBackToCart={handleBack}
                onPlaceOrder={handlePlaceOrder}
                isSubmittingOrder={isSubmittingOrder}
                cartItems={cartItems}
                subtotal={subtotal}
                shipping={shipping}
                total={total}
                shopDetails={shopDetails}
                appearanceSettings={appearanceSettings}
                convertCurrency={convertCurrency}
                hasSubscriptionProducts={hasSubscriptionProducts}
                checkoutStep={checkoutStep}
                setCheckoutStep={setCheckoutStep}
                onContinue={() => setCheckoutStep('payment')}
              />
            )}
          </div>

          <div className="lg:col-span-1 flex flex-col p-4 md:p-6 border-t lg:border-t-0 lg:border-l">
            <div className="space-y-4 flex-1">
              <h2 className="text-lg md:text-xl font-bold font-heading">Order Summary</h2>
              <div className="flex justify-between text-sm md:text-base">
                <span>Subtotal ({totalItems} items):</span>
                <span className="font-semibold">{formatCurrency(subtotal, shopDetails?.currency)}</span>
              </div>
              <div className="flex justify-between text-sm md:text-base">
                <span>Shipping:</span>
                <span className={cn("font-semibold", shipping === 0 && "text-emerald-600")}>
                  {shipping === 0 ? "FREE" : formatCurrency(shipping, shopDetails?.currency)}
                </span>
              </div>
              {totalSaved > 0 && (
                <div className="flex justify-between text-sm md:text-base text-emerald-600">
                  <span>You Saved:</span>
                  <span className="font-semibold">{formatCurrency(totalSaved, shopDetails?.currency)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg md:text-xl font-bold pt-2">
                <span>Total:</span>
                <span>{formatCurrency(total, shopDetails?.currency)}</span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 md:p-6 border-t flex-shrink-0">
          {checkoutStep === 'cart' && (
            <Button className="w-full text-base md:text-lg" onClick={handleProceedToCheckout} disabled={cartItems.length === 0}>
              Proceed to Checkout
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {checkoutStep === 'contact-shipping' && (
            <Button type="submit" form="checkout-form" className="w-full text-base md:text-lg" disabled={isSubmittingOrder}>
              Continue to Payment
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
          {checkoutStep === 'payment' && (
            <Button type="submit" form="checkout-form" className="w-full text-base md:text-lg" disabled={isSubmittingOrder}>
              {isSubmittingOrder ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Placing Order...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Place Order
                </>
              )}
            </Button>
          )}
          {checkoutStep !== 'cart' && (
            <Button variant="ghost" className="w-full text-base md:text-lg mt-2" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};