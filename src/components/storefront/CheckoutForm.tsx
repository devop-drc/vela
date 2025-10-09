import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, ArrowLeft, CreditCard, MapPin, User, Loader2, Wallet, ShieldCheck, Lock, DollarSign, Mail, Globe, StickyNote, Calendar, Truck, Building2 } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea

const CheckoutProgress = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { name: "Contact & Shipping", icon: MapPin },
    { name: "Payment", icon: CreditCard },
  ];

  return (
    <div className="flex justify-between items-center mb-8 flex-shrink-0">
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
  zip: string;
  country: string;
  notesForSeller?: string;
  notesForCourier?: string;
  cardNumber?: string;
  cardName?: string;
  expiryDate?: string;
  cvv?: string;
  paymentMethod: 'card' | 'cash_on_delivery';
}

interface CheckoutFormProps {
  onOrderSuccess: (orderId: string) => void;
  onBackToCart: () => void;
  isSubmitting: boolean;
  totalPrice: number;
  currency: string;
}

export const CheckoutForm = ({ onOrderSuccess, onBackToCart, isSubmitting, totalPrice, currency }: CheckoutFormProps) => {
  const { shopDetails, appearanceSettings } = useStorefront();
  const { cartItems, clearCart } = useCart();
  const blurEnabled = appearanceSettings?.blurEnabled;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('Albania');
  const [notesForSeller, setNotesForSeller] = useState('');
  const [notesForCourier, setNotesForCourier] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash_on_delivery'>('card');

  const [currentStep, setCurrentStep] = useState(1);
  const [localIsSubmitting, setLocalIsSubmitting] = useState(false);

  const validateStep = () => {
    if (currentStep === 1) {
      if (!firstName.trim()) { toast.error("First Name is required."); return false; }
      if (!lastName.trim()) { toast.error("Last Name is required."); return false; }
      if (!email.trim()) { toast.error("Email is required."); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error("Please enter a valid email address.");
        return false;
      }
      if (!address.trim()) { toast.error("Shipping Address is required."); return false; }
      if (!city.trim()) { toast.error("City is required."); return false; }
      if (!zip.trim()) { toast.error("Zip/Postal Code is required."); return false; }
      if (!country.trim()) { toast.error("Country is required."); return false; }
    } else if (currentStep === 2) {
      if (paymentMethod === 'card') {
        if (!cardNumber.trim()) { toast.error("Card Number is required."); return false; }
        if (!cardName.trim()) { toast.error("Name on Card is required."); return false; }
        if (!expiryDate.trim()) { toast.error("Expiry Date is required."); return false; }
        if (!cvv.trim()) { toast.error("CVV is required."); return false; }
        
        if (!/^\d{13,19}$/.test(cardNumber.replace(/\s/g, ''))) {
          toast.error("Please enter a valid card number (13-19 digits).");
          return false;
        }
        if (!/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(expiryDate)) {
          toast.error("Please enter a valid expiry date (MM/YY).");
          return false;
        }
        if (!/^\d{3,4}$/.test(cvv)) {
          toast.error("Please enter a valid CVV (3-4 digits).");
          return false;
        }
      }
    }
    return true;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = validateStep();
    if (!isValid) {
      return;
    }

    if (currentStep < 2) {
      setCurrentStep(prev => prev + 1);
      return;
    }

    setLocalIsSubmitting(true);

    if (!shopDetails?.slug || !shopDetails?.currency) {
      toast.error("Shop details are missing. Cannot place order.");
      setLocalIsSubmitting(false);
      return;
    }

    const customerInfo = { firstName, lastName, email };
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
          paymentMethod: paymentMethod,
          shippingAddress: address,
          shippingCity: city,
          shippingZip: zip,
          shippingCountry: country,
          shippingNotesSeller: notesForSeller,
          shippingNotesCourier: notesForCourier,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Order placed successfully! Thank You for Your Purchase!", {
        description: `Your order total was ${formatCurrency(totalPrice, shopDetails?.currency)}.`,
        icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
      });
      
      clearCart();
      onOrderSuccess(data.order.id);
    } catch (err: any) {
      console.error("Order placement failed:", err);
      toast.error(`Failed to place order: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setLocalIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 flex-shrink-0">
        <CheckoutProgress currentStep={currentStep} />
      </div>

      <form id="checkout-form" onSubmit={handleFormSubmit} className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="space-y-8 pt-6">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card", "shadow-lg")}>
                    <CardHeader className="flex-shrink-0">
                      <CardTitle className="flex items-center gap-2 text-lg md:text-xl"><User className="h-5 w-5" /> Contact & Shipping Information</CardTitle>
                      <CardDescription className="text-sm md:text-base">Provide your contact details and where you'd like your order shipped.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Contact Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName" className="text-sm">First Name</Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input id="firstName" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="pl-10" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input id="lastName" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="pl-10" />
                            </div>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="email" className="text-sm">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input id="email" type="email" placeholder="john.doe@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10" />
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Shipping Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="address" className="text-sm">Shipping Address</Label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input id="address" placeholder="123 Main St" value={address} onChange={(e) => setAddress(e.target.value)} required className="pl-10" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="city" className="text-sm">City</Label>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input id="city" placeholder="Anytown" value={city} onChange={(e) => setCity(e.target.value)} required className="pl-10" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="zip" className="text-sm">Zip/Postal Code</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input id="zip" placeholder="90210" value={zip} onChange={(e) => setZip(e.target.value)} required className="pl-10" />
                            </div>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="country" className="text-sm">Country</Label>
                            <div className="relative">
                              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Select value={country} onValueChange={setCountry}>
                                <SelectTrigger id="country" className="pl-10">
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Albania">Albania</SelectItem>
                                  {/* Add other countries if needed in the future */}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Order Notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="notesForSeller" className="text-sm">Notes for Seller (Optional)</Label>
                            <div className="relative">
                              <StickyNote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Textarea id="notesForSeller" rows={3} placeholder="e.g., Please gift wrap this item." value={notesForSeller} onChange={(e) => setNotesForSeller(e.target.value)} className="pl-10 pt-3" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="notesForCourier" className="text-sm">Notes for Courier (Optional)</Label>
                            <div className="relative">
                              <Truck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Textarea id="notesForCourier" rows={3} placeholder="e.g., Leave package with neighbor if not home." value={notesForCourier} onChange={(e) => setNotesForCourier(e.target.value)} className="pl-10 pt-3" />
                            </div>
                          </div>
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
                  <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card", "shadow-lg")}>
                    <CardHeader className="flex-shrink-0">
                      <CardTitle className="flex items-center gap-2 text-lg md:text-xl"><CreditCard className="h-5 w-5" /> Payment Information</CardTitle>
                      <CardDescription className="text-sm md:text-base">Choose your preferred payment method.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button
                          type="button"
                          variant={paymentMethod === 'card' ? 'default' : 'outline'}
                          onClick={() => setPaymentMethod('card')}
                          className={cn(
                            "flex flex-col h-auto py-6 text-base",
                            paymentMethod === 'card' ? "ring-2 ring-primary ring-offset-2" : ""
                          )}
                        >
                          <CreditCard className="h-6 w-6 mb-2" />
                          Debit/Credit Card
                        </Button>
                        <Button
                          type="button"
                          variant={paymentMethod === 'cash_on_delivery' ? 'default' : 'outline'}
                          onClick={() => setPaymentMethod('cash_on_delivery')}
                          className={cn(
                            "flex flex-col h-auto py-6 text-base",
                            paymentMethod === 'cash_on_delivery' ? "ring-2 ring-primary ring-offset-2" : ""
                          )}
                        >
                          <DollarSign className="h-6 w-6 mb-2" />
                          Cash on Delivery
                        </Button>
                      </div>

                      {paymentMethod === 'card' ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="cardNumber" className="text-sm">Card Number</Label>
                              <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="cardNumber" placeholder="XXXX XXXX XXXX XXXX" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} required className="pl-10" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="cardName" className="text-sm">Name on Card</Label>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="cardName" placeholder="John Doe" value={cardName} onChange={(e) => setCardName(e.target.value)} required className="pl-10" />
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="expiryDate" className="text-sm">Expiry Date</Label>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="expiryDate" placeholder="MM/YY" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required className="pl-10" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="cvv" className="text-sm">CVV</Label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="cvv" placeholder="123" type="password" maxLength={4} value={cvv} onChange={(e) => setCvv(e.target.value)} required className="pl-10" />
                              </div>
                            </div>
                          </div>
                          <div className="p-6 border rounded-lg bg-muted/50 text-muted-foreground text-center space-y-4 mt-6">
                            <p className="font-medium text-base">Payment gateway integration coming soon!</p>
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
                            <p className="font-semibold text-base">Pay with Cash on Delivery</p>
                            <p className="text-sm">You will pay {formatCurrency(totalPrice, currency)} in cash when your order is delivered.</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </form>

      <div className="p-6 border-t flex justify-between items-center flex-shrink-0">
        {currentStep > 1 ? (
          <Button type="button" variant="ghost" onClick={() => setCurrentStep(prev => prev - 1)} className="text-sm md:text-base">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={onBackToCart} className="text-sm md:text-base">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cart
          </Button>
        )}
        <Button type="submit" form="checkout-form" disabled={localIsSubmitting || cartItems.length === 0} className="text-sm md:text-base">
          {localIsSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Placing Order...
            </>
          ) : (
            <>
              {currentStep < 2 ? "Next Step" : "Place Order"}
              {currentStep === 2 && <CheckCircle className="ml-2 h-4 w-4" />}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};