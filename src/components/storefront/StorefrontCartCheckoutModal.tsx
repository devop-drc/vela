import React, { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingBag, X, Minus, Plus, Trash2, Loader2, CreditCard, CheckCircle, ArrowLeft, Bookmark, MoveRight, ArrowRight, User, Mail, MapPin, Globe, StickyNote, Calendar, Lock, DollarSign, XCircle, Info } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useStorefront } from "@/contexts/StorefrontContext";
import { formatCurrency } from "@/lib/formatters";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { MediaItem } from "@/components/MediaItem";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { CheckoutForm, CheckoutFormValues } from "./CheckoutForm"; // Import CheckoutForm and its values
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StorefrontCartCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorefrontCartCheckoutModal = ({ isOpen, onClose }: StorefrontCartCheckoutModalProps) => {
  const { cartItems, savedItems, totalItems, subtotal, shipping, total, totalSaved, updateQuantity, removeFromCart, clearCart, saveForLater, moveToCart, removeSavedItem, hasSubscriptionProducts, hasDigitalSubscriptionProducts } = useCart();
  const { shopDetails, appearanceSettings, convertCurrency } = useStorefront();
  const { toast } = useToast();
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [currentCheckoutStep, setCurrentCheckoutStep] = useState(1); // 1: Contact, 2: Shipping, 3: Payment
  const [isSubmitting, setIsSubmitting] = useState(false); // Define isSubmitting state here
  const checkoutFormRef = useRef<{ validateCurrentStep: () => Promise<boolean>; handleInternalSubmit: () => Promise<void> }>(null);

  const blurEnabled = appearanceSettings?.blurEnabled;

  useEffect(() => {
    if (!isOpen) {
      setIsCheckoutMode(false);
      setIsOrderConfirmed(false);
      setConfirmedOrderId(null);
      setCurrentCheckoutStep(1); // Reset step when modal closes
      setIsSubmitting(false); // Reset submitting state
    }
  }, [isOpen]);

  const convertedTotalPrice = useMemo(() => {
    if (!shopDetails?.currency) return 0;
    return total;
  }, [total, shopDetails?.currency]);

  const handleOrderSuccess = (orderId: string) => {
    setIsOrderConfirmed(true);
    setConfirmedOrderId(orderId);
  };

  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Your cart is empty!",
        description: "Please add items to your cart before proceeding to checkout.",
        variant: "destructive",
      });
      return;
    }
    setIsCheckoutMode(true);
    setCurrentCheckoutStep(1); // Start at the first step
  };

  const handleBackToCart = () => {
    setIsCheckoutMode(false);
    setCurrentCheckoutStep(1); // Reset step when going back to cart
  };

  const handleNextStep = async () => {
    if (checkoutFormRef.current) {
      const isValid = await checkoutFormRef.current.validateCurrentStep();
      if (isValid) {
        setCurrentCheckoutStep(prev => prev + 1);
      } else {
        toast({
          title: "Please complete the current step",
          description: "Some required fields are missing or invalid.",
          variant: "destructive",
        });
      }
    }
  };

  const handlePreviousStep = () => {
    setCurrentCheckoutStep(prev => prev - 1);
  };

  const handlePlaceOrder = async () => {
    if (checkoutFormRef.current) {
      const isValid = await checkoutFormRef.current.validateCurrentStep();
      if (isValid) {
        setIsSubmitting(true); // Set submitting state
        await checkoutFormRef.current.handleInternalSubmit();
      } else {
        toast({
          title: "Please complete the current step",
          description: "Some required fields are missing or invalid.",
          variant: "destructive",
        });
      }
    }
  };

  const onSubmitCheckoutForm = async (values: CheckoutFormValues) => {
    if (!shopDetails) {
      toast({
        title: "Shop details not loaded.",
        description: "Cannot place order. Please try again later.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Create the order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          business_id: shopDetails.id, // Use shopDetails.id which is business_id
          customer_name: values.customerName,
          customer_email: values.customerEmail,
          customer_phone: values.customerPhone,
          total_amount: convertedTotalPrice, // totalPrice is already in shop's currency
          currency: shopDetails.currency, // Use shop's currency
          status: 'Pending',
          payment_method: values.paymentMethod,
          payment_status: values.paymentMethod === 'cash_on_delivery' ? 'pending' : 'paid', // Assume credit card is paid immediately
          shipping_address: values.shippingAddress,
          shipping_city: values.shippingCity,
          shipping_state: values.shippingState,
          shipping_zip: values.shippingZip,
          shipping_country: values.shippingCountry,
          shipping_notes_seller: values.shippingNotesSeller,
          shipping_notes_courier: values.shippingNotesCourier,
        })
        .select('id')
        .single();

      if (orderError || !orderData) {
        throw new Error(orderError?.message || "Failed to create order.");
      }

      const orderId = orderData.id;

      // 2. Insert order items
      const orderItemsToInsert = cartItems.map(item => ({
        order_id: orderId,
        product_id: item.productId,
        quantity: item.quantity,
        price_at_purchase: convertCurrency(item.price, item.currency, 'ALL'), // Store in ALL for consistency
        selected_options: item.selectedOptions,
        interval_repetitions: item.intervalRepetitions, // New field
      }));

      const { error: orderItemsError } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert);

      if (orderItemsError) {
        throw new Error(orderItemsError?.message || "Failed to add order items.");
      }

      // 3. Update product inventory for one-time physical products
      for (const item of cartItems) {
        if (item.pricing_type === 'one_time' && item.product_type === 'physical') {
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('inventory')
            .eq('id', item.productId)
            .single();

          if (productError || !product) {
            console.warn(`Could not fetch inventory for product ${item.productId}. Skipping inventory update.`);
            continue;
          }

          const newInventory = (product.inventory || 0) - item.quantity;
          const newStatus = newInventory <= 0 ? 'Out of Stock' : 'Active'; // Assuming 'Active' if > 0

          const { error: updateError } = await supabase
            .from('products')
            .update({ inventory: newInventory, status: newStatus })
            .eq('id', item.productId);

          if (updateError) {
            console.error(`Failed to update inventory for product ${item.productId}:`, updateError);
          }
        }
      }

      toast({
        title: "Order placed successfully!",
        description: `Your order total was ${formatCurrency(convertedTotalPrice, shopDetails?.currency)}.`,
        variant: "success",
      });
      clearCart();
      handleOrderSuccess(orderId);
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast({
        title: "Checkout failed!",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
            {isCheckoutMode && !isOrderConfirmed ? (
              <Button variant="ghost" size="icon" onClick={handleBackToCart} className="mr-2 h-8 w-8 md:h-9 md:w-9">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back to Cart</span>
              </Button>
            ) : (
              <ShoppingBag className="h-6 w-6 md:h-7 md:w-7" />
            )}
            {isOrderConfirmed ? "Order Confirmed!" : (isCheckoutMode ? "Checkout" : "Your Cart")}
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 md:h-9 md:w-9">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
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
                  ref={checkoutFormRef}
                  currentStep={currentCheckoutStep}
                  onSubmitForm={onSubmitCheckoutForm}
                  isSubmitting={isSubmitting}
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 overflow-hidden">
                  <ScrollArea className="lg:col-span-2 flex flex-col p-4 md:p-6 border-r">
                    <div className="space-y-6">
                      {cartItems.length > 0 && (
                        <div className="space-y-4">
                          <h2 className="text-lg md:text-xl font-bold font-heading">Items in Cart ({cartItems.length})</h2>
                          {hasSubscriptionProducts && (
                            <div className="flex items-center gap-2 p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                              <Info className="h-4 w-4 flex-shrink-0" />
                              <span>This cart includes subscription products.</span>
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
                                        {item.intervalRepetitions && item.intervalRepetitions > 1 && (
                                          <span> x {item.intervalRepetitions} intervals</span>
                                        )}
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
                                        {item.intervalRepetitions && item.intervalRepetitions > 1 && (
                                          <span> x {item.intervalRepetitions} intervals</span>
                                        )}
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
                    <div className="mt-6 flex-shrink-0">
                      <Button className="w-full text-base md:text-lg" onClick={handleProceedToCheckout} disabled={cartItems.length === 0}>
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

        {/* Dialog Footer for action buttons */}
        {!isOrderConfirmed && (
          <DialogFooter className="p-4 md:p-6 border-t flex-shrink-0">
            {isCheckoutMode ? (
              <div className="flex justify-between items-center w-full">
                <Button variant="outline" onClick={handlePreviousStep} disabled={currentCheckoutStep === 1 || isSubmitting}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                {currentCheckoutStep < 3 ? (
                  <Button onClick={handleNextStep} disabled={isSubmitting}>
                    Next Step
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handlePlaceOrder} disabled={isSubmitting || !checkoutFormRef.current?.getValues('acceptTerms')}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Place Order
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex justify-between items-center w-full">
                <Button variant="ghost" onClick={onClose}>Continue Shopping</Button>
                <Button onClick={handleProceedToCheckout} disabled={cartItems.length === 0}>
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};