import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Instagram, Users, Image as ImageIcon, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

const CACHE_KEY = 'shop_details_cache';

interface ShopData {
  shop_name: string;
  username: string;
  description: string;
  logo_url: string;
  followers_count: number;
  media_count: number;
}

export const ShopSettings = () => {
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShopDetails = useCallback(async () => {
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('instagram-profile');
      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);
      setShopData(data);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    const initialFetch = async () => {
      setIsLoading(true);
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      if (cachedData) {
        setShopData(JSON.parse(cachedData));
      } else {
        await fetchShopDetails();
      }
      setIsLoading(false);
    };
    initialFetch();
  }, [fetchShopDetails]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    sessionStorage.removeItem(CACHE_KEY);
    await fetchShopDetails();
    setIsRefreshing(false);
  };

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
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Shop Details</CardTitle>
          <CardDescription>This information is synced directly from your Instagram Business profile.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start gap-6 p-4 border rounded-lg">
          <Avatar className="h-24 w-24">
            <AvatarImage src={shopData?.logo_url} alt="Shop Logo" />
            <AvatarFallback>{shopData?.shop_name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{shopData?.shop_name}</h2>
                <p className="text-muted-foreground">@{shopData?.username}</p>
              </div>
              {shopData?.username && (
                <Button asChild variant="secondary">
                  <a href={`https://instagram.com/${shopData.username}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View on Instagram
                  </a>
                </Button>
              )}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{shopData?.description || "No bio provided."}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Followers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{shopData?.followers_count?.toLocaleString() || 'N/A'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Posts</CardTitle>
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{shopData?.media_count?.toLocaleString() || 'N/A'}</div>
            </CardContent>
          </Card>
        </div>

        <Alert>
          <Instagram className="h-4 w-4" />
          <AlertTitle>Synced from Instagram</AlertTitle>
          <AlertDescription>
            To update your shop details, please make the changes directly in your Instagram app profile settings, then click the refresh button above.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};