import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingBag, X, Minus, Plus, Trash2, Loader2, CreditCard, CheckCircle, ArrowLeft, Bookmark, MoveRight, ArrowRight, User, Mail, MapPin, Phone, StickyNote, Info, Wallet, ShieldCheck, Lock, Banknote, Hash } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useStorefront } from "@/contexts/StorefrontContext";
import { formatCurrency } from "@/lib/formatters";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MediaItem } from "@/components/MediaItem";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { SiVisa, SiMastercard, SiAmericanexpress, SiDiscover } from "react-icons/si";

// --- Checkout Progress Component ---
const CheckoutProgress = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { name: "Contact", icon: User },
    { name: "Shipping", icon: MapPin },
    { name: "Payment", icon: CreditCard },
  ];

  return (
    <div className="flex justify-between items-center mb-8">
      {steps.map((step, index) => (
        <div key={step.name} className="flex flex-col items-center flex-1">
          <div className={cn(
            "flex items-center justify-center h-10 w-10 rounded-full border-2",
            index + 1 <= currentStep ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground text-muted-foreground",
            index + 1 === currentStep && "ring-2 ring-primary ring-offset-2"
          )}>
            {index + 1 < currentStep ? <CheckCircle className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
          </div>
          <p className={cn(
            "text-sm mt-2",
            index + 1 <= currentStep ? "font-semibold text-foreground" : "text-muted-foreground"
          )}>
            {step.name}
          </p>
        </div>
      ))}
    </div>
  );
};

// --- Zod Schema for Checkout Form ---
const checkoutSchema = z.object({
  customerFirstName: z.string().min(1, "First name is required"),
  customerLastName: z.string().min(1, "Last name is required"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().optional(),
  shippingAddress: z.string().min(1, "Shipping address is required"),
  shippingCity: z.string().min(1, "City is required"),
  shippingZip: z.string().min(1, "Zip/Postal Code is required"),
  shippingCountry: z.string().default("Albania"), // Default to Albania
  shippingNotesSeller: z.string().optional(),
  shippingNotesCourier: z.string().optional(),
  paymentMethod: z.enum(["credit_card", "cash_on_delivery"], {
    errorMap: () => ({ message: "Payment method is required" }),
  }),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

interface StorefrontCartCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorefrontCartCheckoutModal = ({ isOpen, onClose }: StorefrontCartCheckoutModalProps) => {
  const { cartItems, savedItems, totalItems, subtotal, shipping, total, totalSaved, updateQuantity, removeFromCart, clearCart, saveForLater, moveToCart, removeSavedItem, hasSubscriptionProducts, hasDigitalSubscriptionProducts } = useCart();
  const { shopDetails, appearanceSettings, convertCurrency } = useStorefront();
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: Contact, 2: Shipping, 3: Payment

  const blurEnabled = appearanceSettings?.blurEnabled;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerFirstName: "",
      customerLastName: "",
      customerEmail: "",
      customerPhone: "",
      shippingAddress: "",
      shippingCity: "",
      shippingZip: "",
      shippingCountry: "Albania", // Set default country
      shippingNotesSeller: "",
      shippingNotesCourier: "",
      paymentMethod: hasDigitalSubscriptionProducts ? "credit_card" : undefined,
      acceptTerms: false,
    },
  });

  const paymentMethod = watch("paymentMethod");

  // Set default payment method if digital subscription is present
  useEffect(() => {
    if (hasDigitalSubscriptionProducts) {
      setValue("paymentMethod", "credit_card");
    }
  }, [hasDigitalSubscriptionProducts, setValue]);

  useEffect(() => {
    if (!isOpen) {
      setIsCheckoutMode(false);
      setIsOrderConfirmed(false);
      setConfirmedOrderId(null);
      setCurrentStep(1); // Reset step on close
      // Optionally reset form fields here if needed
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

  const handleNextStep = async () => {
    let isValid = false;
    if (currentStep === 1) {
      isValid = await trigger(["customerFirstName", "customerLastName", "customerEmail", "customerPhone"]);
    } else if (currentStep === 2) {
      isValid = await trigger(["shippingAddress", "shippingCity", "shippingZip", "shippingCountry", "shippingNotesSeller", "shippingNotesCourier"]);
    }

    if (isValid) {
      setCurrentStep(prev => prev + 1);
    } else {
      showError("Please fill in all required fields.");
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const onSubmit = async (values: CheckoutFormValues) => {
    setIsSubmitting(true);
    if (!shopDetails) {
      showError("Shop details not loaded. Cannot place order.");
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Create the order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          business_id: shopDetails.id, // Use shopDetails.id which is the business_id
          customer_name: `${values.customerFirstName} ${values.customerLastName}`,
          customer_email: values.customerEmail,
          customer_phone: values.customerPhone,
          total_amount: convertedTotalPrice, // totalPrice is already in shop's currency
          currency: shopDetails.currency, // Use shop's currency
          status: 'Pending',
          payment_method: values.paymentMethod,
          payment_status: values.paymentMethod === 'cash_on_delivery' ? 'pending' : 'paid', // Assume credit card is paid immediately
          shipping_address: values.shippingAddress,
          shipping_city: values.shippingCity,
          // shipping_state: values.shippingState, // Removed
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
        price_at_purchase: convertCurrency(item.price, item.currency, 'ALL'), // Convert to ALL for storage
        selected_options: item.selectedOptions,
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

      showSuccess("Order placed successfully!");
      clearCart();
      handleOrderSuccess(orderId);
    } catch (err: any) {
      console.error("Checkout error:", err);
      showError(`Checkout failed: ${err.message || "An unexpected error occurred."}`);
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
              <Button variant="ghost" size="icon" onClick={handlePrevStep} className="mr-2 h-8 w-8 md:h-9 md:w-9" disabled={currentStep === 1}>
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back</span>
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
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                  <ScrollArea className="flex-1 p-4 md:p-6 h-full"> {/* Added h-full */}
                    <div className="space-y-6 max-w-2xl mx-auto">
                      <CheckoutProgress currentStep={currentStep} />

                      {/* Step 1: Contact Information */}
                      {currentStep === 1 && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
                          <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card", "shadow-lg")}>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Customer Information</CardTitle>
                              <CardDescription>We'll use this to send you updates about your order.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="customerFirstName">First Name</Label>
                                    <Input id="customerFirstName" {...register("customerFirstName")} placeholder="John" />
                                    {errors.customerFirstName && <p className="text-sm text-destructive mt-1">{errors.customerFirstName.message}</p>}
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="customerLastName">Last Name</Label>
                                    <Input id="customerLastName" {...register("customerLastName")} placeholder="Doe" />
                                    {errors.customerLastName && <p className="text-sm text-destructive mt-1">{errors.customerLastName.message}</p>}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="customerEmail">Email Address</Label>
                                  <Input id="customerEmail" type="email" {...register("customerEmail")} placeholder="john.doe@example.com" />
                                  {errors.customerEmail && <p className="text-sm text-destructive mt-1">{errors.customerEmail.message}</p>}
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="customerPhone">Phone Number (Optional)</Label>
                                  <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="customerPhone" type="tel" {...register("customerPhone")} className="pl-10" placeholder="+1 (555) 123-4567" />
                                  </div>
                                  {errors.customerPhone && <p className="text-sm text-destructive mt-1">{errors.customerPhone.message}</p>}
                                </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}

                      {/* Step 2: Shipping Information */}
                      {currentStep === 2 && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
                          <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card", "shadow-lg")}>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Shipping Information</CardTitle>
                              <CardDescription>Where should we send your awesome products?</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="shippingAddress">Shipping Address</Label>
                                  <Input id="shippingAddress" {...register("shippingAddress")} placeholder="123 Main St" />
                                  {errors.shippingAddress && <p className="text-sm text-destructive mt-1">{errors.shippingAddress.message}</p>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="shippingCity">City</Label>
                                    <Input id="shippingCity" {...register("shippingCity")} placeholder="Anytown" />
                                    {errors.shippingCity && <p className="text-sm text-destructive mt-1">{errors.shippingCity.message}</p>}
                                  </div>
                                  {/* Removed State/Province input */}
                                  <div className="space-y-2">
                                    <Label htmlFor="shippingZip">Zip/Postal Code</Label>
                                    <Input id="shippingZip" {...register("shippingZip")} placeholder="90210" />
                                    {errors.shippingZip && <p className="text-sm text-destructive mt-1">{errors.shippingZip.message}</p>}
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="shippingCountry">Country</Label>
                                    <Input id="shippingCountry" {...register("shippingCountry")} defaultValue="Albania" disabled />
                                    {errors.shippingCountry && <p className="text-sm text-destructive mt-1">{errors.shippingCountry.message}</p>}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="shippingNotesSeller" className="flex items-center gap-1"><StickyNote className="h-4 w-4" /> Notes for Seller (Optional)</Label>
                                  <Textarea id="shippingNotesSeller" {...register("shippingNotesSeller")} placeholder="e.g., Gift wrapping, special instructions..." rows={2} />
                                  {errors.shippingNotesSeller && <p className="text-sm text-destructive mt-1">{errors.shippingNotesSeller.message}</p>}
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="shippingNotesCourier" className="flex items-center gap-1"><Truck className="h-4 w-4" /> Notes for Courier (Optional)</Label>
                                  <Textarea id="shippingNotesCourier" {...register("shippingNotesCourier")} placeholder="e.g., Leave at back door, call before delivery..." rows={2} />
                                  {errors.shippingNotesCourier && <p className="text-sm text-destructive mt-1">{errors.shippingNotesCourier.message}</p>}
                                </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}

                      {/* Step 3: Payment Information */}
                      {currentStep === 3 && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
                          <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card", "shadow-lg")}>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" /> Payment Method</CardTitle>
                              <CardDescription>Choose your preferred payment method.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {hasSubscriptionProducts && (
                                <div className="flex items-center gap-2 p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                                  <Info className="h-4 w-4 flex-shrink-0" />
                                  <span>This order includes subscription products. Your selected payment method will be charged {cartItems.filter(item => item.pricing_type === 'subscription').map(item => item.billing_interval === 'month' ? 'monthly' : 'yearly').join(', ')}.</span>
                                </div>
                              )}

                              <div className="space-y-2">
                                <Label htmlFor="paymentMethod">Select Payment Method</Label>
                                <Select value={paymentMethod} onValueChange={(value: "credit_card" | "cash_on_delivery") => setValue("paymentMethod", value)}>
                                  <SelectTrigger id="paymentMethod">
                                    <SelectValue placeholder="Choose a payment method" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="credit_card">
                                      <div className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" /> Credit Card
                                      </div>
                                    </SelectItem>
                                    {!hasDigitalSubscriptionProducts && (
                                      <SelectItem value="cash_on_delivery">
                                        <div className="flex items-center gap-2">
                                          <Banknote className="h-4 w-4" /> Cash on Delivery
                                        </div>
                                      </SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                                {errors.paymentMethod && <p className="text-sm text-destructive mt-1">{errors.paymentMethod.message}</p>}
                              </div>

                              {paymentMethod === "credit_card" && (
                                <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                                  <p className="text-sm text-muted-foreground">
                                    For demonstration purposes, credit card processing is simulated. In a real application, this would integrate with a payment gateway (e.g., Stripe).
                                  </p>
                                  <div className="space-y-2">
                                    <Label htmlFor="cardNumber">Card Number</Label>
                                    <Input id="cardNumber" placeholder="**** **** **** 1234" disabled />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="expiryDate">Expiry Date</Label>
                                      <Input id="expiryDate" placeholder="MM/YY" disabled />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="cvc">CVC</Label>
                                      <Input id="cvc" placeholder="123" disabled />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-center gap-4 pt-4">
                                    <SiVisa className="h-8 w-8 text-muted-foreground" />
                                    <SiMastercard className="h-8 w-8 text-muted-foreground" />
                                    <SiAmericanexpress className="h-8 w-8 text-muted-foreground" />
                                    <SiDiscover className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          {/* Terms and Conditions */}
                          <div className="flex items-start space-x-2">
                            <Checkbox id="acceptTerms" checked={watch("acceptTerms")} onCheckedChange={(checked) => setValue("acceptTerms", !!checked)} />
                            <div className="grid gap-1.5 leading-none">
                              <Label htmlFor="acceptTerms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                I agree to the <a href="#" className="underline">terms and conditions</a>
                              </Label>
                              {errors.acceptTerms && <p className="text-sm text-destructive mt-1">{errors.acceptTerms.message}</p>}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Footer with Total and Action Buttons */}
                  <div className="p-4 md:p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
                    <div className="flex items-center gap-2 text-lg md:text-xl font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(convertedTotalPrice, shopDetails?.currency)}</span>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      {currentStep > 1 && (
                        <Button variant="outline" onClick={handlePrevStep} disabled={isFormSubmitting} className="w-full sm:w-auto">
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>
                      )}
                      {currentStep < 3 ? (
                        <Button onClick={handleNextStep} disabled={isFormSubmitting} className="w-full sm:w-auto">
                          Next Step
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button type="submit" disabled={isFormSubmitting || !watch("acceptTerms")} className="w-full sm:w-auto">
                          {isFormSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Place Order
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 overflow-hidden">
                  <ScrollArea className="lg:col-span-2 flex flex-col p-4 md:p-6 border-r h-full"> {/* Added h-full */}
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
                                          variant="ghost"
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