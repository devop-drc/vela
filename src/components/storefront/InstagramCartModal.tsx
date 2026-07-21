"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Reveal } from "@/lib/anim";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingBag, X, Minus, Plus, Trash2, Loader2, CreditCard, CheckCircle, ArrowLeft, Bookmark, MoveRight, ArrowRight, User, Mail, MapPin, Phone, StickyNote, Info, Wallet, ShieldCheck, Lock, Banknote, Hash, XCircle, Truck } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useStorefront } from "@/contexts/StorefrontContext";
import { formatCurrency } from "@/lib/formatters";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MediaItem } from "@/components/MediaItem";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { InstagramCheckoutForm, CheckoutFormData } from "./InstagramCheckoutForm";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

interface InstagramCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstagramCartDrawer = ({ isOpen, onClose }: InstagramCartDrawerProps) => {
  const { cartItems, savedItems, totalItems, subtotal, shipping, total, totalSaved, updateQuantity, removeFromCart, clearCart, saveForLater, moveToCart, removeSavedItem, hasSubscriptionProducts } = useCart();
  const { shopDetails, convertCurrency } = useStorefront();
  const navigate = useNavigate();
  const { shopSlug } = useParams<{ shopSlug: string }>();

  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'contact-shipping' | 'payment'>('cart');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCheckoutStep('cart');
    }
  }, [isOpen]);

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

      if (data.paymentMethod === 'card' && responseData?.order?.id) {
        // Card orders finish on RaiAccept's hosted form (webhook settles status).
        // Return to the page the customer was on when they paid.
        if (toastId) toast.loading('Redirecting to secure payment…', { id: toastId });
        const returnUrl = `${window.location.origin}${window.location.pathname}`;
        const { data: payRes, error: payErr } = await supabase.functions.invoke('create-order-payment', {
          body: { orderId: responseData.order.id, shopSlug: shopDetails.slug, returnUrl },
        });
        if (payErr || payRes?.error || !payRes?.url) {
          throw new Error(payRes?.error || payErr?.message || 'Could not start the card payment.');
        }
        clearCart();
        onClose();
        window.location.assign(payRes.url);
        return;
      }

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

  const getDrawerTitle = () => {
    switch (checkoutStep) {
      case 'cart': return "Your Cart";
      case 'contact-shipping': return "Checkout";
      case 'payment': return "Checkout";
      default: return "Your Cart";
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col bg-background text-foreground rounded-t-xl">
        <SheetHeader className="p-4 border-b border-border flex-row items-center justify-between flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
            <ShoppingBag className="h-6 w-6 text-red-500" />
            {getDrawerTitle()}
          </SheetTitle>
          <Button variant="ghost" size="icon" onClick={handleBack} className="text-foreground hover:bg-muted">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          {checkoutStep === 'cart' ? (
            <>
              {cartItems.length === 0 && savedItems.length === 0 ? (
                <Reveal from="up"
                  key="empty-cart"
                  className="flex flex-col items-center justify-center flex-1 p-8 text-center h-full"
                >
                  <ShoppingBag className="h-20 w-20 text-muted-foreground mb-6" />
                  <h3 className="text-2xl font-bold mb-4">Your cart is empty</h3>
                  <p className="text-base text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet.</p>
                  <Button onClick={onClose} className="text-base bg-red-500 hover:bg-red-600 text-white">Start Shopping</Button>
                </Reveal>
              ) : (
                <ScrollArea className="flex-1 p-4 pr-6">
                  <div className="space-y-6">
                    {cartItems.length > 0 && (
                      <div className="space-y-4">
                        <h2 className="text-lg font-bold text-foreground">Items in Cart ({cartItems.length})</h2>
                        {hasSubscriptionProducts && (
                          <div className="flex items-center gap-2 p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                            <Info className="h-4 w-4 flex-shrink-0" />
                            <span>This cart includes subscription products. Cash on Delivery is not available.</span>
                          </div>
                        )}
                          {cartItems.map(item => (
                            <Reveal from="up"
                              key={item.productId}
                            >
                              <Card className="flex items-start p-3 gap-3 shadow-sm border border-border bg-card">
                                <Link to={`/instagramShop/${shopSlug}/product/${item.productId}`} onClick={onClose} className="flex-shrink-0">
                                  <div className="h-20 w-20 rounded-md overflow-hidden bg-muted border border-border">
                                    <MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="object-cover" />
                                  </div>
                                </Link>
                                <div className="flex-1 flex flex-col justify-between">
                                  <Link to={`/instagramShop/${shopSlug}/product/${item.productId}`} onClick={onClose}>
                                    <h3 className="font-semibold text-base hover:underline leading-tight text-foreground">{item.name}</h3>
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
                                    <div className="flex items-center border border-border rounded-md h-9 flex-shrink-0">
                                      <button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                        disabled={item.quantity <= 1}
                                        className="h-full w-8 rounded-r-none flex items-center justify-center text-foreground hover:bg-muted"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                      >
                                        <Minus className="h-4 w-4" />
                                      </Reveal>
                                      <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                                        className="w-14 text-center border-y-0 border-x border-border focus-visible:ring-0 text-sm h-full rounded-none bg-transparent"
                                        min={1}
                                      />
                                      <button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                        disabled={item.quantity >= 99}
                                        className="h-full w-8 rounded-l-none flex items-center justify-center text-foreground hover:bg-muted"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Reveal>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {item.isDiscounted && (
                                        <p className="text-sm text-muted-foreground line-through">
                                          {formatCurrency(convertCurrency(item.originalPrice, item.currency, shopDetails?.currency), shopDetails?.currency)}
                                        </p>
                                      )}
                                      <p className={cn("font-semibold text-base", item.isDiscounted && "text-green-600")}>
                                        {formatCurrency(convertCurrency(item.price * item.quantity, item.currency, shopDetails?.currency), shopDetails?.currency)}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => saveForLater(item)}
                                        className="text-sm h-9 px-3 bg-muted text-foreground border-border hover:bg-accent"
                                      >
                                          <Bookmark className="mr-2 h-4 w-4" />
                                          Save
                                      </Button>
                                      <button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => removeFromCart(item.productId)}
                                        className="text-destructive hover:text-destructive h-9 w-9 rounded-full bg-destructive/10 hover:bg-destructive/20"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                      >
                                        <XCircle className="h-5 w-5" />
                                        <span className="sr-only">Remove {item.name}</span>
                                      </Reveal>
                                    </div>
                                  </div>
                                </Card>
                              </Reveal>
                          ))}
                      </div>
                    )}

                    {savedItems.length > 0 && (
                      <div className="space-y-4 mt-6">
                        <h2 className="text-lg font-bold text-foreground">Saved ({savedItems.length})</h2>
                          {savedItems.map(item => (
                            <Reveal from="up"
                              key={item.productId}
                            >
                              <Card className="flex items-start p-3 gap-3 shadow-sm border border-border bg-card">
                                <Link to={`/instagramShop/${shopSlug}/product/${item.productId}`} onClick={onClose} className="flex-shrink-0">
                                  <div className="h-20 w-20 rounded-md overflow-hidden bg-muted border border-border">
                                    <MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="object-cover" />
                                  </div>
                                </Link>
                                <div className="flex-1 flex flex-col justify-between">
                                  <Link to={`/instagramShop/${shopSlug}/product/${item.productId}`} onClick={onClose}>
                                    <h3 className="font-semibold text-base hover:underline leading-tight text-foreground">{item.name}</h3>
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
                                      <p className={cn("font-semibold text-base", item.isDiscounted && "text-green-600")}>
                                        {formatCurrency(convertCurrency(item.price, item.currency, shopDetails?.currency), shopDetails?.currency)}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => moveToCart(item.productId)}
                                        className="text-sm h-9 bg-muted text-foreground border-border hover:bg-accent"
                                      >
                                          <MoveRight className="mr-2 h-4 w-4" />
                                          Move to Cart
                                      </Button>
                                      <button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => removeSavedItem(item.productId)}
                                        className="text-destructive hover:text-destructive h-9 w-9 rounded-full bg-destructive/10 hover:bg-destructive/20"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                      >
                                        <XCircle className="h-5 w-5" />
                                        <span className="sr-only">Remove {item.name}</span>
                                      </Reveal>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            </Reveal>
                          ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </>
          )}

          {(checkoutStep === 'contact-shipping' || checkoutStep === 'payment') && (
            <InstagramCheckoutForm
              onBack={handleBack}
              onPlaceOrder={handlePlaceOrder}
              isSubmittingOrder={isSubmittingOrder}
              cartItems={cartItems}
              subtotal={subtotal}
              shipping={shipping}
              total={total}
              shopDetails={shopDetails}
              convertCurrency={convertCurrency}
              hasSubscriptionProducts={hasSubscriptionProducts}
              checkoutStep={checkoutStep}
              setCheckoutStep={setCheckoutStep}
              onContinue={() => setCheckoutStep('payment')}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};