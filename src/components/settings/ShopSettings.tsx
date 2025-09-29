import { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Instagram, RefreshCw, Save, Loader2, Users, Image as ImageIcon, Store, Type, Info, Mail, DollarSign, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { useShop } from '@/contexts/ShopContext';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { showSuccess, showError } from '@/utils/toast';
import { currencies } from '@/lib/currencies';

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <Icon className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
    <div className="flex-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value || 'N/A'}</p>
    </div>
  </div>
);

export const ShopSettings = () => {
  const { shopDetails, updateShopDetails, isLoading: isContextLoading, exchangeRates } = useShop();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncedData, setSyncedData] = useState<any>(null);

  const { register, handleSubmit, reset, control, formState: { isSubmitting, isDirty } } = useForm();

  useEffect(() => {
    if (shopDetails) {
      reset({
        shop_name: shopDetails.shop_name,
        headline: shopDetails.headline,
        about: shopDetails.about,
        contact_email: shopDetails.contact_email,
        currency: shopDetails.currency,
      });
    }
  }, [shopDetails, reset]);

  const fetchSyncedDetails = useCallback(async () => {
    setIsRefreshing(true);
    const { data, error } = await supabase.functions.invoke('instagram-profile');
    if (error || data.error) {
      console.error("Failed to refresh IG data", error || data.error);
    } else {
      setSyncedData(data);
    }
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    fetchSyncedDetails();
  }, [fetchSyncedDetails]);

  const onSubmit = async (data: any) => {
    const success = await updateShopDetails(data);
    if (success) {
      showSuccess("Shop details updated!");
      reset(data); // Resets the form's dirty state
    }
  };

  const handleCopyShopUrl = async () => {
    if (shopDetails?.id) {
      const shopUrl = `${window.location.origin}/shop/${shopDetails.id}`;
      try {
        await navigator.clipboard.writeText(shopUrl);
        showSuccess("Shop URL copied to clipboard!");
      } catch (err) {
        showError("Failed to copy URL. Please try again manually.");
        console.error("Failed to copy shop URL:", err);
      }
    } else {
      showError("Shop URL not available yet.");
    }
  };

  if (isContextLoading || !syncedData) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Shop Details</CardTitle>
              <CardDescription>This information will be displayed on your storefront and in communications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="shop_name" className="flex items-center gap-2"><Store className="h-4 w-4" /> Shop Name</Label>
                  <Input id="shop_name" {...register('shop_name')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="headline" className="flex items-center gap-2"><Type className="h-4 w-4" /> Headline</Label>
                  <Input id="headline" {...register('headline')} placeholder="e.g., Handcrafted Leather Goods" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="about" className="flex items-center gap-2"><Info className="h-4 w-4" /> About Section</Label>
                <Textarea id="about" {...register('about')} rows={4} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="contact_email" className="flex items-center gap-2"><Mail className="h-4 w-4" /> Public Contact Email</Label>
                  <Input id="contact_email" type="email" {...register('contact_email')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency" className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Default Currency</Label>
                  <Controller
                    name="currency"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select currency..." /></SelectTrigger>
                        <SelectContent>
                          {currencies.map(c => (
                            <SelectItem key={c.code} value={c.code}>
                              <div className="flex items-center justify-between w-full">
                                <span>{c.code} ({c.symbol})</span>
                                {exchangeRates && exchangeRates[c.code] && c.code !== 'USD' && (
                                  <span className="text-xs text-muted-foreground">
                                    1 USD ≈ {exchangeRates[c.code].toFixed(2)} {c.code}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button type="button" variant="outline" onClick={handleCopyShopUrl}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Shop URL
              </Button>
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Synced from Instagram</CardTitle>
              <CardDescription>This data is read-only.</CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={fetchSyncedDetails} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={syncedData?.logo_url} alt="Shop Logo" />
                <AvatarFallback>{syncedData?.shop_name?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{syncedData?.shop_name}</h3>
                <p className="text-sm text-muted-foreground">@{syncedData?.username}</p>
              </div>
            </div>
            <InfoRow icon={Users} label="Followers" value={syncedData?.followers_count?.toLocaleString()} />
            <InfoRow icon={ImageIcon} label="Posts" value={syncedData?.media_count?.toLocaleString()} />
            <Alert>
              <Instagram className="h-4 w-4" />
              <AlertTitle>Read-Only</AlertTitle>
              <AlertDescription>
                To update this info, make changes in your Instagram app, then click refresh.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};