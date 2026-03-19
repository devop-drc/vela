import { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Instagram, RefreshCw, Save, Loader2, Users, Image as ImageIcon, Store, Type, Info, Mail, DollarSign, Copy, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { useShop } from '@/contexts/ShopContext';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { showSuccess, showError } from '@/utils/toast';
import { currencies } from '@/lib/currencies';

const InfoRow = ({ icon: Icon, label, value, link }: { icon: React.ElementType, label: string, value: React.ReactNode, link?: string }) => (
  <div className="flex items-start gap-3">
    <Icon className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
    <div className="flex-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="font-medium flex items-center gap-1 hover:underline">
          {value} <LinkIcon className="h-3 w-3" />
        </a>
      ) : (
        <p className="font-medium">{value || 'N/A'}</p>
      )}
    </div>
  </div>
);

export const ShopSettings = () => {
  const { shopDetails, updateShopDetails, isLoading: isContextLoading, exchangeRates } = useShop();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncedData, setSyncedData] = useState<any>(null);

  const { register, handleSubmit, reset, control, watch, formState: { isSubmitting, isDirty } } = useForm();
  const watchedCurrency = watch('currency');
  const selectedCurrencyMeta = currencies.find(c => c.code === watchedCurrency);

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
    if (!shopDetails?.id) {
      setIsRefreshing(false);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const invokeOptions: any = { body: { user_id: shopDetails.userId } };
    if (session?.access_token) {
      invokeOptions.headers = {
        Authorization: `Bearer ${session.access_token}`
      };
    }
    const { data, error } = await supabase.functions.invoke('instagram-profile', invokeOptions);
    if (error || data?.error) {
      console.error("Failed to refresh IG data", error || data?.error);
    } else {
      setSyncedData(data);
    }
    setIsRefreshing(false);
  }, [shopDetails?.userId]);

  useEffect(() => {
    fetchSyncedDetails();
  }, [fetchSyncedDetails]);

  const onSubmit = async (data: any) => {
    const success = await updateShopDetails(data);
    if (success) {
      showSuccess("Shop details updated!");
    }
  };

  const shopUrl = shopDetails?.slug ? `${window.location.origin}/shop/${shopDetails.slug}` : null;

  const handleCopyShopUrl = async () => {
    if (shopUrl) {
      try {
        await navigator.clipboard.writeText(shopUrl);
        showSuccess("Shop URL copied to clipboard!");
      } catch {
        showError("Failed to copy URL. Please try again manually.");
      }
    } else {
      showError("Shop URL not available yet.");
    }
  };

  if (isContextLoading || !syncedData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shop URL banner */}
      {shopUrl && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border bg-accent/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Your storefront URL</p>
              <p className="font-medium text-sm truncate">{shopUrl}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleCopyShopUrl}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button variant="outline" size="icon" asChild>
              <a href={shopUrl} target="_blank" rel="noopener noreferrer" title="Open storefront">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle>Shop Details</CardTitle>
                <CardDescription>This information is displayed on your storefront and in communications.</CardDescription>
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
                    <div className="flex gap-2">
                      {selectedCurrencyMeta && (
                        <div className="flex items-center justify-center w-10 h-10 rounded-md border bg-muted text-sm font-semibold flex-shrink-0">
                          {selectedCurrencyMeta.symbol}
                        </div>
                      )}
                      <Controller
                        name="currency"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="flex-1"><SelectValue placeholder="Select currency..." /></SelectTrigger>
                            <SelectContent>
                              {currencies.map(c => (
                                <SelectItem key={c.code} value={c.code}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm w-8 text-center">{c.symbol}</span>
                                    <span className="font-medium">{c.code}</span>
                                    {exchangeRates && exchangeRates[c.code] && c.code !== 'USD' && (
                                      <span className="text-xs text-muted-foreground">
                                        ≈ {exchangeRates[c.code].toFixed(2)}/USD
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
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6 justify-end">
                <Button type="submit" disabled={isSubmitting || !isDirty}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>

        {/* Synced from Instagram sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" /> Instagram
                </CardTitle>
                <CardDescription>Synced data — read only.</CardDescription>
              </div>
              <Button variant="outline" size="icon" onClick={fetchSyncedDetails} disabled={isRefreshing} className="flex-shrink-0">
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={syncedData?.logo_url} alt="Shop Logo" />
                  <AvatarFallback>{syncedData?.shop_name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold leading-tight">{syncedData?.shop_name}</p>
                  <p className="text-sm text-muted-foreground">@{syncedData?.username}</p>
                </div>
              </div>
              <div className="space-y-3">
                <InfoRow icon={Users} label="Followers" value={syncedData?.followers_count?.toLocaleString()} />
                <InfoRow icon={ImageIcon} label="Posts" value={syncedData?.media_count?.toLocaleString()} />
                <InfoRow
                  icon={Instagram}
                  label="Instagram Profile"
                  value={`@${syncedData?.username}`}
                  link={syncedData?.instagram_url}
                />
              </div>
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
    </div>
  );
};
