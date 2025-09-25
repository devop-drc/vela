import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DollarSign, Package } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext";
import { formatDistanceToNow } from 'date-fns';

type Activity = {
  id: string;
  type: 'sale' | 'product';
  title: string;
  description: string;
  value: string | number;
  image?: string;
  date: string;
};

export const ActivityFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { shopDetails } = useShop();

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: business } = await supabase.from('businesses').select('id').eq('user_id', user.id).single();
      if (!business) { setIsLoading(false); return; }

      const [ordersRes, productsRes] = await Promise.all([
        supabase.from('orders').select('id, customer_name, total_amount, created_at').eq('business_id', business.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('products').select('id, name, media_url, created_at').eq('business_id', business.id).order('created_at', { ascending: false }).limit(5)
      ]);

      const salesActivities: Activity[] = (ordersRes.data || []).map(order => ({
        id: order.id,
        type: 'sale',
        title: `New Sale to ${order.customer_name}`,
        description: `Order #${order.id.substring(0, 8)}`,
        value: formatCurrency(order.total_amount, shopDetails?.currency),
        date: order.created_at,
      }));

      const productActivities: Activity[] = (productsRes.data || []).map(product => ({
        id: product.id,
        type: 'product',
        title: `New Product Added`,
        description: product.name,
        value: 'In Draft',
        image: product.media_url,
        date: product.created_at,
      }));

      const combined = [...salesActivities, ...productActivities]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 7);

      setActivities(combined);
      setIsLoading(false);
    };

    if (shopDetails) {
        fetchActivities();
    }
  }, [shopDetails]);

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Activity Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : activities.length > 0 ? (
            activities.map(activity => (
              <div key={`${activity.type}-${activity.id}`} className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={activity.image} />
                  <AvatarFallback className={activity.type === 'sale' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}>
                    {activity.type === 'sale' ? <DollarSign className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{activity.value}</p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(activity.date), { addSuffix: true })}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No recent activity.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};