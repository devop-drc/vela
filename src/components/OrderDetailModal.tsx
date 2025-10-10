import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Loader2, Package, User, Mail, Calendar, Banknote, CheckCircle, Truck, Box, Eye, XCircle, CreditCard, MessageSquareWarning, Hash, Reply, Handshake, MapPin, StickyNote } from "lucide-react"; // Import StickyNote
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label"; // Import Label
import { Textarea } from "./ui/textarea"; // Import Textarea

type OrderStatusType = 'Pending' | 'Order Seen' | 'Order Packaged' | 'Given to Courier' | 'Fulfilled' | 'Problematic' | 'Cancelled';

interface OrderItem {
  quantity: number;
  price_at_purchase: number;
  products: {
    name: string;
    media_url: string;
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

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  status: OrderStatusType;
  total_amount: number;
  created_at: string;
  updated_at: string;
  currency: string;
  payment_method: string;
  payment_status: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: string;
  shipping_notes_seller?: string; // New field
  shipping_notes_courier?: string; // New field
};

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const OrderDetailModal = ({ order, isOpen, onClose, onUpdate }: OrderDetailModalProps) => {
  const { shopDetails, convertCurrency } = useShop();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<OrderStatusType>('Pending');
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [isLoadingDispute, setIsLoadingDispute] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [disputeStatus, setDisputeStatus] = useState<Dispute['status']>('Open');

  useEffect(() => {
    if (order) {
      setCurrentStatus(order.status);
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
              media_url
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
          setReplyMessage(disputeData?.reply_message || '');
          setDisputeStatus(disputeData?.status || 'Open');
        }
        setIsLoadingDispute(false);
      };
      fetchOrderData();
    } else {
      setItems([]);
      setDispute(null);
      setReplyMessage('');
      setDisputeStatus('Open');
    }
  }, [order]);

  const handleStatusUpdate = async (newStatus: OrderStatusType) => {
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
      setCurrentStatus(newStatus); // Update local state immediately
      onUpdate(); // Trigger parent to refetch/update
    }
    setIsUpdating(false);
  };

  const handleDisputeUpdate = async () => {
    if (!dispute) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('order_disputes').update({
        reply_message: replyMessage,
        status: disputeStatus,
      }).eq('id', dispute.id);

      if (error) throw error;

      showSuccess("Dispute updated successfully!");
      setDispute(prev => prev ? { ...prev, reply_message: replyMessage, status: disputeStatus } : null);
      onUpdate();
    } catch (err: any) {
      console.error("Failed to update dispute:", err);
      showError(`Failed to update dispute: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!order || !shopDetails) return null; // Ensure shopDetails is available

  const getStatusColor = (status: OrderStatusType | Dispute['status']) => {
    switch (status) {
      case 'Fulfilled':
      case 'Resolved': return 'bg-emerald-500';
      case 'Given to Courier':
      case 'Order Packaged':
      case 'In Review': return 'bg-blue-500';
      case 'Order Seen':
      case 'Pending':
      case 'Open': return 'bg-amber-500';
      case 'Problematic': return 'bg-destructive';
      case 'Cancelled':
      case 'Closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const statusOptions: { value: OrderStatusType; label: string; icon: React.ElementType }[] = [
    { value: 'Pending', label: 'Pending', icon: Package },
    { value: 'Order Seen', label: 'Order Seen', icon: Eye },
    { value: 'Order Packaged', label: 'Order Packaged', icon: Box },
    { value: 'Given to Courier', label: 'Given to Courier', icon: Truck },
    { value: 'Fulfilled', label: 'Fulfilled', icon: CheckCircle },
    { value: 'Problematic', label: 'Problematic', icon: XCircle },
    { value: 'Cancelled', label: 'Cancelled', icon: XCircle },
  ];

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
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Banknote className="h-4 w-4" /> Total</div>
                <p className="font-semibold">
                  {/* Convert order.total_amount from its stored currency (order.currency) to shopDetails.currency */}
                  {formatCurrency(convertCurrency(order.total_amount, order.currency, shopDetails.currency), shopDetails.currency)}
                  {order.currency !== shopDetails.currency && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      (~{formatCurrency(order.total_amount, order.currency)})
                    </span>
                  )}
                </p>
              </div>
              <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><CreditCard className="h-4 w-4" /> Payment Method</div><p className="capitalize">{order.payment_method.replace(/_/g, ' ')}</p></div>
              <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle className="h-4 w-4" /> Payment Status</div><p className="capitalize">{order.payment_status}</p></div>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2"><MapPin className="h-5 w-5" /> Shipping Details</h3>
              <div className="space-y-2 text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                <p><span className="font-medium">Address:</span> {order.shipping_address || 'N/A'}</p>
                <p><span className="font-medium">City:</span> {order.shipping_city || 'N/A'}</p>
                <p><span className="font-medium">State/Province:</span> {order.shipping_state || 'N/A'}</p>
                <p><span className="font-medium">Zip/Postal Code:</span> {order.shipping_zip || 'N/A'}</p>
                <p><span className="font-medium">Country:</span> {order.shipping_country || 'N/A'}</p>
                {order.shipping_notes_seller && <p><span className="font-medium flex items-center gap-1"><StickyNote className="h-4 w-4" /> Notes for Seller:</span> {order.shipping_notes_seller}</p>}
                {order.shipping_notes_courier && <p><span className="font-medium flex items-center gap-1"><Truck className="h-4 w-4" /> Notes for Courier:</span> {order.shipping_notes_courier}</p>}
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Package className="h-5 w-5" /> Items Ordered</h3>
              {isLoadingItems ? <Loader2 className="animate-spin" /> : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <img src={item.products.media_url} alt={item.products.name} className="h-16 w-16 rounded-md object-cover bg-muted" />
                      <div className="flex-1">
                        <p className="font-medium">{item.products.name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">
                        {/* Convert item.price_at_purchase from its stored currency ('ALL') to shopDetails.currency */}
                        {formatCurrency(convertCurrency(item.price_at_purchase * item.quantity, 'ALL', shopDetails.currency), shopDetails.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2"><MessageSquareWarning className="h-5 w-5" /> Client Dispute</h3>
              {isLoadingDispute ? <Loader2 className="animate-spin" /> : dispute ? (
                <div className="space-y-3 p-3 border rounded-md bg-muted/50">
                  <div className="flex items-center justify-between">
                    <p className="font-medium flex items-center gap-2"><Hash className="h-4 w-4" /> Dispute ID: {dispute.id.substring(0, 8)}</p>
                    <Badge className={cn("text-white", getStatusColor(dispute.status))}>{dispute.status}</Badge>
                  </div>
                  <p className="text-sm"><span className="font-medium">Reason:</span> {dispute.reason}</p>
                  {dispute.message && <p className="text-sm"><span className="font-medium">Customer's Message:</span> {dispute.message}</p>}
                  <div className="space-y-2 mt-3">
                    <Label htmlFor="replyMessage" className="flex items-center gap-2 text-sm"><Reply className="h-4 w-4" /> Your Reply</Label>
                    <Textarea id="replyMessage" rows={3} value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Type your response to the customer here..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="disputeStatus">Dispute Status</Label>
                    <Select value={disputeStatus} onValueChange={(value: Dispute['status']) => setDisputeStatus(value)}>
                      <SelectTrigger id="disputeStatus">
                        <SelectValue placeholder="Change Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Review">In Review</SelectItem>
                        <SelectItem value="Resolved">Resolved</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleDisputeUpdate} disabled={isUpdating || !replyMessage.trim()} size="sm">
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Dispute
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No dispute reported for this order.</p>
              )}
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="pt-4 flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-sm">Status:</span>
            <Badge className={cn("text-white", getStatusColor(currentStatus))}>{currentStatus}</Badge>
          </div>
          <div className="flex gap-2">
            <Select value={currentStatus} onValueChange={(value: OrderStatusType) => handleStatusUpdate(value)} disabled={isUpdating}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Change Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};