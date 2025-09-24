import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Loader2, Package, User, Mail, Calendar, DollarSign } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  status: string;
  total_amount: number;
  created_at: string;
};

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const OrderDetailModal = ({ order, isOpen, onClose, onUpdate }: OrderDetailModalProps) => {
  const { shopDetails } = useShop();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (order) {
      const fetchOrderItems = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('order_items')
          .select(`
            quantity,
            price_at_purchase,
            products (
              name,
              media_url,
              currency
            )
          `)
          .eq('order_id', order.id);

        if (error) {
          showError("Failed to fetch order items.");
        } else {
          setItems(data);
        }
        setIsLoading(false);
      };
      fetchOrderItems();
    }
  }, [order]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return;
    setIsUpdating(true);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', order.id);

    if (error) {
      showError(`Failed to update status: ${error.message}`);
    } else {
      showSuccess(`Order marked as ${newStatus}.`);
      onUpdate();
    }
    setIsUpdating(false);
  };

  if (!order) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Fulfilled': return 'bg-emerald-500';
      case 'In Progress': return 'bg-blue-500';
      case 'Pending':
      default:
        return 'bg-amber-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Order #{order.id.substring(0, 8)}</DialogTitle>
          <DialogDescription>
            Details for the order placed on {new Date(order.created_at).toLocaleDateString()}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><User className="h-4 w-4" /> Customer</div><p>{order.customer_name}</p></div>
              <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" /> Email</div><p>{order.customer_email}</p></div>
              <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" /> Date</div><p>{new Date(order.created_at).toLocaleString()}</p></div>
              <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><DollarSign className="h-4 w-4" /> Total</div><p className="font-semibold">{formatCurrency(order.total_amount, shopDetails?.currency)}</p></div>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Package className="h-5 w-5" /> Items Ordered</h3>
              {isLoading ? <Loader2 className="animate-spin" /> : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <img src={item.products.media_url} alt={item.products.name} className="h-16 w-16 rounded-md object-cover bg-muted" />
                      <div className="flex-1">
                        <p className="font-medium">{item.products.name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.price_at_purchase * item.quantity, item.products.currency)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="pt-4">
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-sm">Status:</span>
            <Badge className={cn("text-white", getStatusColor(order.status))}>{order.status}</Badge>
          </div>
          {order.status === 'Pending' && <Button onClick={() => handleStatusUpdate('In Progress')} disabled={isUpdating}>Mark as In Progress</Button>}
          {order.status === 'In Progress' && <Button onClick={() => handleStatusUpdate('Fulfilled')} disabled={isUpdating}>Mark as Fulfilled</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};