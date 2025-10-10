import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Banknote, Package, CheckCircle, XCircle, Archive, MessageSquareWarning, Handshake, ShoppingBag } from "lucide-react"; // Added ShoppingBag
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext";
import { formatDistanceToNow } from 'date-fns';
import { ProductEditor } from "../ProductEditor";
import { OrderDetailModal } from "../OrderDetailModal";
import { showError } from "@/utils/toast";
import { ScrollArea } from "../ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { DisputeDetailModal } from "../DisputeDetailModal"; // Import DisputeDetailModal

type Activity = {
  id: string;
  type: 'sale' | 'product' | 'dispute' | 'new_order' | 'order_fulfilled'; // Added new_order
  title: string;
  description: string;
  value: string | number;
  image?: string;
  date: string;
  orderId?: string; // For linking to order details
  disputeId?: string; // For linking to dispute details
};

const ActivityIcon = ({ activity }: { activity: Activity }) => {
  switch (activity.type) {
    case 'sale': return <Banknote className="h-5 w-5" />;
    case 'new_order': return <ShoppingBag className="h-5 w-5" />; // Icon for new orders
    case 'product':
      if (activity.title === 'Status Updated') {
        const status = activity.value as string;
        if (status === 'Active') return <CheckCircle className="h-5 w-5" />;
        if (status === 'Draft') return <XCircle className="h-5 w-5" />;
        if (status === 'Out of Stock') return <Archive className="h-5 w-5" />;
      }
      return <Package className="h-5 w-5" />;
    case 'dispute': return <MessageSquareWarning className="h-5 w-5" />;
    case 'order_fulfilled': return <Handshake className="h-5 w-5" />;
    default: return <Package className="h-5 w-5" />;
  }
};

const ActivityValue = ({ activity }: { activity: Activity }) => {
  if (activity.type === 'sale' || activity.type === 'new_order') { // Apply to both sale and new_order
    return <p className="font-semibold text-sm">{activity.value}</p>;
  }
  
  if (activity.type === 'product') {
    const status = activity.value as string;
    const statusConfig: { [key: string]: string } = {
      'Active': 'bg-emerald-100 text-emerald-800',
      'Draft': 'bg-amber-100 text-amber-800',
      'Out of Stock': 'bg-slate-100 text-slate-800',
    };

    if (statusConfig[status]) {
      return <Badge variant="outline" className={cn("font-normal", statusConfig[status])}>{status}</Badge>;
    }
  }

  if (activity.type === 'dispute') {
    return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">New</Badge>;
  }

  if (activity.type === 'order_fulfilled') {
    return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">Fulfilled</Badge>;
  }

  return <p className="font-semibold text-sm">{activity.value}</p>;
};

export const ActivityFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { shopDetails, convertCurrency } = useShop(); // Destructure convertCurrency
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    let productsChannel: any;
    let ordersChannel: any;
    let disputesChannel: any;

    const fetchAndSubscribe = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: business } = await supabase.from('businesses').select('id').eq('user_id', user.id).single();
      if (!business) { setIsLoading(false); return; }

      const [ordersRes, productsRes, disputesRes] = await Promise.all([
        supabase.from('orders').select('id, customer_name, total_amount, created_at, currency, status, payment_status').eq('business_id', business.id).order('created_at', { ascending: false }).limit(10), // Select payment_status
        supabase.from('products').select('id, name, media_url, created_at, status').eq('business_id', business.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('order_disputes').select('id, order_id, reason, created_at').eq('orders.business_id', business.id).order('created_at', { ascending: false }).limit(5), // Fetch disputes
      ]);

      const orderActivities: Activity[] = (ordersRes.data || []).map(order => {
        const convertedAmount = convertCurrency(order.total_amount, order.currency, shopDetails?.currency); // Convert here
        if (order.status === 'Fulfilled' && order.payment_status === 'paid') {
          return {
            id: order.id, type: 'sale', title: `New Sale`, description: `to ${order.customer_name}`,
            value: formatCurrency(convertedAmount, shopDetails?.currency), date: order.created_at, orderId: order.id,
          };
        } else {
          return {
            id: order.id, type: 'new_order', title: `New Order`, description: `from ${order.customer_name}`,
            value: formatCurrency(convertedAmount, shopDetails?.currency), date: order.created_at, orderId: order.id,
          };
        }
      });

      const productActivities: Activity[] = (productsRes.data || []).map(product => ({
        id: product.id, type: 'product', title: `New Product`, description: product.name,
        value: product.status, image: product.media_url, date: product.created_at,
      }));

      const disputeActivities: Activity[] = (disputesRes.data || []).map(dispute => ({
        id: dispute.id, type: 'dispute', title: `New Dispute`, description: `Reason: ${dispute.reason}`,
        value: 'Open', date: dispute.created_at, disputeId: dispute.id, orderId: dispute.order_id,
      }));

      const combined = [...orderActivities, ...productActivities, ...disputeActivities]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15);

      if (isMounted) {
        setActivities(combined);
        setIsLoading(false);
      }

      // Products Channel
      productsChannel = supabase.channel('dashboard-products-feed')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products', filter: `business_id=eq.${business.id}` }, (payload) => {
          const p = payload.new;
          const newActivity: Activity = { id: p.id, type: 'product', title: 'New Product', description: p.name, value: p.status, image: p.media_url, date: p.created_at };
          if (isMounted) setActivities(prev => [newActivity, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20));
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products', filter: `business_id=eq.${business.id}` }, (payload) => {
            const oldP = payload.old as any;
            const newP = payload.new as any;
            if (oldP.status !== newP.status) {
                const newActivity: Activity = {
                    id: `${newP.id}-${payload.commit_timestamp}`,
                    type: 'product',
                    title: `Status Updated`,
                    description: newP.name,
                    value: newP.status,
                    image: newP.media_url,
                    date: payload.commit_timestamp,
                };
                if (isMounted) setActivities(prev => [newActivity, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20));
            }
        })
        .subscribe();

      // Orders Channel
      ordersChannel = supabase.channel('dashboard-orders-feed')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `business_id=eq.${business.id}` }, (payload) => {
          const o = payload.new as any;
          const convertedAmount = convertCurrency(o.total_amount, o.currency, shopDetails?.currency); // Convert here
          const newActivity: Activity = { id: o.id, type: 'new_order', title: 'New Order', description: `from ${o.customer_name}`, value: formatCurrency(convertedAmount, shopDetails?.currency), date: o.created_at, orderId: o.id };
          if (isMounted) setActivities(prev => [newActivity, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20));
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `business_id=eq.${business.id}` }, (payload) => {
          const oldO = payload.old as any;
          const newO = payload.new as any;
          if (oldO.status !== newO.status || oldO.payment_status !== newO.payment_status) {
            const convertedAmount = convertCurrency(newO.total_amount, newO.currency, shopDetails?.currency); // Convert here
            if (newO.status === 'Fulfilled' && newO.payment_status === 'paid') {
              const newActivity: Activity = {
                id: `${newO.id}-${payload.commit_timestamp}-fulfilled`,
                type: 'sale', // Now it's a sale
                title: `Sale Fulfilled`,
                description: `Order #${newO.id.substring(0, 8)} by ${newO.customer_name}`,
                value: formatCurrency(convertedAmount, shopDetails?.currency),
                date: payload.commit_timestamp,
                orderId: newO.id,
              };
              if (isMounted) setActivities(prev => [newActivity, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20));
            } else if (newO.status === 'Fulfilled' && newO.payment_status !== 'paid') {
              // If fulfilled but not paid, it's still an order fulfilled, but not a 'sale' yet
              const newActivity: Activity = {
                id: `${newO.id}-${payload.commit_timestamp}-fulfilled-unpaid`,
                type: 'order_fulfilled',
                title: `Order Fulfilled (Unpaid)`,
                description: `Order #${newO.id.substring(0, 8)} by ${newO.customer_name}`,
                value: 'Fulfilled',
                date: payload.commit_timestamp,
                orderId: newO.id,
              };
              if (isMounted) setActivities(prev => [newActivity, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20));
            }
            // You can add other status updates here if needed, but they won't be 'sale' type
          }
        })
        .subscribe();

      // Disputes Channel
      disputesChannel = supabase.channel('dashboard-disputes-feed')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_disputes', filter: `orders.business_id=eq.${business.id}` }, (payload) => {
          const d = payload.new as any;
          const newActivity: Activity = { id: d.id, type: 'dispute', title: 'New Dispute', description: `Reason: ${d.reason}`, value: 'Open', date: d.created_at, disputeId: d.id, orderId: d.order_id };
          if (isMounted) setActivities(prev => [newActivity, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20));
        })
        .subscribe();

      return () => {
        isMounted = false;
        supabase.removeChannel(productsChannel);
        supabase.removeChannel(ordersChannel);
        supabase.removeChannel(disputesChannel);
      };
    };

    if (shopDetails) {
      fetchAndSubscribe();
    } else {
      setIsLoading(false);
    }
  }, [shopDetails, convertCurrency]); // Add convertCurrency to dependencies

  const handleActivityClick = async (activity: Activity) => {
    if (activity.type === 'product') {
      const { data, error } = await supabase.from('products').select('*').eq('id', activity.id.split('-')[0]).single();
      if (error) { 
        showError("Failed to load product details."); 
      } else { 
        setSelectedProduct(data); 
      }
    }
    if (activity.type === 'sale' || activity.type === 'new_order' || activity.type === 'order_fulfilled' || activity.type === 'dispute') { // Added dispute
      const { data, error } = await supabase.from('orders').select('*').eq('id', activity.orderId).single();
      if (error) { 
        showError("Failed to load order details."); 
      } else { 
        setSelectedOrder(data); 
      }
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
                      key={activity.id}
                      layout
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      onClick={() => handleActivityClick(activity)}
                      className={cn(
                        "w-full text-left p-3 flex items-center gap-3 rounded-lg hover:bg-accent transition-colors shadow",
                        activity.type === 'sale' ? 'bg-emerald-500/5' : 
                        activity.type === 'new_order' ? 'bg-blue-500/5' : // New order background
                        activity.type === 'dispute' ? 'bg-amber-500/5' :
                        activity.type === 'order_fulfilled' ? 'bg-emerald-500/5' :
                        'bg-blue-500/5'
                      )}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={activity.image} />
                        <AvatarFallback className={cn(
                          activity.type === 'sale' ? 'bg-emerald-100 text-emerald-600' : 
                          activity.type === 'new_order' ? 'bg-blue-100 text-blue-600' : // New order icon background
                          activity.type === 'dispute' ? 'bg-amber-100 text-amber-600' :
                          activity.type === 'order_fulfilled' ? 'bg-emerald-100 text-emerald-600' :
                          'bg-blue-100 text-blue-600'
                        )}>
                          <ActivityIcon activity={activity} />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-semibold text-sm truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(activity.date), { addSuffix: true })}</p>
                      </div>
                      <ActivityValue activity={activity} />
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