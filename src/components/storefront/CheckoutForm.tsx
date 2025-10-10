import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Loader2, ArrowLeft, User, Mail, Phone, MapPin, Building2, Globe, StickyNote, CreditCard, Banknote, ShieldCheck, Truck, Package, CheckCircle, PlusCircle, Save, ArrowRight, Info } from "lucide-react";
import { CartItem } from "@/contexts/CartContext"; // Import CartItem type
import { ShopDetails, DesignSettings } from "@/contexts/StorefrontContext"; // Import types
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { motion} from "framer-motion";

const checkoutSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  shippingAddress: z.string().min(1, "Shipping address is required"),
  shippingCity: z.string().min(1, "City is required"),
  shippingZip: z.string().min(1, "Zip/Postal code is required"),
  shippingCountry: z.string().min(1, "Country is required"),
  shippingNotesSeller: z.string().optional(),
  shippingNotesCourier: z.string().optional(),
  paymentMethod: z.enum(["card", "cash_on_delivery"], { message: "Payment method is required" }),
  saveAddress: z.boolean().optional(), // New field for saving address
  addressLabel: z.string().optional(), // New field for address label
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

const countries = [
  { code: "AL", name: "Albania" }, // Default to Albania
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "AU", name: "Australia" },
  // Add more countries as needed
];

interface CustomerAddress {
  id: string;
  label: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string;
  city: string;
  state: string | null;
  zip_code: string;
  country: string;
  is_default: boolean;
}

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
  checkoutStep: 'contact-shipping' | 'payment'; // Current step
  setCheckoutStep: (step: 'contact-shipping' | 'payment') => void; // Function to change step
  onContinue: () => void; // New prop for continue button
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
  checkoutStep,
  setCheckoutStep,
  onContinue,
}: CheckoutFormProps) => {
  const blurEnabled = appearanceSettings?.blurEnabled;
  const [user, setUser] = useState<any>(null);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');
  const [isSaveAddressModalOpen, setIsSaveAddressModalOpen] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('');

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors, isValid, isDirty } } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      shippingAddress: "",
      shippingCity: "",
      shippingZip: "",
      shippingCountry: "AL", // Default country to Albania
      shippingNotesSeller: "",
      shippingNotesCourier: "",
      paymentMethod: "cash_on_delivery",
      saveAddress: false,
      addressLabel: "",
    },
  });

  const currentPaymentMethod = watch('paymentMethod');
  const saveAddressChecked = watch('saveAddress');

  useEffect(() => {
    const fetchUserAndAddresses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data, error } = await supabase.from('customer_addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false });
        if (error) {
          console.error("Error fetching saved addresses:", error);
        } else {
          setSavedAddresses(data || []);
          const defaultAddress = data?.find(addr => addr.is_default);
          if (defaultAddress) {
            setSelectedAddressId(defaultAddress.id);
            fillFormWithAddress(defaultAddress);
            setCheckoutStep('payment'); // Skip to payment if default address exists
          }
        }
      }
    };
    fetchUserAndAddresses();
  }, [setCheckoutStep]);

  const fillFormWithAddress = useCallback((address: CustomerAddress) => {
    reset({
      firstName: address.first_name,
      lastName: address.last_name,
      email: address.email,
      phone: address.phone || "",
      shippingAddress: address.address,
      shippingCity: address.city,
      shippingZip: address.zip_code,
      shippingCountry: address.country,
      shippingNotesSeller: watch('shippingNotesSeller'), // Keep existing notes if any
      shippingNotesCourier: watch('shippingNotesCourier'), // Keep existing notes if any
      paymentMethod: watch('paymentMethod'), // Keep existing payment method
      saveAddress: false, // Don't prompt to save an already saved address
      addressLabel: address.label,
    });
  }, [reset, watch]);

  useEffect(() => {
    if (selectedAddressId && selectedAddressId !== 'new') {
      const address = savedAddresses.find(addr => addr.id === selectedAddressId);
      if (address) {
        fillFormWithAddress(address);
        setCheckoutStep('payment');
      }
    } else {
      // If 'new' is selected or no address, clear relevant fields
      reset({
        firstName: "", lastName: "", email: "", phone: "",
        shippingAddress: "", shippingCity: "", shippingZip: "",
        shippingCountry: "AL", // Reset to default Albania
        shippingNotesSeller: "", shippingNotesCourier: "",
        paymentMethod: watch('paymentMethod'),
        saveAddress: false,
        addressLabel: "",
      });
      setCheckoutStep('contact-shipping');
    }
  }, [selectedAddressId, savedAddresses, reset, fillFormWithAddress, setCheckoutStep, watch]);

  const handleSaveAddress = async () => {
    if (!user) {
      showError("You must be logged in to save an address.");
      return;
    }
    if (!newAddressLabel.trim()) {
      showError("Please provide a label for your address.");
      return;
    }

    const formData = watch(); // Get current form data
    const payload = {
      user_id: user.id,
      label: newAddressLabel.trim(),
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      address: formData.shippingAddress,
      city: formData.shippingCity,
      state: "", // State is removed from UI, so save as empty
      zip_code: formData.shippingZip,
      country: formData.shippingCountry,
      is_default: savedAddresses.length === 0, // First saved address is default
    };

    const { data, error } = await supabase.from('customer_addresses').insert(payload).select('*').single();
    if (error) {
      showError(`Failed to save address: ${error.message}`);
    } else {
      showSuccess("Address saved successfully!");
      setSavedAddresses(prev => [...prev, data]);
      setSelectedAddressId(data.id);
      setIsSaveAddressModalOpen(false);
      setNewAddressLabel('');
      setValue('saveAddress', false); // Uncheck save address after saving
    }
  };

  const onSubmit = async (data: CheckoutFormData) => {
    if (checkoutStep === 'contact-shipping') {
      onContinue(); // Move to next step
    } else {
      // This is the final step, place the order
      if (data.saveAddress && user) {
        setIsSaveAddressModalOpen(true);
        return; // Pause submission to ask for label
      }
      await onPlaceOrder(data);
    }
  };

  if (!shopDetails || cartItems.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Dialog open={isSaveAddressModalOpen} onOpenChange={setIsSaveAddressModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Shipping Address</DialogTitle>
            <DialogDescription>Give a name to this address for future use.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="addressLabel">Address Label</Label>
            <Input id="addressLabel" value={newAddressLabel} onChange={(e) => setNewAddressLabel(e.target.value)} placeholder="e.g., Home, Work, My Apartment" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSaveAddressModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAddress} disabled={!newAddressLabel.trim()}>
              <Save className="mr-2 h-4 w-4" /> Save Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit(onSubmit)} id="checkout-form" className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4 md:p-6 pr-6 max-h-full">
          <div className="space-y-6">
            {user && savedAddresses.length > 0 && (
              <Card className={cn("shadow-lg", blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card")}>
                <CardHeader>
                  <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                    <MapPin className="h-6 w-6 text-primary" />
                    Choose Shipping Address
                  </CardTitle>
                  <CardDescription className="text-sm md:text-base">Select a saved address or enter a new one.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an address" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New Address</SelectItem>
                      <Separator />
                      {savedAddresses.map(address => (
                        <SelectItem key={address.id} value={address.id}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{address.label}</span>
                            <span className="text-xs text-muted-foreground">{address.address}, {address.city}, {address.country}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {checkoutStep === 'contact-shipping' && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <Card className={cn("shadow-lg", blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card")}>
                  <CardHeader>
                    <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                      <User className="h-6 w-6 text-primary" />
                      Contact & Shipping Information
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
                        <Label htmlFor="shippingCity" className="flex items-center gap-2"><Building2 className="h-4 w-4" /> City</Label>
                        <Input id="shippingCity" {...register("shippingCity")} />
                        {errors.shippingCity && <p className="text-sm text-destructive mt-1">{errors.shippingCity.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shippingZip">Zip/Postal Code</Label>
                        <Input id="shippingZip" {...register("shippingZip")} />
                        {errors.shippingZip && <p className="text-sm text-destructive mt-1">{errors.shippingZip.message}</p>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shippingCountry" className="flex items-center gap-2"><Globe className="h-4 w-4" /> Country</Label>
                      <Controller
                        name="shippingCountry"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value} disabled> {/* Disabled */}
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
                    <div className="space-y-2">
                      <Label htmlFor="shippingNotesSeller" className="flex items-center gap-2"><StickyNote className="h-4 w-4" /> Notes for Seller (Optional)</Label>
                      <Textarea id="shippingNotesSeller" {...register("shippingNotesSeller")} rows={2} placeholder="e.g., Please wrap as a gift." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shippingNotesCourier" className="flex items-center gap-2"><Truck className="h-4 w-4" /> Notes for Courier (Optional)</Label>
                      <Textarea id="shippingNotesCourier" {...register("shippingNotesCourier")} rows={2} placeholder="e.g., Leave package at the back door." />
                    </div>
                    {user && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="saveAddress"
                          {...register("saveAddress")}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <Label htmlFor="saveAddress">Save this address for future orders</Label>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {checkoutStep === 'payment' && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
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
                          {currentPaymentMethod === 'cash_on_delivery' && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="p-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md"
                            >
                              <Info className="h-4 w-4 inline-block mr-2" />
                              Please have the exact amount ready for the courier.
                            </motion.div>
                          )}
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
              </motion.div>
            )}
          </div>
        </ScrollArea>
        {/* The form's submit button is now handled by the DialogFooter in StorefrontCartModal */}
      </form>
    </>
  );
};