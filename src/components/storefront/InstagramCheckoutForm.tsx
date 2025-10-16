"use client";

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
import { CartItem } from "@/contexts/CartContext";
import { ShopDetails } from "@/contexts/StorefrontContext";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { motion} from "framer-motion";
import { Switch } from "@/components/ui/switch"; // Import Switch

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
  saveAddress: z.boolean().optional(), // Added for UI logic
  addressLabel: z.string().optional(), // Added for UI logic
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

export interface CustomerAddress {
  id: string;
  label: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string;
  city: string;
  state: string | null; // Keeping state as optional for now
  zip_code: string;
  country: string;
  is_default: boolean;
}

const LOCAL_STORAGE_ADDRESSES_KEY = 'instagram_saved_addresses';

const countries = [
  { code: "AL", name: "Albania" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "AU", name: "Australia" },
];

interface InstagramCheckoutFormProps {
  onBack: () => void;
  onPlaceOrder: (data: CheckoutFormData) => Promise<void>;
  isSubmittingOrder: boolean;
  cartItems: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  shopDetails: ShopDetails | null;
  convertCurrency: (amount: number | null | undefined, fromCurrency?: string) => number;
  hasSubscriptionProducts: boolean;
  checkoutStep: 'contact-shipping' | 'payment';
  setCheckoutStep: (step: 'contact-shipping' | 'payment') => void;
  onContinue: () => void;
  savedAddresses: CustomerAddress[]; // Passed from parent
  setSavedAddresses: (addresses: CustomerAddress[]) => void; // Passed from parent
  selectedAddressId: string | 'new'; // Passed from parent
  setSelectedAddressId: (id: string | 'new') => void; // Passed from parent
}

export const InstagramCheckoutForm = ({
  onBack,
  onPlaceOrder,
  isSubmittingOrder,
  cartItems,
  subtotal,
  shipping,
  total,
  shopDetails,
  convertCurrency,
  hasSubscriptionProducts,
  checkoutStep,
  setCheckoutStep,
  onContinue,
  savedAddresses,
  setSavedAddresses,
  selectedAddressId,
  setSelectedAddressId,
}: InstagramCheckoutFormProps) => {
  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors, isValid, isDirty } } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      shippingAddress: "",
      shippingCity: "",
      shippingZip: "",
      shippingCountry: "AL",
      shippingNotesSeller: "",
      shippingNotesCourier: "",
      paymentMethod: "cash_on_delivery",
      saveAddress: false,
      addressLabel: "",
    },
  });

  const currentPaymentMethod = watch('paymentMethod');
  const saveAddressChecked = watch('saveAddress');
  const [isSaveAddressModalOpen, setIsSaveAddressModalOpen] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('');

  const fillFormWithAddress = useCallback((address: CustomerAddress) => {
    setValue('firstName', address.first_name);
    setValue('lastName', address.last_name);
    setValue('email', address.email);
    setValue('phone', address.phone || '');
    setValue('shippingAddress', address.address);
    setValue('shippingCity', address.city);
    setValue('shippingZip', address.zip_code);
    setValue('shippingCountry', address.country);
    // Keep notes and payment method as they are not part of saved address
    setValue('saveAddress', false); // Always uncheck when loading saved address
    setValue('addressLabel', address.label);
  }, [setValue]);

  // Effect to reset form when checkout step changes
  useEffect(() => {
    console.log("CheckoutForm: selectedAddressId changed to", selectedAddressId);
    if (selectedAddressId !== 'new') {
      const address = savedAddresses.find(addr => addr.id === selectedAddressId);
      if (address) {
        fillFormWithAddress(address);
        setCheckoutStep('payment'); // Go directly to payment for existing address
        console.log("CheckoutForm: Existing address selected, setting checkoutStep to 'payment'");
      }
    } else {
      // Otherwise, clear the form for a new address
      reset({
        firstName: "", lastName: "", email: "", phone: "",
        shippingAddress: "", shippingCity: "", shippingZip: "",
        shippingCountry: "AL",
        shippingNotesSeller: "", shippingNotesCourier: "",
        paymentMethod: watch('paymentMethod'), // Keep current payment method
        saveAddress: false,
        addressLabel: "",
      });
      setCheckoutStep('contact-shipping'); // Show contact-shipping for new address
      console.log("CheckoutForm: New address selected, setting checkoutStep to 'contact-shipping'");
    }
  }, [selectedAddressId, savedAddresses, reset, fillFormWithAddress, setCheckoutStep, watch]);

  const handleSaveAddressToLocal = () => {
    if (!newAddressLabel.trim()) {
      showError("Please provide a label for your address.");
      return;
    }

    const formData = watch();
    const newAddress: CustomerAddress = {
      id: crypto.randomUUID(), // Generate a unique ID
      label: newAddressLabel.trim(),
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone || null,
      address: formData.shippingAddress,
      city: formData.shippingCity,
      state: "", // State is not collected in this form
      zip_code: formData.shippingZip,
      country: formData.shippingCountry,
      is_default: savedAddresses.length === 0, // First saved address is default
    };

    const updatedAddresses = [...savedAddresses, newAddress];
    localStorage.setItem(LOCAL_STORAGE_ADDRESSES_KEY, JSON.stringify(updatedAddresses));
    setSavedAddresses(updatedAddresses);
    setSelectedAddressId(newAddress.id); // Select the newly saved address
    setIsSaveAddressModalOpen(false);
    setNewAddressLabel('');
    setValue('saveAddress', false); // Uncheck the checkbox after saving
    showSuccess("Address saved successfully!");
  };

  const onSubmit = async (data: CheckoutFormData) => {
    if (checkoutStep === 'contact-shipping') {
      // If "Save address" is checked, open the modal to get the label
      if (data.saveAddress && selectedAddressId === 'new') { // Only prompt to save if it's a new address
        setIsSaveAddressModalOpen(true);
        return; // Stop submission until label is provided
      }
      onContinue();
    } else {
      await onPlaceOrder(data);
    }
  };

  if (!shopDetails || cartItems.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <>
      <Dialog open={isSaveAddressModalOpen} onOpenChange={setIsSaveAddressModalOpen}>
        <DialogContent className="bg-white text-black rounded-lg">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-800">Save Shipping Address</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">Give a name to this address for future use.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="addressLabel" className="text-sm text-gray-700">Address Label</Label>
            <Input id="addressLabel" value={newAddressLabel} onChange={(e) => setNewAddressLabel(e.target.value)} placeholder="e.g., Home, Work, My Apartment" className="border-gray-300 bg-gray-50 text-gray-800" />
          </div>
          <DialogFooter className="border-t border-gray-200 pt-4">
            <Button variant="ghost" onClick={() => setIsSaveAddressModalOpen(false)} className="text-gray-800 hover:bg-gray-100">Cancel</Button>
            <Button onClick={handleSaveAddressToLocal} disabled={!newAddressLabel.trim()} className="bg-red-500 hover:bg-red-600 text-white">
              <Save className="mr-2 h-4 w-4" /> Save Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit(onSubmit)} id="instagram-checkout-form" className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4 pr-6">
          <div className="space-y-6">
            {/* Address Selection Card */}
            {savedAddresses.length > 0 && (
              <Card className="shadow-sm border border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
                    <MapPin className="h-6 w-6 text-red-500" />
                    Choose Shipping Address
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-500">Select a saved address or enter a new one.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                    <SelectTrigger className="border-gray-300 bg-gray-50 text-gray-800">
                      <SelectValue placeholder="Select an address" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-gray-800 w-[--radix-select-trigger-width] max-w-[calc(100vw-2rem)] sm:max-w-xs md:max-w-sm"> {/* Added responsive max-width */}
                      <SelectItem value="new" className="py-2">
                        <div className="flex flex-col items-start w-full">
                          <span className="font-medium text-gray-800 text-sm">New Address</span>
                          <span className="text-xs text-gray-500 text-wrap break-words max-w-full min-w-0">Enter details below</span> {/* Added min-w-0 */}
                        </div>
                      </SelectItem>
                      <Separator className="bg-gray-200" />
                      {savedAddresses.map(address => (
                        <SelectItem key={address.id} value={address.id} className="py-2 overflow-hidden"> {/* Added overflow-hidden */}
                          <div className="flex flex-col items-start w-full">
                            <span className="font-medium text-gray-800 text-sm">{address.label}</span>
                            <span className="text-xs text-gray-500 text-wrap break-words max-w-full min-w-0"> {/* Added min-w-0 */}
                              {address.address}, {address.city}, {address.zip_code}, {address.country}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {checkoutStep === 'contact-shipping' && selectedAddressId === 'new' && (
              <motion.div
                key="contact-shipping-form" // Added key for AnimatePresence
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <Card className="shadow-sm border border-gray-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
                      <User className="h-6 w-6 text-red-500" />
                      Contact & Shipping Information
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500">Enter your details for delivery.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <Label htmlFor="saveAddress" className="text-base">Save Address</Label>
                          <p className="text-sm text-gray-500">Save this address for future orders.</p>
                        </div>
                        <Controller
                          name="saveAddress"
                          control={control}
                          render={({ field }) => (
                            <Switch
                              id="saveAddress"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                      </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" {...register("firstName")} className="border-gray-300 bg-gray-50 text-gray-800" />
                        {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" {...register("lastName")} className="border-gray-300 bg-gray-50 text-gray-800" />
                        {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" {...register("email")} className="border-gray-300 bg-gray-50 text-gray-800" />
                        {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone (Optional)</Label>
                        <Input id="phone" type="tel" {...register("phone")} className="border-gray-300 bg-gray-50 text-gray-800" />
                      </div>
                    </div>
                    <Separator className="bg-gray-200" />
                    <div className="space-y-2">
                      <Label htmlFor="shippingAddress" className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Shipping Address</Label>
                      <Input id="shippingAddress" {...register("shippingAddress")} className="border-gray-300 bg-gray-50 text-gray-800" />
                      {errors.shippingAddress && <p className="text-sm text-red-500 mt-1">{errors.shippingAddress.message}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shippingCity" className="flex items-center gap-2"><Building2 className="h-4 w-4" /> City</Label>
                      <Input id="shippingCity" {...register("shippingCity")} className="border-gray-300 bg-gray-50 text-gray-800" />
                      {errors.shippingCity && <p className="text-sm text-red-500 mt-1">{errors.shippingCity.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shippingZip">Zip/Postal Code</Label>
                      <Input id="shippingZip" {...register("shippingZip")} className="border-gray-300 bg-gray-50 text-gray-800" />
                      {errors.shippingZip && <p className="text-sm text-red-500 mt-1">{errors.shippingZip.message}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shippingCountry" className="flex items-center gap-2"><Globe className="h-4 w-4" /> Country</Label>
                    <Controller
                      name="shippingCountry"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} disabled>
                          <SelectTrigger id="shippingCountry" className="border-gray-300 bg-gray-50 text-gray-800">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent className="bg-white text-gray-800">
                            {countries.map(country => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.shippingCountry && <p className="text-sm text-red-500 mt-1">{errors.shippingCountry.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shippingNotesSeller" className="flex items-center gap-2"><StickyNote className="h-4 w-4" /> Notes for Seller (Optional)</Label>
                    <Textarea id="shippingNotesSeller" {...register("shippingNotesSeller")} rows={2} placeholder="e.g., Please wrap as a gift." className="border-gray-300 bg-gray-50 text-gray-800" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shippingNotesCourier" className="flex items-center gap-2"><Truck className="h-4 w-4" /> Notes for Courier (Optional)</Label>
                    <Textarea id="shippingNotesCourier" {...register("shippingNotesCourier")} rows={2} placeholder="e.g., Leave package at the back door." className="border-gray-300 bg-gray-50 text-gray-800" />
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            )}

            {checkoutStep === 'payment' && (
              <motion.div
                key="payment-form" // Added key for AnimatePresence
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <Card className="shadow-sm border border-gray-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
                      <CreditCard className="h-6 w-6 text-red-500" />
                      Payment Method
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500">Choose how you'd like to pay.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Controller
                      name="paymentMethod"
                      control={control}
                      render={({ field }) => (
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-3">
                          <Label htmlFor="cash_on_delivery" className={cn("flex items-center gap-3 border rounded-lg p-4 cursor-pointer has-[input:checked]:border-red-500 flex-1", hasSubscriptionProducts && "opacity-50 cursor-not-allowed")}>
                            <RadioGroupItem value="cash_on_delivery" id="cash_on_delivery" disabled={hasSubscriptionProducts} />
                            <div>
                              <p className="font-medium flex items-center gap-2 text-gray-800">
                                <Banknote className="h-5 w-5" /> Cash on Delivery
                              </p>
                              <p className="text-sm text-gray-500">Pay with cash when your order is delivered.</p>
                              {hasSubscriptionProducts && <p className="text-xs text-red-500 mt-1">Not available for subscriptions.</p>}
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
                        <Label htmlFor="card" className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer has-[input:checked]:border-red-500 flex-1">
                          <RadioGroupItem value="card" id="card" />
                          <div>
                            <p className="font-medium flex items-center gap-2 text-gray-800">
                              <CreditCard className="h-5 w-5" /> Credit/Debit Card
                            </p>
                            <p className="text-sm text-gray-500">Secure payment via Stripe (placeholder).</p>
                          </div>
                        </Label>
                      </RadioGroup>
                    )}
                  />
                  {errors.paymentMethod && <p className="text-sm text-red-500 mt-1">{errors.paymentMethod.message}</p>}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <ShieldCheck className="h-4 w-4" />
                    Your payment information is securely processed.
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            )}
          </div>
        </ScrollArea>
    </form>
    </>
  );
};