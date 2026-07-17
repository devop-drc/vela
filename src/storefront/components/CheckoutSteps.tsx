// Contact/shipping + payment form for checkout. Token-styled rewrite of the old
// CheckoutForm; submits a CheckoutFields object to the parent. Supports saved
// shipping addresses (device-local, shared with the Instagram checkout) and a
// RaiAccept card option for entitled plans.

import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { User, MapPin, Building2, Globe, Truck, StickyNote, CreditCard, Banknote, ShieldCheck, BookmarkPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/contexts/StorefrontContext';
import { loadSavedAddresses, saveAddress, formatAddressLine, type SavedAddress } from '@/lib/customerAddresses';
import type { CheckoutFields } from '../lib/useCheckout';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  shippingAddress: z.string().min(1, 'Shipping address is required'),
  shippingCity: z.string().min(1, 'City is required'),
  shippingZip: z.string().min(1, 'Zip/Postal code is required'),
  shippingCountry: z.string().min(1, 'Country is required'),
  shippingNotesSeller: z.string().optional(),
  shippingNotesCourier: z.string().optional(),
  paymentMethod: z.enum(['card', 'cash_on_delivery']),
});

const countries = [
  { code: 'AL', name: 'Albania' }, { code: 'US', name: 'United States' }, { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' }, { code: 'ES', name: 'Spain' }, { code: 'AU', name: 'Australia' },
];

interface Props {
  step: 'contact-shipping' | 'payment';
  hasSubscriptionProducts: boolean;
  onContinue: () => void;
  onPlaceOrder: (data: CheckoutFields) => void;
  formId?: string;
}

export const CheckoutSteps = ({ step, hasSubscriptionProducts, onContinue, onPlaceOrder, formId = 'sf-checkout-form' }: Props) => {
  const { capabilities } = useStorefront();
  const { register, handleSubmit, control, setValue, getValues, formState: { errors } } = useForm<CheckoutFields>({
    resolver: zodResolver(schema),
    defaultValues: { shippingCountry: 'AL', paymentMethod: 'cash_on_delivery' },
  });

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(() => loadSavedAddresses());
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [saveForNextTime, setSaveForNextTime] = useState(false);
  const [addressLabel, setAddressLabel] = useState('');

  const applyAddress = (id: string) => {
    setSelectedAddressId(id);
    const a = savedAddresses.find((x) => x.id === id);
    if (!a) return;
    setValue('firstName', a.first_name, { shouldValidate: true });
    setValue('lastName', a.last_name, { shouldValidate: true });
    setValue('email', a.email, { shouldValidate: true });
    setValue('phone', a.phone || '');
    setValue('shippingAddress', a.address, { shouldValidate: true });
    setValue('shippingCity', a.city, { shouldValidate: true });
    setValue('shippingZip', a.zip_code, { shouldValidate: true });
    setValue('shippingCountry', a.country || 'AL', { shouldValidate: true });
  };

  const persistAddressIfAsked = () => {
    if (!saveForNextTime) return;
    const v = getValues();
    setSavedAddresses(saveAddress({
      label: addressLabel.trim() || v.shippingCity || 'Saved address',
      first_name: v.firstName, last_name: v.lastName, email: v.email, phone: v.phone || null,
      address: v.shippingAddress, city: v.shippingCity, state: null,
      zip_code: v.shippingZip, country: v.shippingCountry,
    }));
    setSaveForNextTime(false);
  };

  const submit = (data: CheckoutFields) => {
    if (step === 'contact-shipping') { persistAddressIfAsked(); onContinue(); }
    else onPlaceOrder(data);
  };
  const err = (m?: string) => m && <p className="text-sm text-destructive mt-1">{m}</p>;
  const cardAvailable = capabilities?.card_payments !== false;

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-6">
      <div className={cn(step === 'contact-shipping' ? 'block' : 'hidden', 'space-y-6')}>
        <div className="sf-glass p-5 space-y-5">
          <h3 className="sf-heading text-lg font-bold flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Contact & Shipping</h3>

          {savedAddresses.length > 0 && (
            <div className="space-y-2">
              <Label>Saved addresses</Label>
              <Select value={selectedAddressId} onValueChange={applyAddress}>
                <SelectTrigger className="h-auto min-h-10 py-2 [&>span]:min-w-0">
                  <SelectValue placeholder="Choose a saved address" />
                </SelectTrigger>
                {/* Popper width follows the trigger so long addresses truncate
                    instead of overflowing on small screens. */}
                <SelectContent className="w-[--radix-select-trigger-width] max-w-[calc(100vw-2rem)]">
                  <SelectItem value="new">
                    <span className="block truncate text-sm font-medium">New address…</span>
                  </SelectItem>
                  {savedAddresses.map((a) => {
                    const f = formatAddressLine(a);
                    return (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="block min-w-0 text-left">
                          <span className="block truncate text-sm font-medium">{f.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{f.subtitle}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>First Name</Label><Input {...register('firstName')} />{err(errors.firstName?.message)}</div>
            <div className="space-y-2"><Label>Last Name</Label><Input {...register('lastName')} />{err(errors.lastName?.message)}</div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Email</Label><Input type="email" {...register('email')} />{err(errors.email?.message)}</div>
            <div className="space-y-2"><Label>Phone (optional)</Label><Input type="tel" {...register('phone')} /></div>
          </div>
          <Separator />
          <div className="space-y-2"><Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Address</Label><Input {...register('shippingAddress')} />{err(errors.shippingAddress?.message)}</div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="flex items-center gap-2"><Building2 className="h-4 w-4" /> City</Label><Input {...register('shippingCity')} />{err(errors.shippingCity?.message)}</div>
            <div className="space-y-2"><Label>Zip / Postal Code</Label><Input {...register('shippingZip')} />{err(errors.shippingZip?.message)}</div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Globe className="h-4 w-4" /> Country</Label>
            <Controller name="shippingCountry" control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>{countries.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>

          <div className="space-y-2 rounded-lg border border-dashed p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <Checkbox checked={saveForNextTime} onCheckedChange={(v) => setSaveForNextTime(v === true)} />
              <BookmarkPlus className="h-4 w-4 text-primary" /> Save this address for future orders
            </label>
            {saveForNextTime && (
              <Input value={addressLabel} onChange={(e) => setAddressLabel(e.target.value)} placeholder="Label (e.g. Home, Work)" className="mt-1" />
            )}
          </div>

          <div className="space-y-2"><Label className="flex items-center gap-2"><StickyNote className="h-4 w-4" /> Notes for Seller (optional)</Label><Textarea rows={2} {...register('shippingNotesSeller')} /></div>
          <div className="space-y-2"><Label className="flex items-center gap-2"><Truck className="h-4 w-4" /> Notes for Courier (optional)</Label><Textarea rows={2} {...register('shippingNotesCourier')} /></div>
        </div>
      </div>

      <div className={cn(step === 'payment' ? 'block' : 'hidden', 'space-y-6')}>
        <div className="sf-glass p-5 space-y-4">
          <h3 className="sf-heading text-lg font-bold flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Payment Method</h3>
          <Controller name="paymentMethod" control={control} render={({ field }) => (
            <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-3">
              <Label className={cn('flex items-center gap-3 border rounded-lg p-4 cursor-pointer has-[input:checked]:border-primary', hasSubscriptionProducts && 'opacity-50 cursor-not-allowed')}>
                <RadioGroupItem value="cash_on_delivery" disabled={hasSubscriptionProducts} />
                <div>
                  <p className="font-medium flex items-center gap-2"><Banknote className="h-5 w-5" /> Cash on Delivery</p>
                  <p className="text-sm text-muted-foreground">Pay with cash when your order is delivered.</p>
                  {hasSubscriptionProducts && <p className="text-xs text-destructive mt-1">Not available for subscriptions.</p>}
                </div>
              </Label>
              {cardAvailable && (
                <Label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer has-[input:checked]:border-primary">
                  <RadioGroupItem value="card" />
                  <div>
                    <p className="font-medium flex items-center gap-2"><CreditCard className="h-5 w-5" /> Credit/Debit Card</p>
                    <p className="text-sm text-muted-foreground">Secure payment via RaiAccept — you'll be redirected to complete it.</p>
                  </div>
                </Label>
              )}
            </RadioGroup>
          )} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Your payment information is securely processed.</div>
        </div>
      </div>
    </form>
  );
};
