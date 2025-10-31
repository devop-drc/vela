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
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { InstagramCheckoutForm, CheckoutFormData, CustomerAddress, LOCAL_STORAGE_ADDRESSES_KEY } from "./InstagramCheckoutForm"; // Import LOCAL_STORAGE_ADDRESSES_KEY
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
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
                    <ShoppingBag className="h-20 w-20 text-gray-400 mb-6" />
                    <h3 className="text-2xl font-bold mb-4">Your cart is empty</h3>
                    <p className="text-base text-gray-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
                    <Button onClick={onClose} className="text-base bg-[hsl(var(--primary))] text-white">Start Shopping</Button>
                  </motion.div>
                ) : (
                  <ScrollArea className="flex-1" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' as any }}>
                    <div>
                      {currentCartItems.length > 0 && (
                        <Accordion type="single" collapsible defaultValue="items-in-cart" className="w-full">
                          <AccordionItem value="items-in-cart" className="border-b px-5" style={{borderColor:'hsl(var(--border))'}}>
                            <AccordionTrigger className="text-lg font-bold">Items in Cart ({currentCartItems.length})</AccordionTrigger>
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
                                      <Card className="flex flex-col p-2 gap-2 shadow-sm border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                                        {/* Row 1 */}
                                        <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
                                          {/* Col 1: Thumbnail */}
                                          <button onClick={() => handleOpenProductQuickView(item.productId)} className="flex-shrink-0">
                                            <div className="h-16 w-16 rounded-md overflow-hidden bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
                                              <MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="object-cover" />
                                            </div>
                                          </button>

                                          {/* Col 2: Name, Price, Offer */}
                                          <div className="flex flex-col justify-center min-w-0">
                                            <button onClick={() => handleOpenProductQuickView(item.productId)} className="text-left text-[hsl(var(--foreground))]">
                                              <h3 className="font-semibold text-sm hover:underline leading-tight truncate">{item.name}</h3>
                                            </button>
                                            <div className="flex items-baseline gap-1 mt-0.5 text-[hsl(var(--foreground))]">
                                              {item.isDiscounted && (
                                                <p className="text-xs opacity-70 line-through">
                                                  {formatCurrency(convertCurrency(item.originalPrice, item.currency), shopDetails?.currency)}
                                                </p>
                                              )}
                                              <p className={cn("font-semibold text-sm", item.isDiscounted && "text-green-600")}>
                                                {formatCurrency(convertCurrency(item.price, item.currency), shopDetails?.currency)}
                                              </p>
                                            </div>
                                            {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                                              <div className="text-xs opacity-80 mt-0.5 truncate text-[hsl(var(--foreground))]">
                                                {Object.entries(item.selectedOptions).map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" · ")}
                                              </div>
                                            )}
                                            {(firstDiscount || hasOffer) && (
                                              <div className="flex gap-1 mt-0.5 text-[hsl(var(--foreground))]">
                                                {firstDiscount && (
                                                  <Badge className="bg-green-600 text-white text-xs px-1.5 py-0.5">
                                                    {getPromotionBadge(firstDiscount)}
                                                  </Badge>
                                                )}
                                                {hasOffer && (
                                                  <Badge className="bg-blue-600 text-white text-xs px-1.5 py-0.5">
                                                    Offer
                                                  </Badge>
                                                )}
                                              </div>
                                            )}
                                          </div>

                                          {/* Col 3: Counter */}
                                          <div className="flex items-center border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-md w-32 h-10 flex-shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => updateQuantity(item.uid, item.quantity - 1)}
                                              disabled={item.quantity <= 1}
                                              className="h-full w-10 rounded-r-none flex items-center justify-center hover:bg-[hsl(var(--muted))] cursor-pointer"
                                            >
                                              <Minus className="h-4 w-4" />
                                            </button>
                                            <Input
                                              type="number"
                                              value={item.quantity}
                                              onChange={(e) => updateQuantity(item.uid, parseInt(e.target.value) || 1)}
                                              className="w-12 text-center justify-center border-y-0 border-x border-[hsl(var(--border))] focus-visible:ring-0 text-sm h-full rounded-none bg-[hsl(var(--card))] p-0"
                                              min={1}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => updateQuantity(item.uid, item.quantity + 1)}
                                              disabled={item.quantity >= 99}
                                              className="h-full w-10 rounded-l-none flex items-center justify-center hover:bg-[hsl(var(--muted))] cursor-pointer"
                                            >
                                              <Plus className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Row 2: Save/Remove */}
                                        <div className="flex justify-end gap-1 pt-2 border-t" style={{borderColor:'hsl(var(--border))'}}>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => saveForLater(item)}
                                            className="text-sm w-[50%] h-9 px-2 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--foreground))]"
                                          >
                                              <Bookmark className="mr-1 h-4 w-4" />
                                              Save
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeFromCart(item.uid)}
                                            className="text-sm w-[50%] h-9 px-2 text-red-600 hover:text-red-700 bg-transparent hover:bg-[hsl(var(--destructive))] hover:text-[hsl(var(--foreground))]"
                                          >
                                              <XCircle className="h-4 w-4 mr-2" />
                                              Remove
                                          </Button>
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
                            <AccordionTrigger className="text-lg font-bold">Saved for Later ({savedItems.length})</AccordionTrigger>
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
                                    <Card className="flex flex-col p-2 gap-2 shadow-sm border">
                                      {/* Row 1 */}
                                      <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
                                        {/* Col 1: Thumbnail */}
                                        <button onClick={() => handleOpenProductQuickView(item.productId)} className="flex-shrink-0">
                                          <div className="h-16 w-16 rounded-md overflow-hidden">
                                            <MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="object-cover" />
                                          </div>
                                        </button>

                                        {/* Col 2: Name, Price */}
                                        <div className="flex-1 flex flex-col justify-center min-w-0">
                                          <button onClick={() => handleOpenProductQuickView(item.productId)} className="text-left text-[hsl(var(--foreground))]">
                                            <h3 className="font-semibold text-sm hover:underline leading-tight truncate">{item.name}</h3>
                                          </button>
                                          <div className="flex items-baseline gap-1 mt-0.5 text-[hsl(var(--foreground))]">
                                            {item.isDiscounted && (
                                              <p className="text-xs opacity-70 line-through">
                                                {formatCurrency(convertCurrency(item.originalPrice, item.currency), shopDetails?.currency)}
                                              </p>
                                            )}
                                            <p className={cn("font-semibold text-sm", item.isDiscounted && "text-green-600")}>
                                              {formatCurrency(convertCurrency(item.price, item.currency), shopDetails?.currency)}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Col 3: Empty (no counter for saved items) */}
                                        <div className="w-16 flex-shrink-0" />
                                      </div>

                                      {/* Row 2: Move to Cart, Remove */}
                                      <div className="flex justify-end gap-1 pt-2 border-t" style={{borderColor:'hsl(var(--border))'}}>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => moveToCart(item.uid)}
                                          className="text-sm w-[50%] h-9 px-2 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--foreground))]"
                                        >
                                          <MoveRight className="mr-1 h-3 w-3 rotate-[-90deg]" />
                                          Move to Cart
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => removeSavedItem(item.uid)}
                                          className="text-sm w-[50%] h-9 px-2 text-red-600 hover:text-red-700 bg-transparent hover:bg-[hsl(var(--destructive))] hover:text-[hsl(var(--foreground))]"
                                        >
                                          <XCircle className="h-3 w-3 mr-2" />
                                          Remove
                                        </Button>
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
              <div className="flex flex-row-reverse align-middle justify-center mt-1 gap-2">
              {checkoutStep === 'cart' && !initialCartItems && ( // Only show if it's the persistent cart
                <Button className="w-full text-base bg-[hsl(var(--primary))] text-white" onClick={handleProceedToCheckout} disabled={currentCartItems.length === 0}>
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {checkoutStep === 'contact-shipping' && (
                <Button type="submit" form="instagram-checkout-form" className="w-full text-base bg-[hsl(var(--primary))] text-white" disabled={isSubmittingOrder}>
                  Continue to Payment
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
              {checkoutStep === 'payment' && (
                <Button type="submit" form="instagram-checkout-form" className="w-full text-base bg-[hsl(var(--primary))] text-white" disabled={isSubmittingOrder}>
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
              <Button variant="outline" className="w-half text-base bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--foreground))]" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
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