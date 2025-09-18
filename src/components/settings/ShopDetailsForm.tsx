import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

const shopDetailsSchema = z.object({
  shop_name: z.string().min(1, 'Shop name is required'),
  headline: z.string().optional(),
  about: z.string().optional(),
  contact_email: z.string().email('Invalid email address').optional().or(z.literal('')),
});

type ShopDetailsFormData = z.infer<typeof shopDetailsSchema>;

export const ShopDetailsForm = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<ShopDetailsFormData>({
    resolver: zodResolver(shopDetailsSchema),
  });

  useEffect(() => {
    const fetchShopDetails = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: business } = await supabase.from('businesses').select('id').eq('user_id', user.id).single();
        if (business) {
          setBusinessId(business.id);
          const { data: shopDetails } = await supabase.from('shop_details').select('*').eq('business_id', business.id).single();
          reset(shopDetails || {});
        }
      }
      setIsLoading(false);
    };
    fetchShopDetails();
  }, [reset]);

  const onSubmit = async (data: ShopDetailsFormData) => {
    if (!businessId) return;
    const { error } = await supabase.from('shop_details').upsert({ ...data, business_id: businessId }, { onConflict: 'business_id' });
    if (error) {
      showError(`Failed to update shop details: ${error.message}`);
    } else {
      showSuccess('Shop details updated successfully!');
      reset(data);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop Details</CardTitle>
        <CardDescription>Manage your shop's public information, logo, and branding.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="shop_name">Shop Name</Label>
            <Input id="shop_name" {...register('shop_name')} />
            {errors.shop_name && <p className="text-sm text-destructive">{errors.shop_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input id="headline" {...register('headline')} placeholder="e.g., Handcrafted Goods & Unique Finds" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="about">About Your Shop</Label>
            <Textarea id="about" {...register('about')} rows={4} placeholder="Tell your customers a little bit about your shop..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">Public Contact Email</Label>
            <Input id="contact_email" type="email" {...register('contact_email')} />
            {errors.contact_email && <p className="text-sm text-destructive">{errors.contact_email.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Shop Details
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};