import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CreditCard, Banknote, Truck, User, Mail, MapPin, Phone, StickyNote, Info, ArrowLeft, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useStorefront } from "@/contexts/StorefrontContext";
import { useCart } from "@/contexts/CartContext";
import { showError, showSuccess } from "@/utils/toast";
import { formatCurrency } from "@/lib/formatters";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const checkoutSchema = z.object({
  customerName: z.string().min(1, "Full Name is required"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().optional(),
  shippingAddress: z.string().min(1, "Shipping address is required"),
  shippingCity: z.string().min(1, "City is required"),
  shippingState: z.string().min(1, "State/Province is required"),
  shippingZip: z.string().min(1, "Zip/Postal Code is required"),
  shippingCountry: z.string().min(1, "Country is required"),
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

interface CheckoutFormProps {
  onOrderSuccess: (orderId: string) => void;
  onBackToCart: () => void;
  totalPrice: number;
  currency: string;
}

const CheckoutProgress = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { name: "Contact", icon: User },
    { name: "Shipping", icon: MapPin },
    { name: "Payment", icon: CreditCard },
  ];

  return (
    <div className="flex justify-between items-center mb-8 px-4 md:px-6">
      {steps.map((step, index) => (
        <div key={step.name} className="flex flex-col items-center flex-1">
          <div className={cn(
            "flex items-center justify-center h-10 w-10 rounded-full border-2 transition-colors duration-200",
            index + 1 <= currentStep ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground text-muted-foreground",
            index + 1 === currentStep && "ring-2 ring-primary ring-offset-2"
          )}>
            {index + 1 < currentStep ? <CheckCircle className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
          </div>
          <p className={cn(
            "text-sm mt-2 text-center transition-colors duration-200",
            index + 1 <= currentStep ? "font-semibold text-foreground" : "text-muted-foreground"
          )}>
            {step.name}
          </p>
        </div>
      ))}
    </div>
  );
};

export const CheckoutForm: React.FC<CheckoutFormProps> = ({ onOrderSuccess, onBackToCart, totalPrice, currency }) => {
  const { shopDetails, appearanceSettings } = useStorefront();
  const { cartItems, clearCart, hasSubscriptionProducts, hasDigitalSubscriptionProducts } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Contact, 2: Shipping, 3: Payment

  const blurEnabled = appearanceSettings?.blurEnabled;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger, // Use trigger to validate specific fields
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      shippingAddress: "",
      shippingCity: "",
      shippingState: "",
      shippingZip: "",
      shippingCountry: "",
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

  const handleNextStep = async () => {
    let isValid = false;
    if (currentStep === 1) {
      isValid = await trigger(["customerName", "customerEmail", "customerPhone"]);
    } else if (currentStep === 2) {
      isValid = await trigger(["shippingAddress", "shippingCity", "shippingState", "shippingZip", "shippingCountry", "shippingNotesSeller", "shippingNotesCourier"]);
    }

    if (isValid) {
      setCurrentStep(prev => prev + 1);
    } else {
      showError("Please fill in all required fields.");
    }
  };

  const handlePreviousStep = () => {
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
          business_id: shopDetails.id, // Use shopDetails.id which is business_id
          customer_name: values.customerName,
          customer_email: values.customerEmail,
          customer_phone: values.customerPhone,
          total_amount: totalPrice, // totalPrice is already in shop's currency
          currency: currency, // Use shop's currency
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

      showSuccess("Order placed successfully!");
      clearCart();
      onOrderSuccess(orderId);
    } catch (err: any) {
      console.error("Checkout error:", err);
      showError(`Checkout failed: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
      <CheckoutProgress currentStep={currentStep} />
      
      <ScrollArea className="flex-1 px-4 md:px-6">
        <div className="space-y-6 max-w-2xl mx-auto pb-4"> {/* Added pb-4 for scroll padding */}
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="contact-step"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card", "shadow-lg")}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl"><User className="h-5 w-5" /> Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="customerName">Full Name</Label>
                      <Input id="customerName" {...register("customerName")} placeholder="John Doe" />
                      {errors.customerName && <p className="text-sm text-destructive">{errors.customerName.message}</p>}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="customerEmail">Email Address</Label>
                      <Input id="customerEmail" type="email" {...register("customerEmail")} placeholder="john.doe@example.com" />
                      {errors.customerEmail && <p className="text-sm text-destructive">{errors.customerEmail.message}</p>}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="customerPhone">Phone Number (Optional)</Label>
                      <Input id="customerPhone" type="tel" {...register("customerPhone")} placeholder="+1 (555) 123-4567" />
                      {errors.customerPhone && <p className="text-sm text-destructive">{errors.customerPhone.message}</p>}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="shipping-step"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card", "shadow-lg")}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl"><MapPin className="h-5 w-5" /> Shipping Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="shippingAddress">Address</Label>
                      <Input id="shippingAddress" {...register("shippingAddress")} placeholder="123 Main St" />
                      {errors.shippingAddress && <p className="text-sm text-destructive">{errors.shippingAddress.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shippingCity">City</Label>
                      <Input id="shippingCity" {...register("shippingCity")} placeholder="Anytown" />
                      {errors.shippingCity && <p className="text-sm text-destructive">{errors.shippingCity.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shippingState">State/Province</Label>
                      <Input id="shippingState" {...register("shippingState")} placeholder="CA" />
                      {errors.shippingState && <p className="text-sm text-destructive">{errors.shippingState.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shippingZip">Zip/Postal Code</Label>
                      <Input id="shippingZip" {...register("shippingZip")} placeholder="90210" />
                      {errors.shippingZip && <p className="text-sm text-destructive">{errors.shippingZip.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shippingCountry">Country</Label>
                      <Input id="shippingCountry" {...register("shippingCountry")} placeholder="USA" />
                      {errors.shippingCountry && <p className="text-sm text-destructive">{errors.shippingCountry.message}</p>}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="shippingNotesSeller" className="flex items-center gap-1"><StickyNote className="h-4 w-4" /> Notes for Seller (Optional)</Label>
                      <Textarea id="shippingNotesSeller" {...register("shippingNotesSeller")} placeholder="e.g., Gift wrapping, special instructions..." rows={2} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="shippingNotesCourier" className="flex items-center gap-1"><Truck className="h-4 w-4" /> Notes for Courier (Optional)</Label>
                      <Textarea id="shippingNotesCourier" {...register("shippingNotesCourier")} placeholder="e.g., Leave at back door, call before delivery..." rows={2} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="payment-step"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card", "shadow-lg")}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl"><Banknote className="h-5 w-5" /> Payment Method</CardTitle>
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
                      {errors.paymentMethod && <p className="text-sm text-destructive">{errors.paymentMethod.message}</p>}
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
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Terms and Conditions */}
                <div className="flex items-start space-x-2 mt-6">
                  <Checkbox id="acceptTerms" checked={watch("acceptTerms")} onCheckedChange={(checked) => setValue("acceptTerms", !!checked)} />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="acceptTerms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      I agree to the <a href="#" className="underline">terms and conditions</a>
                    </Label>
                    {errors.acceptTerms && <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Footer with Total and Action Buttons */}
      <div className="p-4 md:p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 text-lg md:text-xl font-bold">
          <span>Total:</span>
          <span>{formatCurrency(totalPrice, currency)}</span>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {currentStep > 1 && (
            <Button variant="outline" onClick={handlePreviousStep} disabled={isSubmitting} className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
          )}
          {currentStep < 3 ? (
            <Button type="button" onClick={handleNextStep} disabled={isSubmitting} className="w-full sm:w-auto">
              Next Step
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting || !watch("acceptTerms")} className="w-full sm:w-auto">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Place Order
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};