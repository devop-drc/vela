import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DollarSign, Package } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext";
import { formatDistanceToNow } from 'date-fns';
import { ProductEditor } from "../ProductEditor";
import { OrderDetailModal } from "../OrderDetailModal";
import { showError } from "@/utils/toast";
import { ScrollArea } from "../ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
    let isMounted = true;

    const fetchAndSubscribe = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: business } = await supabase.from('businesses').select('id').eq('user_id', user.id).single();
      if (!business) { setIsLoading(false); return; }

      const [ordersRes, productsRes] = await Promise.all([
        supabase.from('orders').select('id, customer_name, total_amount, created_at').eq('business_id', business.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('products').select('id, name, media_url, created_at').eq('business_id', business.id).order('created_at', { ascending: false }).limit(10)
      ]);

      const salesActivities: Activity[] = (ordersRes.data || []).map(order => ({
        id: order.id, type: 'sale', title: `New Sale`, description: `to ${order.customer_name}`,
        value: formatCurrency(order.total_amount, shopDetails?.currency), date: order.created_at,
      }));

      const productActivities: Activity[] = (productsRes.data || []).map(product => ({
        id: product.id, type: 'product', title: `New Product`, description: product.name,
        value: 'In Draft', image: product.media_url, date: product.created_at,
      }));

      const combined = [...salesActivities, ...productActivities]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15);

      if (isMounted) {
        setActivities(combined);
        setIsLoading(false);
      }

      const channel = supabase.channel('dashboard-activity-feed')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products', filter: `business_id=eq.${business.id}` }, (payload) => {
          const p = payload.new;
          const newActivity: Activity = { id: p.id, type: 'product', title: 'New Product', description: p.name, value: 'In Draft', image: p.media_url, date: p.created_at };
          if (isMounted) setActivities(prev => [newActivity, ...prev].slice(0, 20));
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `business_id=eq.${business.id}` }, (payload) => {
          const o = payload.new;
          const newActivity: Activity = { id: o.id, type: 'sale', title: 'New Sale', description: `to ${o.customer_name}`, value: formatCurrency(o.total_amount, shopDetails?.currency), date: o.created_at };
          if (isMounted) setActivities(prev => [newActivity, ...prev].slice(0, 20));
        })
        .subscribe();

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
      };
    };

    if (shopDetails) {
      fetchAndSubscribe();
    } else {
      setIsLoading(false);
    }
  }, [shopDetails]);

  const handleActivityClick = async (activity: Activity) => {
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
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Live Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[74.5vh]">
            <div className="space-y-4 pr-4">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : activities.length > 0 ? (
                <AnimatePresence initial={false}>
                  {activities.map(activity => (
                    <motion.button
                      key={`${activity.type}-${activity.id}`}
                      layout
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      onClick={() => handleActivityClick(activity)}
                      className={cn(
                        "w-full text-left p-3 flex items-center gap-3 rounded-lg hover:bg-accent transition-colors shadow",
                        activity.type === 'sale' ? 'bg-emerald-500/5' : 'bg-blue-500/5'
                      )}
                    >
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
                    </motion.button>
                  ))}
                </AnimatePresence>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No recent activity.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
};