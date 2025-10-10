import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, User, Mail, Phone, MapPin, City, Globe, StickyNote, CreditCard, Banknote, ShieldCheck, Truck, Package, CheckCircle } from "lucide-react";
import { CartItem } from "@/contexts/CartContext"; // Import CartItem type
import { ShopDetails, DesignSettings } from "@/contexts/StorefrontContext"; // Import types
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const checkoutSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  shippingAddress: z.string().min(1, "Shipping address is required"),
  shippingCity: z.string().min(1, "City is required"),
  shippingState: z.string().optional(),
  shippingZip: z.string().min(1, "Zip/Postal code is required"),
  shippingCountry: z.string().min(1, "Country is required"),
  shippingNotesSeller: z.string().optional(),
  shippingNotesCourier: z.string().optional(),
  paymentMethod: z.enum(["card", "cash_on_delivery"], { message: "Payment method is required" }),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

const countries = [
  { code: "US", name: "United States" },
  { code: "AL", name: "Albania" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "AU", name: "Australia" },
  // Add more countries as needed
];

interface CheckoutFormProps {
  onBackToCart: () => void;
  onPlaceOrder: (data: CheckoutFormData) => Promise<void>;
  isSubmittingOrder: boolean;
  cartItems: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  shopDetails: ShopDetails | null;
  appearanceSettings: DesignSettings | null;
  convertCurrency: (amount: number | null | undefined, fromCurrency?: string) => number;
  hasSubscriptionProducts: boolean;
}

export const CheckoutForm = ({
  onBackToCart,
  onPlaceOrder,
  isSubmittingOrder,
  cartItems,
  subtotal,
  shipping,
  total,
  shopDetails,
  appearanceSettings,
  convertCurrency,
  hasSubscriptionProducts,
}: CheckoutFormProps) => {
  const blurEnabled = appearanceSettings?.blurEnabled;

  const { register, handleSubmit, control, formState: { errors } } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      shippingAddress: "",
      shippingCity: "",
      shippingState: "",
      shippingZip: "",
      shippingCountry: "US", // Default country
      shippingNotesSeller: "",
      shippingNotesCourier: "",
      paymentMethod: "cash_on_delivery", // Default payment method
    },
  });

  if (!shopDetails || cartItems.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 md:p-6 border-b flex items-center gap-4 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onBackToCart}>
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back to Cart</span>
        </Button>
        <h1 className="text-xl md:text-2xl font-bold font-heading">Checkout</h1>
      </div>

      <form onSubmit={handleSubmit(onPlaceOrder)} className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4 md:p-6 pr-6"> {/* Added pr-6 for scrollbar */}
          <div className="space-y-6">
            {/* Customer & Shipping Information */}
            <Card className={cn("shadow-lg", blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card")}>
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                  <User className="h-6 w-6 text-primary" />
                  Customer & Shipping Information
                </CardTitle>
                <CardDescription className="text-sm md:text-base">Enter your details for delivery.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" {...register("firstName")} />
                    {errors.firstName && <p className="text-sm text-destructive mt-1">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" {...register("lastName")} />
                    {errors.lastName && <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register("email")} />
                    {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (Optional)</Label>
                    <Input id="phone" type="tel" {...register("phone")} />
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="shippingAddress" className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Shipping Address</Label>
                  <Input id="shippingAddress" {...register("shippingAddress")} />
                  {errors.shippingAddress && <p className="text-sm text-destructive mt-1">{errors.shippingAddress.message}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shippingCity" className="flex items-center gap-2"><City className="h-4 w-4" /> City</Label>
                    <Input id="shippingCity" {...register("shippingCity")} />
                    {errors.shippingCity && <p className="text-sm text-destructive mt-1">{errors.shippingCity.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shippingState">State/Province (Optional)</Label>
                    <Input id="shippingState" {...register("shippingState")} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shippingZip">Zip/Postal Code</Label>
                    <Input id="shippingZip" {...register("shippingZip")} />
                    {errors.shippingZip && <p className="text-sm text-destructive mt-1">{errors.shippingZip.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shippingCountry" className="flex items-center gap-2"><Globe className="h-4 w-4" /> Country</Label>
                    <Controller
                      name="shippingCountry"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger id="shippingCountry">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map(country => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.shippingCountry && <p className="text-sm text-destructive mt-1">{errors.shippingCountry.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shippingNotesSeller" className="flex items-center gap-2"><StickyNote className="h-4 w-4" /> Notes for Seller (Optional)</Label>
                  <Textarea id="shippingNotesSeller" {...register("shippingNotesSeller")} rows={2} placeholder="e.g., Please wrap as a gift." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shippingNotesCourier" className="flex items-center gap-2"><Truck className="h-4 w-4" /> Notes for Courier (Optional)</Label>
                  <Textarea id="shippingNotesCourier" {...register("shippingNotesCourier")} rows={2} placeholder="e.g., Leave package at the back door." />
                </div>
              </CardContent>
            </Card>

            <Card className={cn("shadow-lg", blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card")}>
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                  <CreditCard className="h-6 w-6 text-primary" />
                  Payment Method
                </CardTitle>
                <CardDescription className="text-sm md:text-base">Choose how you'd like to pay.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Controller
                  name="paymentMethod"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-3">
                      <Label htmlFor="cash_on_delivery" className={cn("flex items-center gap-3 border rounded-lg p-4 cursor-pointer has-[input:checked]:border-primary flex-1", hasSubscriptionProducts && "opacity-50 cursor-not-allowed")}>
                        <RadioGroupItem value="cash_on_delivery" id="cash_on_delivery" disabled={hasSubscriptionProducts} />
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            <Banknote className="h-5 w-5" /> Cash on Delivery
                          </p>
                          <p className="text-sm text-muted-foreground">Pay with cash when your order is delivered.</p>
                          {hasSubscriptionProducts && <p className="text-xs text-destructive mt-1">Not available for subscriptions.</p>}
                        </div>
                      </Label>
                      <Label htmlFor="card" className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer has-[input:checked]:border-primary flex-1">
                        <RadioGroupItem value="card" id="card" />
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            <CreditCard className="h-5 w-5" /> Credit/Debit Card
                          </p>
                          <p className="text-sm text-muted-foreground">Secure payment via Stripe (placeholder).</p>
                        </div>
                      </Label>
                    </RadioGroup>
                  )}
                />
                {errors.paymentMethod && <p className="text-sm text-destructive mt-1">{errors.paymentMethod.message}</p>}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  Your payment information is securely processed.
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
        <div className="p-4 md:p-6 border-t flex-shrink-0">
          <Button type="submit" className="w-full text-base md:text-lg" disabled={isSubmittingOrder}>
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
        </div>
      </form>
    </div>
  );
};