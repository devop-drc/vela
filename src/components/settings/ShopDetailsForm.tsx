import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

const shopDetailsSchema = z.object({
  business_name: z.string().min(3, 'Business name is required.'),
  shop_name: z.string().optional(),
  headline: z.string().optional(),
  about: z.string().optional(),
  contact_email: z.string().email('Invalid email address.').optional().or(z.literal('')),
});

type ShopDetailsFormData = z.infer<typeof shopDetailsSchema>;

export const ShopDetailsForm = () => {
  const { business } = useBusiness();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<ShopDetailsFormData>({
    resolver: zodResolver(shopDetailsSchema),
  });

  useEffect(() => {
    if (business) {
      const fetchShopDetails = async () => {
        const { data, error } = await supabase
          .from('shop_details')
          .select('*')
          .eq('business_id', business.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          showError('Could not load shop details.');
        }
        
        reset({
          business_name: business.name,
          shop_name: data?.shop_name || '',
          headline: data?.headline || '',
          about: data?.about || '',
          contact_email: data?.contact_email || '',
        });
      };
      fetchShopDetails();
    }
  }, [business, reset]);

  const onSubmit = async (data: ShopDetailsFormData) => {
    if (!business) return;

    // Update business name
    const { error: businessError } = await supabase
      .from('businesses')
      .update({ name: data.business_name })
      .eq('id', business.id);

    if (businessError) {
      showError(`Failed to update business name: ${businessError.message}`);
      return;
    }

    // Upsert shop details
    const { error: shopDetailsError } = await supabase
      .from('shop_details')
      .upsert({
        business_id: business.id,
        shop_name: data.shop_name,
        headline: data.headline,
        about: data.about,
        contact_email: data.contact_email,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'business_id' });

    if (shopDetailsError) {
      showError(`Failed to save shop details: ${shopDetailsError.message}`);
    } else {
      showSuccess('Shop details saved successfully!');
      reset(data); // Resets the form's dirty state
    }
  };

  if (!business) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop Details</CardTitle>
        <CardDescription>Manage your shop's public information.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="business_name">Business Name</Label>
            <Input id="business_name" {...register('business_name')} />
            {errors.business_name && <p className="text-sm text-destructive">{errors.business_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="shop_name">Shop Name (Public)</Label>
            <Input id="shop_name" placeholder="Your public-facing shop name" {...register('shop_name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input id="headline" placeholder="A catchy headline for your shop" {...register('headline')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="about">About Your Shop</Label>
            <Textarea id="about" placeholder="Tell customers about your brand" {...register('about')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input id="contact_email" type="email" placeholder="customer-support@example.com" {...register('contact_email')} />
            {errors.contact_email && <p className="text-sm text-destructive">{errors.contact_email.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};