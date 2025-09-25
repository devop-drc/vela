import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DollarSign, Package } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext";
import { formatDistanceToNow } from 'date-fns';
import Marquee from "../ui/marquee";
import { ProductEditor } from "../ProductEditor";
import { OrderDetailModal } from "../OrderDetailModal";
import { showError } from "@/utils/toast";

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
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: business } = await supabase.from('businesses').select('id').eq('user_id', user.id).single();
      if (!business) { setIsLoading(false); return; }

      const [ordersRes, productsRes] = await Promise.all([
        supabase.from('orders').select('id, customer_name, total_amount, created_at').eq('business_id', business.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('products').select('id, name, media_url, created_at, status').eq('business_id', business.id).order('created_at', { ascending: false }).limit(10)
      ]);

      const mockSales: Activity[] = [
        { id: 'mock1', type: 'sale', title: 'New Sale', description: 'to John Doe', value: formatCurrency(125.50, shopDetails?.currency), date: new Date(Date.now() - 1000 * 60 * 2).toISOString(), image: undefined },
        { id: 'mock2', type: 'sale', title: 'New Sale', description: 'to Jane Smith', value: formatCurrency(89.99, shopDetails?.currency), date: new Date(Date.now() - 1000 * 60 * 5).toISOString(), image: undefined },
        { id: 'mock3', type: 'sale', title: 'New Sale', description: 'to Alex Johnson', value: formatCurrency(250.00, shopDetails?.currency), date: new Date(Date.now() - 1000 * 60 * 15).toISOString(), image: undefined },
      ];

      const salesActivities: Activity[] = (ordersRes.data || []).map(order => ({
        id: order.id, type: 'sale', title: `New Sale`, description: `to ${order.customer_name}`,
        value: formatCurrency(order.total_amount, shopDetails?.currency), date: order.created_at,
      }));

      const productActivities: Activity[] = (productsRes.data || []).map(product => ({
        id: product.id, type: 'product', title: `New Product`, description: product.name,
        value: product.status, image: product.media_url, date: product.created_at,
      }));

      const combined = [...mockSales, ...salesActivities, ...productActivities]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15);

      setActivities(combined);
      setIsLoading(false);
    };

    if (shopDetails) { fetchActivities(); }
  }, [shopDetails]);

  const handleActivityClick = async (activity: Activity) => {
    if (activity.id.startsWith('mock')) return; // Don't open modals for mock data
    if (activity.type === 'product') {
      const { data, error } = await supabase.from('products').select('*').eq('id', activity.id).single();
      if (error) { showError("Failed to load product details."); } else { setSelectedProduct(data); }
    }
    if (activity.type === 'sale') {
      const { data, error } = await supabase.from('orders').select('*').eq('id', activity.id).single();
      if (error) { showError("Failed to load order details."); } else { setSelectedOrder(data); }
    }
  };

  return (
    <>
      {selectedProduct && <ProductEditor isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} product={selectedProduct} onUpdate={() => {}} />}
      {selectedOrder && <OrderDetailModal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} order={selectedOrder} onUpdate={() => {}} />}
      <div className="relative flex h-[88px] w-full items-center overflow-hidden rounded-lg border bg-card">
        {isLoading ? (
          <div className="p-4 w-full"><Skeleton className="h-16 w-full" /></div>
        ) : activities.length > 0 ? (
          <Marquee pauseOnHover>
            {activities.map(activity => (
              <button key={`${activity.type}-${activity.id}`} onClick={() => handleActivityClick(activity)} className="text-left mx-2" disabled={activity.id.startsWith('mock')}>
                <Card className="w-64 shrink-0 hover:bg-accent transition-colors">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={activity.image} />
                      <AvatarFallback className={activity.type === 'sale' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}>
                        {activity.type === 'sale' ? <DollarSign className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-semibold text-sm truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(activity.date), { addSuffix: true })}</p>
                    </div>
                    <p className="font-semibold text-sm">{activity.value}</p>
                  </CardContent>
                </Card>
              </button>
            ))}
          </Marquee>
        ) : (
          <div className="flex w-full items-center justify-center">
            <p className="text-sm text-muted-foreground">No recent activity to display.</p>
          </div>
        )}
      </div>
    </>
  );
};