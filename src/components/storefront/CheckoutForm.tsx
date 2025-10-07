import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, ArrowLeft, CreditCard, MapPin, User, Loader2, Wallet, ShieldCheck, Lock, DollarSign } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion"; // Import AnimatePresence

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

interface CheckoutFormData {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes?: string;
  cardNumber?: string;
  cardName?: string;
  expiryDate?: string;
  cvv?: string;
  paymentMethod: 'card' | 'cash_on_delivery';
}

interface CheckoutFormProps {
  onSubmit: (data: CheckoutFormData) => Promise<void>;
  onBackToCart: () => void;
  isSubmitting: boolean;
  totalPrice: number;
  currency: string;
}

export const CheckoutForm = ({ onSubmit, onBackToCart, isSubmitting, totalPrice, currency }: CheckoutFormProps) => {
  const { shopDetails, appearanceSettings } = useStorefront();
  const { cartItems, clearCart } = useCart();
  const blurEnabled = appearanceSettings?.blurEnabled;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [notes, setNotes] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash_on_delivery'>('card');

  const [currentStep, setCurrentStep] = useState(1);

  const validateStep = () => {
    if (currentStep === 1) {
      if (!firstName || !lastName || !email) {
        toast.error("Please fill in all contact information.");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error("Please enter a valid email address.");
        return false;
      }
    } else if (currentStep === 2) {
      if (!address || !city || !state || !zip) {
        toast.error("Please fill in all shipping information.");
        return false;
      }
    } else if (currentStep === 3 && paymentMethod === 'card') {
      if (!cardNumber || !cardName || !expiryDate || !cvv) {
        toast.error("Please fill in all card details.");
        return false;
      }
      // Basic card validation (can be expanded)
      if (!/^\d{13,19}$/.test(cardNumber.replace(/\s/g, ''))) {
        toast.error("Please enter a valid card number.");
        return false;
      }
      if (!/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(expiryDate)) {
        toast.error("Please enter a valid expiry date (MM/YY).");
        return false;
      }
      if (!/^\d{3,4}$/.test(cvv)) {
        toast.error("Please enter a valid CVV.");
        return false;
      }
    }
    return true;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep()) {
      return;
    }

    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
      return;
    }

    if (!shopDetails?.slug || !shopDetails?.currency) {
      toast.error("Shop details are missing. Cannot place order.");
      return;
    }

    const customerInfo = { firstName, lastName, email, address, city, state, zip, notes };
    const orderItems = cartItems.map(item => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }));

    try {
      const { data, error } = await supabase.functions.invoke('create-order', {
        body: {
          shopSlug: shopDetails.slug,
          customerInfo,
          cartItems: orderItems,
          totalAmount: totalPrice,
          currency: shopDetails.currency,
          paymentMethod: paymentMethod, // Pass selected payment method
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Order placed successfully! Thank you for your purchase!", {
        description: `Your order total was ${formatCurrency(totalPrice, shopDetails?.currency)}.`,
        icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
      });
      
      clearCart();
      // Redirect to order tracking or confirmation page
      window.location.href = `/shop/${shopDetails?.slug}/order-tracking?orderId=${data.order.id}`;

    } catch (err: any) {
      console.error("Order placement failed:", err);
      toast.error(`Failed to place order: ${err.message || "An unexpected error occurred."}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6">
        <CheckoutProgress currentStep={currentStep} />
      </div>

      <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto px-6 pb-6 space-y-8">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.2 }}
            >
              <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card", "shadow-lg")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Contact Information</CardTitle>
                  <CardDescription>We'll use this to send you updates about your order.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="john.doe@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.2 }}
            >
              <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card", "shadow-lg")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Shipping Information</CardTitle>
                  <CardDescription>Where should we send your awesome products?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Shipping Address</Label>
                      <Input id="address" placeholder="123 Main St" value={address} onChange={(e) => setAddress(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" placeholder="Anytown" value={city} onChange={(e) => setCity(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State/Province</Label>
                        <Input id="state" placeholder="CA" value={state} onChange={(e) => setState(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zip">Zip/Postal Code</Label>
                        <Input id="zip" placeholder="90210" value={zip} onChange={(e) => setZip(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Order Notes (Optional)</Label>
                      <Textarea id="notes" rows={3} placeholder="Leave a note for the seller..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.2 }}
            >
              <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card", "shadow-lg")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Payment Information</CardTitle>
                  <CardDescription>Choose your preferred payment method.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <Label htmlFor="payment-card" className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          id="payment-card"
                          name="paymentMethod"
                          value="card"
                          checked={paymentMethod === 'card'}
                          onChange={() => setPaymentMethod('card')}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                        />
                        <span>Debit/Credit Card / PayPal</span>
                      </Label>
                      <Label htmlFor="payment-cash" className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          id="payment-cash"
                          name="paymentMethod"
                          value="cash_on_delivery"
                          checked={paymentMethod === 'cash_on_delivery'}
                          onChange={() => setPaymentMethod('cash_on_delivery')}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                        />
                        <span>Cash on Delivery</span>
                      </Label>
                    </div>

                    {paymentMethod === 'card' ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cardNumber">Card Number</Label>
                            <Input id="cardNumber" placeholder="XXXX XXXX XXXX XXXX" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cardName">Name on Card</Label>
                            <Input id="cardName" placeholder="John Doe" value={cardName} onChange={(e) => setCardName(e.target.value)} required />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="expiryDate">Expiry Date</Label>
                            <Input id="expiryDate" placeholder="MM/YY" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cvv">CVV</Label>
                            <div className="relative">
                              <Input id="cvv" placeholder="123" type="password" maxLength={4} value={cvv} onChange={(e) => setCvv(e.target.value)} required />
                              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                        <div className="p-6 border rounded-lg bg-muted/50 text-muted-foreground text-center space-y-4 mt-6">
                          <p className="font-medium">Payment gateway integration coming soon!</p>
                          <p className="text-sm mt-2">For now, this is a placeholder for card input and processing.</p>
                          <Separator />
                          <div className="flex items-center justify-center gap-4">
                            <CreditCard className="h-8 w-8 text-muted-foreground" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/PayPal_Logo_Icon_2014.svg" alt="PayPal" className="h-8 w-8" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e5/Apple_Pay_logo.svg" alt="Apple Pay" className="h-8 w-8" />
                            <Wallet className="h-8 w-8 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 border rounded-lg bg-blue-50/50 text-blue-700 flex items-center gap-4">
                        <DollarSign className="h-6 w-6 flex-shrink-0" />
                        <div>
                          <p className="font-semibold">Pay with Cash on Delivery</p>
                          <p className="text-sm">You will pay {formatCurrency(totalPrice, currency)} in cash when your order is delivered.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Trust Badges Placeholder */}
                  <div className="mt-6 p-4 border rounded-lg bg-emerald-50/50 text-emerald-700 flex items-center justify-center gap-3">
                    <ShieldCheck className="h-6 w-6" />
                    <p className="font-semibold text-sm">Secure Checkout Guaranteed</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <div className="p-6 border-t flex justify-between items-center">
        {currentStep > 1 ? (
          <Button type="button" variant="ghost" onClick={() => setCurrentStep(prev => prev - 1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={onBackToCart}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cart
          </Button>
        )}
        <Button type="submit" form="checkout-form" disabled={isSubmitting || cartItems.length === 0}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Placing Order...
            </>
          ) : (
            <>
              {currentStep < 3 ? "Next Step" : "Place Order"}
              {currentStep === 3 && <CheckCircle className="ml-2 h-4 w-4" />}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};