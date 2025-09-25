import { useShop } from "@/contexts/ShopContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, Image as ImageIcon, RefreshCw, Package } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const ProfileStats = () => {
  const { shopDetails, isLoading, fetchShopDetails } = useShop();
  const [productCount, setProductCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchProductCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      setProductCount(count);
    };
    fetchProductCount();
  }, []);

  if (isLoading) {
    return <Skeleton className="h-full w-full" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Profile Stats</CardTitle>
        <Button variant="ghost" size="icon" onClick={fetchShopDetails}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={shopDetails?.logo_url} />
            <AvatarFallback>{shopDetails?.shop_name?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold">{shopDetails?.shop_name}</h3>
            <p className="text-sm text-muted-foreground">Synced from Instagram</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-2 rounded-lg bg-muted">
            <Users className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-2xl font-bold mt-1">{shopDetails?.followers_count?.toLocaleString() || 'N/A'}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="p-2 rounded-lg bg-muted">
            <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-2xl font-bold mt-1">{shopDetails?.media_count?.toLocaleString() || 'N/A'}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div className="p-2 rounded-lg bg-muted">
            <Package className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-2xl font-bold mt-1">{productCount?.toLocaleString() ?? 'N/A'}</p>
            <p className="text-xs text-muted-foreground">Products</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};