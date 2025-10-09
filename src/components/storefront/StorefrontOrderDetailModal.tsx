import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Loader2, Package, User, Mail, Calendar, Banknote, CheckCircle, Truck, Box, Eye, XCircle, CreditCard, MessageSquareWarning, Hash, Reply, Handshake, MapPin, StickyNote } from "lucide-react"; // Import StickyNote
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { useStorefront } from "@/contexts/StorefrontContext";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { MediaItem } from "../MediaItem";
import { ReportIssueModal } from "./ReportIssueModal";
import { Textarea } from "../ui/textarea";
import { Label } from "@/components/ui/label"; // Import Label

type OrderStatusType = 'Pending' | 'Order Seen' | 'Order Packaged' | 'Given to Courier' | 'Fulfilled' | 'Problematic' | 'Cancelled';

interface OrderItem {
  quantity: number;
  price_at_purchase: number;
  products: {
    name: string;
    media_url: string;
    currency: string;
  };
}

interface Dispute {
  id: string;
  order_id: string;
  customer_email: string;
  reason: string;
  message: string | null;
  status: 'Open' | 'In Review' | 'Resolved' | 'Closed';
  reply_message: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderDetails {
  id: string;
  customer_name: string;
  customer_email: string;
  status: OrderStatusType;
  total_amount: number;
  created_at: string;
  currency: string;
  payment_method: string;
  payment_status: string;
  order_items: OrderItem[];
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: string;
  shipping_notes_seller?: string; // New field
  shipping_notes_courier?: string; // New field
}

interface StorefrontOrderDetailModalProps {
  order: OrderDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdate: () => void; // Callback for when order status changes
}

export const StorefrontOrderDetailModal = ({ order, isOpen, onClose, onOrderUpdate }: StorefrontOrderDetailModalProps) => {
  const { shopDetails, convertCurrency } = useStorefront();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [isReportIssueModalOpen, setIsReportIssueModalOpen] = useState(false);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [isLoadingDispute, setIsLoadingDispute] = useState(false);

  useEffect(() => {
    if (order) {
      const fetchOrderData = async () => {
        setIsLoadingItems(true);
        setIsLoadingDispute(true);
        
        // Fetch order items
        const { data: itemsData, error: itemsError } = await supabase
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

        if (itemsError) {
          showError("Failed to fetch order items.");
        } else {
          setItems(itemsData || []);
        }
        setIsLoadingItems(false);

        // Fetch dispute for this order
        const { data: disputeData, error: disputeError } = await supabase
          .from('order_disputes')
          .select('*')
          .eq('order_id', order.id)
          .maybeSingle();
        
        if (disputeError && disputeError.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error("Error fetching dispute:", disputeError);
        } else {
          setDispute(disputeData || null);
        }
        setIsLoadingDispute(false);
      };
      fetchOrderData();
    } else {
      setItems([]);
      setDispute(null);
    }
  }, [order]);

  const handleConfirmReceipt = async () => {
    if (!order) return;
    setIsUpdatingOrder(true);
    try {
      const { error } = await supabase.from('orders').update({ status: 'Fulfilled' }).eq('id', order.id);
      if (error) throw error;
      showSuccess("Order receipt confirmed! Thank you.");
      onOrderUpdate(); // Notify parent to refetch/update order list
      onClose();
    } catch (err: any) {
      console.error("Failed to confirm receipt:", err);
      showError(`Failed to confirm receipt: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !shopDetails?.slug) return;
    if (!window.confirm("Are you sure you want to cancel this order? This action cannot be undone.")) return;

    setIsUpdatingOrder(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-order', {
        body: {
          orderId: order.id,
          customerEmail: order.customer_email,
          shopSlug: shopDetails.slug,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      showSuccess("Order cancelled successfully.");
      onOrderUpdate(); // Notify parent to refetch/update order list
      onClose();
    } catch (err: any) {
      console.error("Failed to cancel order:", err);
      showError(`Failed to cancel order: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  const getStatusColor = (status: OrderStatusType) => {
    switch (status) {
      case 'Fulfilled': return 'bg-emerald-500';
      case 'Given to Courier': return 'bg-blue-500';
      case 'Order Packaged': return 'bg-blue-500';
      case 'Order Seen': return 'bg-amber-500';
      case 'Pending': return 'bg-amber-500';
      case 'Problematic': return 'bg-destructive';
      case 'Cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: OrderStatusType) => {
    switch (status) {
      case "Fulfilled": return <CheckCircle className="h-5 w-5" />;
      case "Given to Courier": return <Truck className="h-5 w-5" />;
      case "Order Packaged": return <Box className="h-5 w-5" />;
      case "Order Seen": return <Eye className="h-5 w-5" />;
      case "Pending": return <Package className="h-5 w-5" />;
      case "Problematic": return <XCircle className="h-5 w-5" />;
      case "Cancelled": return <XCircle className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  if (!order) return null;

  return (
    <>
      {isReportIssueModalOpen && (
        <ReportIssueModal
          isOpen={isReportIssueModalOpen}
          onClose={() => setIsReportIssueModalOpen(false)}
          orderId={order.id}
          customerEmail={order.customer_email}
          onIssueReported={() => {
            setIsReportIssueModalOpen(false);
            // Refetch dispute status after reporting
            setIsLoadingDispute(true);
            supabase.from('order_disputes').select('*').eq('order_id', order.id).maybeSingle()
              .then(({ data, error }) => {
                if (error) console.error("Error refetching dispute:", error);
                setDispute(data || null);
              })
              .finally(() => setIsLoadingDispute(false));
          }}
        />
      )}

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getStatusIcon(order.status)}
              Order #{order.id.substring(0, 8)}
            </DialogTitle>
            <DialogDescription>
              Details for your order placed on {new Date(order.created_at).toLocaleDateString()}.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><User className="h-4 w-4 text-primary" /> Customer</div><p>{order.customer_name}</p></div>
                <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4 text-primary" /> Email</div><p>{order.customer_email}</p></div>
                <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4 text-primary" /> Date</div><p>{new Date(order.created_at).toLocaleString()}</p></div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Banknote className="h-4 w-4 text-primary" /> Total</div>
                  <p className="font-semibold">
                    {formatCurrency(order.total_amount, order.currency)}
                    {shopDetails?.currency && order.currency !== shopDetails.currency && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        (~{formatCurrency(convertCurrency(order.total_amount), shopDetails.currency)})
                      </span>
                    )}
                  </p>
                </div>
                <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><CreditCard className="h-4 w-4 text-primary" /> Payment Method</div><p className="capitalize">{order.payment_method.replace(/_/g, ' ')}</p></div>
                <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle className="h-4 w-4 text-primary" /> Payment Status</div><p className="capitalize">{order.payment_status}</p></div>
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Shipping Details</h3>
                <div className="space-y-2 text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                  <p><span className="font-medium">Address:</span> {order.shipping_address || 'N/A'}</p>
                  <p><span className="font-medium">City:</span> {order.shipping_city || 'N/A'}</p>
                  <p><span className="font-medium">State/Province:</span> {order.shipping_state || 'N/A'}</p>
                  <p><span className="font-medium">Zip/Postal Code:</span> {order.shipping_zip || 'N/A'}</p>
                  <p><span className="font-medium">Country:</span> {order.shipping_country || 'N/A'}</p>
                  {order.shipping_notes_seller && <p><span className="font-medium flex items-center gap-1"><StickyNote className="h-4 w-4" /> Notes for Seller:</span> {order.shipping_notes_seller}</p>}
                  {order.shipping_notes_courier && <p><span className="font-medium flex items-center gap-1"><Truck className="h-4 w-4" /> Notes for Courier:</span> {order.shipping_notes_courier}</p>}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Shipping address cannot be changed after an order is placed. Please contact support for urgent changes.
                </p>
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Items Ordered</h3>
                {isLoadingItems ? <Loader2 className="animate-spin" /> : (
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <MediaItem src={item.products.media_url} alt={item.products.name} className="h-16 w-16 rounded-md object-cover bg-muted" />
                        <div className="flex-1">
                          <p className="font-medium">{item.products.name}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium">{formatCurrency(item.price_at_purchase * item.quantity, order.currency)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2"><MessageSquareWarning className="h-5 w-5 text-primary" /> Issue Report</h3>
                {isLoadingDispute ? <Loader2 className="animate-spin" /> : dispute ? (
                  <div className="space-y-3 p-3 border rounded-md bg-muted/50">
                    <div className="flex items-center justify-between">
                      <p className="font-medium flex items-center gap-2"><Hash className="h-4 w-4" /> Dispute ID: {dispute.id.substring(0, 8)}</p>
                      <Badge className={cn("text-white", getStatusColor(dispute.status))}>{dispute.status}</Badge>
                    </div>
                    <p className="text-sm"><span className="font-medium">Reason:</span> {dispute.reason}</p>
                    {dispute.message && <p className="text-sm"><span className="font-medium">Your Message:</span> {dispute.message}</p>}
                    {dispute.reply_message && (
                      <div className="space-y-2 mt-3">
                        <Label className="flex items-center gap-2 text-sm"><Reply className="h-4 w-4" /> Seller's Reply</Label>
                        <p className="text-sm text-muted-foreground p-3 border rounded-md bg-background">{dispute.reply_message}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No issue reported for this order.</p>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div className="flex items-center gap-2 mr-auto">
              <span className="text-sm">Status:</span>
              <Badge className={cn("text-white", getStatusColor(order.status))}>{order.status}</Badge>
            </div>
            <div className="flex gap-2">
              {order.status === 'Given to Courier' && (
                <Button onClick={handleConfirmReceipt} disabled={isUpdatingOrder}>
                  {isUpdatingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Handshake className="mr-2 h-4 w-4" />
                  Confirm Receipt
                </Button>
              )}
              {order.status === 'Pending' && (
                <Button variant="destructive" onClick={handleCancelOrder} disabled={isUpdatingOrder}>
                  {isUpdatingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Order
                </Button>
              )}
              {!dispute && order.status !== 'Cancelled' && (
                <Button variant="outline" onClick={() => setIsReportIssueModalOpen(true)} disabled={isUpdatingOrder}>
                  <MessageSquareWarning className="mr-2 h-4 w-4" />
                  Report Issue
                </Button>
              )}
              <Button variant="ghost" onClick={onClose}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};