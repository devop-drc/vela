// Contact/shipping + payment form for checkout. Token-styled rewrite of the old
// CheckoutForm; submits a CheckoutFields object to the parent.

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { User, MapPin, Building2, Globe, Truck, StickyNote, CreditCard, Banknote, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const { register, handleSubmit, control, formState: { errors } } = useForm<CheckoutFields>({
    resolver: zodResolver(schema),
    defaultValues: { shippingCountry: 'AL', paymentMethod: 'cash_on_delivery' },
  });

  const submit = (data: CheckoutFields) => (step === 'contact-shipping' ? onContinue() : onPlaceOrder(data));
  const err = (m?: string) => m && <p className="text-sm text-destructive mt-1">{m}</p>;

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-6">
      <div className={cn(step === 'contact-shipping' ? 'block' : 'hidden', 'space-y-6')}>
        <div className="sf-glass p-5 space-y-5">
          <h3 className="sf-heading text-lg font-bold flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Contact & Shipping</h3>
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
              {/* Card payment is not wired to a processor yet — hidden so customers can't place
                  orders that look paid but aren't. Re-enable once Stripe is integrated. */}
            </RadioGroup>
          )} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Your payment information is securely processed.</div>
        </div>
      </div>
    </form>
  );
};
