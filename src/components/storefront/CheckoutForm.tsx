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

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

interface CheckoutFormProps {
  currentStep: number;
  onNextStep: () => Promise<void>;
  onPreviousStep: () => void;
  onSubmitForm: (values: CheckoutFormValues) => Promise<void>;
  isSubmitting: boolean;
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

export const CheckoutForm: React.FC<CheckoutFormProps> = ({ onNextStep, onPreviousStep, onSubmitForm, isSubmitting, currentStep, totalPrice, currency }) => {
  const { shopDetails, appearanceSettings } = useStorefront();
  const { cartItems, clearCart, hasSubscriptionProducts, hasDigitalSubscriptionProducts } = useCart();

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

  // Expose trigger for parent to validate current step
  const validateCurrentStep = async () => {
    if (currentStep === 1) {
      return await trigger(["customerName", "customerEmail", "customerPhone"]);
    } else if (currentStep === 2) {
      return await trigger(["shippingAddress", "shippingCity", "shippingState", "shippingZip", "shippingCountry", "shippingNotesSeller", "shippingNotesCourier"]);
    } else if (currentStep === 3) {
      return await trigger(["paymentMethod", "acceptTerms"]);
    }
    return false;
  };

  // Pass the form's handleSubmit to the parent, so parent can call it
  const handleInternalSubmit = handleSubmit(onSubmitForm);

  // Expose the validation function to the parent
  React.useImperativeHandle(
    { validateCurrentStep, handleInternalSubmit },
    () => ({ validateCurrentStep, handleInternalSubmit }),
    [validateCurrentStep, handleInternalSubmit]
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <CheckoutProgress currentStep={currentStep} />
      
      <ScrollArea className="flex-1 px-4 md:px-6">
        <div className="space-y-6 max-w-2xl mx-auto pb-4">
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
    </div>
  );
};