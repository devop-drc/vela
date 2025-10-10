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
import { Loader2, ArrowLeft, User, Mail, Phone, MapPin, City, Globe, StickyNote, CreditCard, Banknote, ShieldCheck, Lock, Package, CheckCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useStorefront } from "@/contexts/StorefrontContext";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
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

type CheckoutFormData = z.infer<typeof checkoutSchema>;

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

const StorefrontCheckout = () => {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const navigate = useNavigate();
  const { cartItems, subtotal, shipping, total, clearCart, hasSubscriptionProducts } = useCart();
  const { shopDetails, appearanceSettings, convertCurrency } = useStorefront();
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

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

  useEffect(() => {
    if (cartItems.length === 0 && !isSubmittingOrder) {
      // Redirect to cart if it's empty and not in the process of submitting an order
      navigate(`/shop/${shopSlug}/cart`);
      toast.info("Your cart is empty. Please add items before checking out.");
    }
  }, [cartItems, shopSlug, navigate, isSubmittingOrder]);

  const onSubmit = async (data: CheckoutFormData) => {
    if (!shopDetails) {
      showError("Shop details not loaded. Cannot place order.");
      return;
    }
    if (cartItems.length === 0) {
      showError("Your cart is empty. Please add items before placing an order.");
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const orderPayload = {
        shopSlug,
        customerInfo: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
        },
        cartItems: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price, // This price is already in shopDetails.currency
          currency: item.currency, // This is already shopDetails.currency
        })),
        totalAmount: total, // This total is already in shopDetails.currency
        currency: shopDetails.currency, // This is shopDetails.currency
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

      showSuccess("Order placed successfully! Redirecting to your orders.");
      clearCart(); // Clear cart after successful order
      navigate(`/shop/${shopSlug}/orders?orderId=${responseData.order.id}`); // Redirect to client orders page with new order ID
    } catch (err: any) {
      console.error("Checkout failed:", err);
      showError(`Failed to place order: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (!shopDetails || cartItems.length === 0) {
    return (
      <div className="container py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-6 md:py-8">
      <Button variant="ghost" asChild className="mb-4 md:mb-6 text-muted-foreground hover:text-foreground text-sm md:text-base">
        <Link to={`/shop/${shopSlug}/cart`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cart
        </Link>
      </Button>
      <h1 className="text-2xl md:text-3xl font-bold font-heading mb-6 md:mb-8 text-center">Checkout</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Customer & Shipping Information */}
        <Card className={cn("lg:col-span-2 shadow-lg", blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card")}>
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

        {/* Order Summary & Payment */}
        <div className="lg:col-span-1 space-y-6">
          <Card className={cn("shadow-lg", blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card")}>
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-primary" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-48">
                <div className="space-y-3 pr-4">
                  {cartItems.map(item => (
                    <div key={item.productId} className="flex items-center gap-3">
                      <div className="h-16 w-16 flex-shrink-0 rounded-md overflow-hidden bg-muted border">
                        <MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm leading-tight">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-sm">
                        {formatCurrency(convertCurrency(item.price * item.quantity, item.currency, shopDetails.currency), shopDetails.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm md:text-base">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(subtotal, shopDetails.currency)}</span>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span>Shipping:</span>
                  <span className={cn("font-semibold", shipping === 0 && "text-emerald-600")}>
                    {shipping === 0 ? "FREE" : formatCurrency(shipping, shopDetails.currency)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg md:text-xl font-bold pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(total, shopDetails.currency)}</span>
                </div>
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

export default StorefrontCheckout;