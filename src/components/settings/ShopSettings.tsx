import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Instagram } from 'lucide-react';

interface ShopData {
  shop_name: string;
  username: string;
  description: string;
  logo_url: string;
  favicon_url: string;
}

export const ShopSettings = () => {
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShopDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('instagram-profile');
        if (invokeError) throw invokeError;
        if (data.error) throw new Error(data.error);
        setShopData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchShopDetails();
  }, []);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shop Details</CardTitle>
          <CardDescription>Your shop's public information, synced from Instagram.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Could not load shop details</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop Details</CardTitle>
        <CardDescription>This information is synced directly from your Instagram Business profile.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Instagram className="h-4 w-4" />
          <AlertTitle>Synced from Instagram</AlertTitle>
          <AlertDescription>
            To update your shop details, please make the changes directly in your Instagram app profile settings.
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-6">
          <div className="space-y-2">
            <Label>Shop Logo</Label>
            <Avatar className="h-24 w-24">
              <AvatarImage src={shopData?.logo_url} alt="Shop Logo" />
              <AvatarFallback>{shopData?.shop_name?.[0]}</AvatarFallback>
            </Avatar>
          </div>
          <div className="space-y-2">
            <Label>Shop Favicon</Label>
            <Avatar className="h-12 w-12 rounded-md">
              <AvatarImage src={shopData?.favicon_url} alt="Shop Favicon" />
              <AvatarFallback>{shopData?.shop_name?.[0]}</AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="shop_name">Shop Name</Label>
            <Input id="shop_name" value={shopData?.shop_name || ''} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Instagram Username</Label>
            <Input id="username" value={shopData?.username ? `@${shopData.username}` : ''} readOnly />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Shop Description (Bio)</Label>
          <Textarea id="description" value={shopData?.description || ''} readOnly rows={4} />
        </div>
      </CardContent>
    </Card>
  );
};