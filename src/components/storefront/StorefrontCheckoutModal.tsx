import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Home, ArrowLeft, CreditCard, MapPin, User, Loader2, Wallet, ShieldCheck, Lock } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { DialogDescription } from "@/components/ui/dialog";

// You might need to install these if they are not already available
// import { SiVisa, SiMastercard, SiAmericanexpress, SiDiscover } from "react-icons/si"; // Example for card logos

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

interface StorefrontCheckoutModalProps {
  onClose: () => void;
  onBackToCart: () => void;
}

export const StorefrontCheckoutModal = ({ onClose, onBackToCart }: StorefrontCheckoutModalProps) => {
  const { shopDetails, appearanceSettings } = useStorefront();
  const { cartItems, subtotal, shipping, total, clearCart } = useCart();
  const blurEnabled = appearanceSettings?.blurEnabled;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // State for checkout progress

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    
    // In a real app, this would involve sending order data to Supabase
    // and handling payment processing.
    // For this demo, we'll just show a success toast.

    toast.success("Order placed successfully! Thank you for your purchase.", {
      description: `Your order total was ${formatCurrency(total, shopDetails?.currency)}.`,
      icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
    });
    
    clearCart(); // Clear the cart after successful order
    setIsSubmitting(false);
    onClose(); // Close the modal
    // Redirect to order tracking or confirmation page
    window.location.href = `/shop/${shopDetails?.slug}/order-tracking?orderId=DEMO-${Date.now()}`;
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center text-muted-foreground p-8">
        <h1 className="text-2xl font-bold">Your Cart is Empty</h1>
        <p className="mt-2">You need to add items to your cart before checking out.</p>
        <Button onClick={onClose} className="mt-4">
          Back to Shop
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="pb-4 px-6"> {/* Added horizontal padding */}
        <CardTitle className="text-2xl font-bold font-heading">Checkout</CardTitle>
        <DialogDescription>Complete your purchase by providing your details.</DialogDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-6"> {/* Added horizontal padding */}
        <CheckoutProgress currentStep={currentStep} />

        <form id="checkout-form" onSubmit={handleSubmit} className="space-y-8">
          <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card", "shadow-lg")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Contact Information</CardTitle>
              <CardDescription>We'll use this to send you updates about your order.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john.doe@example.com" required />
                </div>
            </CardContent>
          </Card>

          <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card", "shadow-lg")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Shipping Information</CardTitle>
              <CardDescription>Where should we send your awesome products?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Shipping Address</Label>
                  <Input id="address" placeholder="123 Main St" required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" placeholder="Anytown" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input id="state" placeholder="CA" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">Zip/Postal Code</Label>
                    <Input id="zip" placeholder="90210" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <Textarea id="notes" rows={3} placeholder="Leave a note for the seller..." />
                </div>
            </CardContent>
          </Card>

          <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card", "shadow-lg")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Payment Information</CardTitle>
              <CardDescription>Securely enter your payment details.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input id="cardNumber" placeholder="XXXX XXXX XXXX XXXX" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardName">Name on Card</Label>
                    <Input id="cardName" placeholder="John Doe" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input id="expiryDate" placeholder="MM/YY" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <div className="relative">
                      <Input id="cvv" placeholder="123" type="password" maxLength={4} required />
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border rounded-lg bg-muted/50 text-muted-foreground text-center space-y-4 mt-6">
                <p className="font-medium">Payment gateway integration coming soon!</p>
                <p className="text-sm mt-2">For now, this is a placeholder for card input and processing.</p>
                <Separator />
                <div className="flex items-center justify-center gap-4">
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                  {/* Placeholder for PayPal and Apple Pay icons */}
                  <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/PayPal_Logo_Icon_2014.svg" alt="PayPal" className="h-8 w-8" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/e/e5/Apple_Pay_logo.svg" alt="Apple Pay" className="h-8 w-8" />
                  {/* Example of other payment icons, you might need to install react-icons/si for these */}
                  {/* <SiVisa className="h-8 w-8 text-muted-foreground" />
                  <SiMastercard className="h-8 w-8 text-muted-foreground" />
                  <SiAmericanexpress className="h-8 w-8 text-muted-foreground" />
                  <SiDiscover className="h-8 w-8 text-muted-foreground" /> */}
                  <Wallet className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              {/* Trust Badges Placeholder */}
              <div className="mt-6 p-4 border rounded-lg bg-emerald-50/50 text-emerald-700 flex items-center justify-center gap-3">
                <ShieldCheck className="h-6 w-6" />
                <p className="font-semibold text-sm">Secure Checkout Guaranteed</p>
              </div>
            </CardContent>
          </Card>
        </form>
      </CardContent>
      <div className="p-6 border-t flex justify-between items-center">
        <Button type="button" variant="ghost" onClick={onBackToCart}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cart
        </Button>
        <Button type="submit" form="checkout-form" disabled={cartItems.length === 0 || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Placing Order...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Place Order
            </>
          )}
        </Button>
      </div>
    </div>
  );
};