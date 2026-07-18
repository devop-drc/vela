"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { CartItem } from "@/contexts/CartContext";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
import { QuantityInput } from "./QuantityInput";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { InstagramCheckoutForm, CheckoutFormData, CustomerAddress, LOCAL_STORAGE_ADDRESSES_KEY } from "./InstagramCheckoutForm"; // Import LOCAL_STORAGE_ADDRESSES_KEY
import { saveStoredCustomer, addStoredOrderId } from "@/lib/instagramCustomer";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess, toFriendlyError } from "@/utils/toast";
import { InstagramProductQuickViewModal } from "./InstagramProductQuickViewModal"; // Import new modal
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // Import Accordion components
import { Badge } from "@/components/ui/badge";

interface InstagramCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialCartItems?: CartItem[]; // New prop for Buy Now flow
  onOrderPlaced?: () => void; // New callback for Buy Now flow
}

export const InstagramCartDrawer = ({ isOpen, onClose, initialCartItems, onOrderPlaced }: InstagramCartDrawerProps) => {
  const { cartItems: persistentCartItems, savedItems, totalItems: persistentTotalItems, subtotal: persistentSubtotal, shipping: persistentShipping, total: persistentTotal, totalSaved: persistentTotalSaved, updateQuantity, removeFromCart, clearCart, saveForLater, moveToCart, removeSavedItem, hasSubscriptionProducts: persistentHasSubscriptionProducts } = useCart();
  const { shopDetails, convertCurrency, promotions } = useStorefront();
  const navigate = useNavigate();
  const { shopSlug } = useParams<{ shopSlug: string }>();

  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'contact-shipping' | 'payment'>('cart');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]); // State for saved addresses
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new'); // State for selected address

  const [isProductQuickViewModalOpen, setIsProductQuickViewModalOpen] = useState(false);
  const [productToQuickView, setProductToQuickView] = useState<{ productId: string; shopSlug: string } | null>(null);


  // Determine which cart items to use (persistent or initial for Buy Now)
  const currentCartItems = useMemo(() => initialCartItems || persistentCartItems, [initialCartItems, persistentCartItems]);

  // Recalculate totals based on currentCartItems
  const totalItems = useMemo(() => currentCartItems.reduce((sum, item) => sum + item.quantity, 0), [currentCartItems]);
  const subtotal = useMemo(() => {
    if (!shopDetails) return 0;
    return currentCartItems.reduce((sum, item) => {
      const convertedPrice = convertCurrency(item.price, item.currency);
      return sum + (convertedPrice * item.quantity);
    }, 0);
  }, [currentCartItems, shopDetails, convertCurrency]);

  const FREE_SHIPPING_THRESHOLD = 50; // Define free shipping threshold in USD
  const shipping = useMemo(() => {
    if (!shopDetails) return 0;
    const convertedThreshold = convertCurrency(FREE_SHIPPING_THRESHOLD, 'USD');
    return subtotal >= convertedThreshold ? 0 : convertCurrency(5, 'USD');
  }, [subtotal, shopDetails, convertCurrency]);

  const total = useMemo(() => subtotal + shipping, [subtotal, shipping]);

  const totalSaved = useMemo(() => {
    if (!shopDetails) return 0;
    return currentCartItems.reduce((sum, item) => {
      const convertedOriginalPrice = convertCurrency(item.originalPrice, item.currency);
      const convertedCurrentPrice = convertCurrency(item.price, item.currency);
      return sum + ((convertedOriginalPrice - convertedCurrentPrice) * item.quantity);
    }, 0);
  }, [currentCartItems, shopDetails, convertCurrency]);

  const hasSubscriptionProducts = useMemo(() => {
    return currentCartItems.some(item => item.pricing_type === 'subscription');
  }, [currentCartItems]);

  // Group lines by productId for variant breakdowns
  const variantsByProduct = useMemo(() => {
    const map = new Map<string, typeof currentCartItems>();
    currentCartItems.forEach(ci => {
      const arr = map.get(ci.productId) || [] as typeof currentCartItems;
      (arr as any).push(ci);
      map.set(ci.productId, arr as any);
    });
    return map;
  }, [currentCartItems]);
  const [openVariantFor, setOpenVariantFor] = useState<string | null>(null);


  useEffect(() => {
    if (isOpen) {
      // If initialCartItems are provided, go straight to checkout
      if (initialCartItems && initialCartItems.length > 0) {
        setCheckoutStep('contact-shipping');
      } else {
        setCheckoutStep('cart');
      }
    }
  }, [isOpen, initialCartItems]);

  // Load addresses from local storage on mount
  useEffect(() => {
    const storedAddresses = localStorage.getItem(LOCAL_STORAGE_ADDRESSES_KEY);
    if (storedAddresses) {
      setSavedAddresses(JSON.parse(storedAddresses));
    }
  }, []);

  const handleProceedToCheckout = () => {
    if (!shopDetails?.slug) {
      toast.error("Shop details not available.");
      return;
    }
    if (currentCartItems.length === 0) {
      toast.error("Your cart is empty. Please add items before checking out.");
      return;
    }
    setCheckoutStep('contact-shipping');
  };

  const handleBack = () => {
    if (checkoutStep === 'payment') {
      setCheckoutStep('contact-shipping');
    } else if (checkoutStep === 'contact-shipping') {
      // If it's a Buy Now flow, going back from contact-shipping should close the drawer
      if (initialCartItems) {
        onClose();
      } else {
        setCheckoutStep('cart');
      }
    } else {
      onClose();
    }
  };

  const handlePlaceOrder = async (data: CheckoutFormData) => {
    if (!shopDetails) {
      showError("Shop details not loaded. Cannot place order.");
      return;
    }
    if (currentCartItems.length === 0) {
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
        cartItems: currentCartItems.map(item => ({ // Use currentCartItems here
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          currency: item.currency,
          selectedOptions: item.selectedOptions || null,
        })),
        totalAmount: total, // Use calculated total
        currency: shopDetails.currency,
        paymentMethod: data.paymentMethod,
        shippingAddress: data.shippingAddress,
        shippingCity: data.shippingCity,
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

      // Persist the customer + this order locally so "My Orders" works without an account.
      saveStoredCustomer({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
      });
      if (responseData?.order?.id) addStoredOrderId(responseData.order.id);

      if (data.paymentMethod === 'card' && responseData?.order?.id) {
        // Continue on RaiAccept's hosted form; the gateway returns the
        // customer to this shop with the order id, and the webhook settles
        // the payment status.
        if (toastId) toast.loading('Redirecting to secure payment…', { id: toastId });
        const returnUrl = `${window.location.origin}/instagramShop/${shopDetails.slug}`;
        const { data: payRes, error: payErr } = await supabase.functions.invoke('create-order-payment', {
          body: { orderId: responseData.order.id, shopSlug: shopDetails.slug, returnUrl },
        });
        if (payErr || payRes?.error || !payRes?.url) {
          throw new Error(payRes?.error || payErr?.message || 'Could not start the card payment.');
        }
        if (!initialCartItems) clearCart();
        onClose();
        onOrderPlaced?.();
        window.location.assign(payRes.url);
        return;
      }

      if (toastId) toast.success("Order placed successfully! Redirecting to your orders.", { id: toastId });
      else showSuccess("Order placed successfully! Redirecting to your orders.");
      
      // Only clear persistent cart if it's not a Buy Now flow
      if (!initialCartItems) {
        clearCart();
      }
      
      onClose();
      if (onOrderPlaced) {
        onOrderPlaced(); // Notify parent for Buy Now flow
      }
      // MODIFIED: Redirect to Instagram shop homepage and pass orderId
      navigate(`/instagramShop/${shopDetails.slug}?orderId=${responseData.order.id}`);
    } catch (err: any) {
      console.error("Checkout failed:", err);
      const friendly = toFriendlyError(err, "We couldn't place your order. Please try again.");
      if (toastId) toast.error(friendly, { id: toastId });
      else showError(friendly);
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

  const handleOpenProductQuickView = (productId: string) => {
    setProductToQuickView({ productId, shopSlug: shopDetails?.slug || '' });
    setIsProductQuickViewModalOpen(true);
  };

  const getPromotionBadge = (promo: any) => {
    switch (promo.type) {
      case 'discount':
        if (promo.value?.discountType === 'percentage') return `${promo.value.discountValue}% OFF`;
        if (promo.value?.discountType === 'flat') return `-${formatCurrency(promo.value.discountValue, shopDetails?.currency)} OFF`;
        return 'Discount';
      case 'offer':
        if (promo.value?.offerType === 'free_shipping') return 'Free Shipping';
        return 'Offer';
      default: return null;
    }
  };

  const isMobile = useIsMobile();

  const inner = (
    <>
      <div className="p-4 border-b flex-row items-center justify-between flex-shrink-0" style={{borderColor:'hsl(var(--border))'}}>
        <div className="flex items-center gap-2 text-xl font-bold">
          <ShoppingBag className="h-6 w-6 text-[hsl(var(--primary))]" />
          {getDrawerTitle()}
        </div>
      </div>
      <span id="instagram-cart-description" className="sr-only">
        {checkoutStep === 'cart' ? 'Review your items, then proceed to checkout.' : 'Enter your details to complete your order.'}
      </span>

      <div className="flex-1 overflow-hidden flex flex-col" style={{ overscrollBehavior: 'contain' }}>
            {(checkoutStep === 'cart' && !initialCartItems) ? (
              <>
                {currentCartItems.length === 0 && savedItems.length === 0 ? (
                  <motion.div
                    key="empty-cart"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center justify-center flex-1 p-8 text-center h-full"
                  >
                    <div className="mb-5 grid h-20 w-20 place-items-center rounded-full bg-[hsl(var(--primary))]/10">
                      <ShoppingBag className="h-9 w-9 text-[hsl(var(--primary))]" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold">Your cart is empty</h3>
                    <p className="mb-6 max-w-[240px] text-sm text-[hsl(var(--muted-foreground))]">Looks like you haven't added anything to your cart yet.</p>
                    <Button onClick={onClose} className="rounded-full bg-[hsl(var(--primary))] px-6 text-white">Start Shopping</Button>
                  </motion.div>
                ) : (
                  <ScrollArea className="flex-1" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' as any }}>
                    <div>
                      {currentCartItems.length > 0 && (
                        <Accordion type="single" collapsible defaultValue="items-in-cart" className="w-full">
                          <AccordionItem value="items-in-cart" className="border-b px-5" style={{borderColor:'hsl(var(--border))'}}>
                            <AccordionTrigger className="text-base font-semibold">Items in cart <span className="ml-1 font-normal text-[hsl(var(--muted-foreground))]">({currentCartItems.length})</span></AccordionTrigger>
                            <AccordionContent>
                              {hasSubscriptionProducts && (
                                <div className="flex items-center gap-2 p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md mb-4">
                                  <Info className="h-4 w-4 flex-shrink-0" />
                                  <span>This cart includes subscription products. Cash on Delivery is not available.</span>
                                </div>
                              )}
                              <AnimatePresence>
                                {currentCartItems.map(item => {
                                  const productPromotions = promotions.filter(promo => {
                                    if (!promo.is_active) return false;
                                    const now = new Date();
                                    const startDate = promo.start_date ? new Date(promo.start_date) : null;
                                    const endDate = promo.end_date ? new Date(promo.end_date) : null;
                                    if (startDate && now < startDate) return false;
                                    if (endDate && now > endDate) return false;
                                    if (promo.target_products && promo.target_products.length > 0) {
                                      return promo.target_products.includes(item.productId);
                                    }
                                    return true;
                                  });
                                  const firstDiscount = productPromotions.find(p => p.type === 'discount');
                                  const hasOffer = productPromotions.some(p => p.type === 'offer');

                                  return (
                                    <motion.div
                                      key={item.uid}
                                      layout
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, x: -100 }}
                                      transition={{ duration: 0.2 }}
                                      className="mb-3 last:mb-0"
                                    >
                                      <Card className="flex gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-sm">
                                        {/* Thumbnail */}
                                        <button onClick={() => handleOpenProductQuickView(item.productId)} className="flex-shrink-0 self-start">
                                          <div className="h-20 w-20 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                                            <MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="h-full w-full object-cover" />
                                          </div>
                                        </button>

                                        {/* Details */}
                                        <div className="flex min-w-0 flex-1 flex-col">
                                          <div className="flex items-start justify-between gap-2">
                                            <button onClick={() => handleOpenProductQuickView(item.productId)} className="min-w-0 text-left text-[hsl(var(--foreground))]">
                                              <h3 className="text-sm font-semibold leading-snug line-clamp-2">{item.name}</h3>
                                            </button>
                                            <div className="-mr-1 -mt-1 flex shrink-0 items-center">
                                              <button type="button" onClick={() => saveForLater(item)} aria-label="Save for later" title="Save for later"
                                                className="grid h-8 w-8 place-items-center rounded-full text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]">
                                                <Bookmark className="h-4 w-4" />
                                              </button>
                                              <button type="button" onClick={() => removeFromCart(item.uid)} aria-label="Remove" title="Remove"
                                                className="grid h-8 w-8 place-items-center rounded-full text-[hsl(var(--muted-foreground))] transition-colors hover:bg-red-500/10 hover:text-red-500">
                                                <XCircle className="h-4 w-4" />
                                              </button>
                                            </div>
                                          </div>
                                          {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                                            <p className="mt-0.5 truncate text-xs text-[hsl(var(--muted-foreground))]">
                                              {Object.entries(item.selectedOptions).map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" · ")}
                                            </p>
                                          )}
                                          {(firstDiscount || hasOffer) && (
                                            <div className="mt-1 flex gap-1">
                                              {firstDiscount && (
                                                <Badge className="bg-green-600 px-1.5 py-0.5 text-[10px] text-white">{getPromotionBadge(firstDiscount)}</Badge>
                                              )}
                                              {hasOffer && (
                                                <Badge className="bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">Offer</Badge>
                                              )}
                                            </div>
                                          )}
                                          <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
                                            <div className="flex items-baseline gap-1.5 text-[hsl(var(--foreground))]">
                                              {item.isDiscounted && (
                                                <span className="text-xs opacity-60 line-through">
                                                  {formatCurrency(convertCurrency(item.originalPrice, item.currency), shopDetails?.currency)}
                                                </span>
                                              )}
                                              <span className={cn("text-sm font-bold", item.isDiscounted && "text-green-600")}>
                                                {formatCurrency(convertCurrency(item.price, item.currency), shopDetails?.currency)}
                                              </span>
                                            </div>
                                            {/* Compact pill stepper */}
                                            <div className="flex h-8 shrink-0 items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 text-[hsl(var(--foreground))]">
                                              <button type="button" onClick={() => updateQuantity(item.uid, item.quantity - 1)} disabled={item.quantity <= 1}
                                                className="grid h-full w-8 place-items-center rounded-l-full transition-colors hover:bg-[hsl(var(--muted))] disabled:opacity-40">
                                                <Minus className="h-3.5 w-3.5" />
                                              </button>
                                              <QuantityInput
                                                value={item.quantity}
                                                onChange={(v) => updateQuantity(item.uid, v)}
                                                className="h-full w-9 justify-center rounded-none border-0 bg-transparent p-0 text-center text-sm font-semibold focus-visible:ring-0"
                                              />
                                              <button type="button" onClick={() => updateQuantity(item.uid, item.quantity + 1)} disabled={item.quantity >= 99}
                                                className="grid h-full w-8 place-items-center rounded-r-full transition-colors hover:bg-[hsl(var(--muted))] disabled:opacity-40">
                                                <Plus className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </Card>
                                    </motion.div>
                                  );
                                })}
                              </AnimatePresence>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}

                      {savedItems.length > 0 && (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="saved-for-later" className="border-b px-5" style={{borderColor:'hsl(var(--border))'}}>
                            <AccordionTrigger className="text-base font-semibold">Saved for later <span className="ml-1 font-normal text-[hsl(var(--muted-foreground))]">({savedItems.length})</span></AccordionTrigger>
                            <AccordionContent>
                              <AnimatePresence>
                                {savedItems.map(item => (
                                  <motion.div
                                    key={item.productId}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ duration: 0.2 }}
                                    className="mb-3 last:mb-0"
                                  >
                                    <Card className="flex gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-sm">
                                      <button onClick={() => handleOpenProductQuickView(item.productId)} className="flex-shrink-0 self-start">
                                        <div className="h-16 w-16 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                                          <MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="h-full w-full object-cover" />
                                        </div>
                                      </button>
                                      <div className="flex min-w-0 flex-1 flex-col">
                                        <div className="flex items-start justify-between gap-2">
                                          <button onClick={() => handleOpenProductQuickView(item.productId)} className="min-w-0 text-left text-[hsl(var(--foreground))]">
                                            <h3 className="text-sm font-semibold leading-snug line-clamp-2">{item.name}</h3>
                                          </button>
                                          <button type="button" onClick={() => removeSavedItem(item.uid)} aria-label="Remove" title="Remove"
                                            className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[hsl(var(--muted-foreground))] transition-colors hover:bg-red-500/10 hover:text-red-500">
                                            <XCircle className="h-4 w-4" />
                                          </button>
                                        </div>
                                        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
                                          <span className={cn("text-sm font-bold text-[hsl(var(--foreground))]", item.isDiscounted && "text-green-600")}>
                                            {formatCurrency(convertCurrency(item.price, item.currency), shopDetails?.currency)}
                                          </span>
                                          <button type="button" onClick={() => moveToCart(item.uid)}
                                            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[hsl(var(--primary))] px-3 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90">
                                            <MoveRight className="h-3.5 w-3.5" /> Move to cart
                                          </button>
                                        </div>
                                      </div>
                                    </Card>
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </>
            ) : (
              <InstagramCheckoutForm
                onBack={handleBack}
                onPlaceOrder={handlePlaceOrder}
                isSubmittingOrder={isSubmittingOrder}
                cartItems={currentCartItems} // Pass currentCartItems
                subtotal={subtotal} // Pass calculated subtotal
                shipping={shipping} // Pass calculated shipping
                total={total} // Pass calculated total
                shopDetails={shopDetails}
                convertCurrency={convertCurrency}
                hasSubscriptionProducts={hasSubscriptionProducts} // Pass calculated hasSubscriptionProducts
                checkoutStep={checkoutStep === 'payment' ? 'payment' : 'contact-shipping'}
                setCheckoutStep={setCheckoutStep}
                onContinue={() => setCheckoutStep('payment')}
                savedAddresses={savedAddresses} // Pass saved addresses
                setSavedAddresses={setSavedAddresses} // Pass setter for saved addresses
                selectedAddressId={selectedAddressId} // Pass selected address ID
                setSelectedAddressId={setSelectedAddressId} // Pass setter for selected address ID
              />
            )}
          </div>
          <div className="p-4 border-t flex-shrink-0" style={{ paddingBottom: 'calc(1rem + var(--sab))', borderColor:'hsl(var(--border))' }}>
            <div className="flex flex-col w-full space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal ({totalItems} items):</span>
                <span className="font-semibold">{formatCurrency(subtotal, shopDetails?.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping:</span>
                <span className={cn("font-semibold", shipping === 0 && "text-green-600")}>
                  {shipping === 0 ? "FREE" : formatCurrency(shipping, shopDetails?.currency)}
                </span>
              </div>
              {shipping > 0 && (() => {
                const threshold = convertCurrency(FREE_SHIPPING_THRESHOLD, 'USD');
                const away = threshold - subtotal;
                const pct = Math.min(100, Math.round((subtotal / Math.max(1, threshold)) * 100));
                return away > 0 ? (
                  <div className="rounded-xl bg-[hsl(var(--primary))]/10 px-3 py-2">
                    <p className="text-center text-xs text-[hsl(var(--primary))]">
                      Add {formatCurrency(away, shopDetails?.currency)} more for <strong>free shipping</strong> 🎉
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--primary))]/15">
                      <div className="h-full rounded-full bg-[hsl(var(--primary))] transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ) : null;
              })()}
              {totalSaved > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>You Saved:</span>
                  <span className="font-semibold">{formatCurrency(totalSaved, shopDetails?.currency)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-bold pt-2">
                <span>Total:</span>
                <span>{formatCurrency(total, shopDetails?.currency)}</span>
              </div>
              <div className="mt-1 flex flex-row-reverse items-center gap-2">
              {checkoutStep === 'cart' && !initialCartItems && ( // Only show if it's the persistent cart
                <Button className="h-12 flex-1 rounded-full bg-[hsl(var(--primary))] text-base font-semibold text-white shadow-md" onClick={handleProceedToCheckout} disabled={currentCartItems.length === 0}>
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {checkoutStep === 'contact-shipping' && (
                <Button type="submit" form="instagram-checkout-form" className="h-12 flex-1 rounded-full bg-[hsl(var(--primary))] text-base font-semibold text-white shadow-md" disabled={isSubmittingOrder}>
                  Continue to Payment
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
              {checkoutStep === 'payment' && (
                <Button type="submit" form="instagram-checkout-form" className="h-12 flex-1 rounded-full bg-[hsl(var(--primary))] text-base font-semibold text-white shadow-md" disabled={isSubmittingOrder}>
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
              <Button variant="outline" className="h-12 shrink-0 rounded-full border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]" onClick={handleBack}>
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back
              </Button>
              </div>
            </div>
          </div>
    </>
  );

  return (
    <>
      {isProductQuickViewModalOpen && productToQuickView && (
        <InstagramProductQuickViewModal
          isOpen={isProductQuickViewModalOpen}
          onClose={() => setIsProductQuickViewModalOpen(false)}
          productId={productToQuickView.productId}
          shopSlug={productToQuickView.shopSlug}
        />
      )}
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={onClose} shouldScaleBackground>
          <DrawerContent className="p-0 flex flex-col bg-[hsl(var(--card))] text-[hsl(var(--foreground))] rounded-t-xl" style={{ maxHeight: 'calc(100dvh - var(--sat))' }} aria-describedby="instagram-cart-description">
            {inner}
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={isOpen} onOpenChange={onClose}>
          <SheetContent side="right" className="p-0 flex flex-col w-[680px] max-w-[95vw] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-l-[hsl(var(--border))]">
            {inner}
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};