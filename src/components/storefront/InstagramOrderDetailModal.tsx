"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Loader2, Package, User, Mail, Calendar, Banknote, CheckCircle, Truck, Box, Eye, XCircle, CreditCard, MessageSquareWarning, Hash, Reply, Handshake, MapPin, StickyNote } from "lucide-react";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { useStorefront } from "@/contexts/StorefrontContext";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { MediaItem } from "../MediaItem";
import { InstagramReportIssueModal } from "./InstagramReportIssueModal"; // Use InstagramReportIssueModal
import { Textarea } from "../ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  shipping_notes_seller?: string;
  shipping_notes_courier?: string;
}

interface InstagramOrderDetailModalProps {
  order: OrderDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdate: () => void;
}

export const InstagramOrderDetailModal = ({ order, isOpen, onClose, onOrderUpdate }: InstagramOrderDetailModalProps) => {
  const { shopDetails, convertCurrency } = useStorefront();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [isReportIssueModalOpen, setIsReportIssueModalOpen] = useState(false);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [isLoadingDispute, setIsLoadingDispute] = useState(false);
  const [isConfirmReceiptAlertOpen, setIsConfirmReceiptAlertOpen] = useState(false);
  const [isMarkCompletedAlertOpen, setIsMarkCompletedAlertOpen] = useState(false);
  const [isCancelOrderAlertOpen, setIsCancelOrderAlertOpen] = useState(false);

  useEffect(() => {
    if (order) {
      const fetchOrderData = async () => {
        setIsLoadingItems(true);
        setIsLoadingDispute(true);
        
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

        const { data: disputeData, error: disputeError } = await supabase
          .from('order_disputes')
          .select('*')
          .eq('order_id', order.id)
          .maybeSingle();
        
        if (disputeError && disputeError.code !== 'PGRST116') {
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
      onOrderUpdate();
      onClose();
    } catch (err: any) {
      console.error("Failed to confirm receipt:", err);
      showError(`Failed to confirm receipt: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setIsUpdatingOrder(false);
      setIsConfirmReceiptAlertOpen(false);
    }
  };

  const handleMarkCompletedAndPaid = async () => {
    if (!order) return;
    setIsUpdatingOrder(true);
    try {
      const { error } = await supabase.from('orders').update({ status: 'Fulfilled', payment_status: 'paid' }).eq('id', order.id);
      if (error) throw error;
      showSuccess("Order marked as completed and paid! Thank you.");
      onOrderUpdate();
      onClose();
    } catch (err: any) {
      console.error("Failed to mark order as completed and paid:", err);
      showError(`Failed to mark order as completed and paid: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setIsUpdatingOrder(false);
      setIsMarkCompletedAlertOpen(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !shopDetails?.slug) return;

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
      onOrderUpdate();
      onClose();
    } catch (err: any) {
      console.error("Failed to cancel order:", err);
      showError(`Failed to cancel order: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setIsUpdatingOrder(false);
      setIsCancelOrderAlertOpen(false);
    }
  };

  const getStatusColor = (status: OrderStatusType | Dispute['status']) => {
    switch (status) {
      case 'Fulfilled':
      case 'Resolved': return 'bg-green-500';
      case 'Given to Courier':
      case 'Order Packaged':
      case 'In Review': return 'bg-blue-500';
      case 'Order Seen':
      case 'Pending':
      case 'Open': return 'bg-amber-500';
      case 'Problematic': return 'bg-red-500';
      case 'Cancelled':
      case 'Closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: OrderStatusType | Dispute['status']) => {
    switch (status) {
      case "Fulfilled": return <CheckCircle className="h-5 w-5" />;
      case "Given to Courier": return <Truck className="h-5 w-5" />;
      case "Order Packaged": return <Box className="h-5 w-5" />;
      case "Order Seen": return <Eye className="h-5 w-5" />;
      case "Pending": return <Package className="h-5 w-5" />;
      case "Problematic": return <XCircle className="h-5 w-5" />;
      case "Cancelled": return <XCircle className="h-5 w-5" />;
      case "Open": return <MessageSquareWarning className="h-5 w-5" />;
      case "In Review": return <Reply className="h-5 w-5" />;
      case "Resolved": return <Handshake className="h-5 w-5" />;
      case "Closed": return <XCircle className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  if (!order) return null;

  return (
    <>
      {isReportIssueModalOpen && (
        <InstagramReportIssueModal
          isOpen={isReportIssueModalOpen}
          onClose={() => setIsReportIssueModalOpen(false)}
          orderId={order.id}
          customerEmail={order.customer_email}
          onIssueReported={() => {
            setIsReportIssueModalOpen(false);
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

      <AlertDialog open={isConfirmReceiptAlertOpen} onOpenChange={setIsConfirmReceiptAlertOpen}>
        <AlertDialogContent className="bg-white text-black rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-gray-800">Confirm Order Receipt?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              By confirming receipt, you are marking this order as **Fulfilled**. This action cannot be reversed.
              Please ensure you have received all items in good condition.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingOrder} className="text-gray-800 hover:bg-gray-100">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReceipt} disabled={isUpdatingOrder} className="bg-red-500 hover:bg-red-600 text-white">
              {isUpdatingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Receipt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isMarkCompletedAlertOpen} onOpenChange={setIsMarkCompletedAlertOpen}>
        <AlertDialogContent className="bg-white text-black rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-gray-800">Mark Order as Completed & Paid?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              By confirming, you are marking this Cash on Delivery order as **Fulfilled** and **Paid**. This action cannot be reversed.
              Please ensure payment has been collected and all items received.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingOrder} className="text-gray-800 hover:bg-gray-100">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkCompletedAndPaid} disabled={isUpdatingOrder} className="bg-red-500 hover:bg-red-600 text-white">
              {isUpdatingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark Completed & Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCancelOrderAlertOpen} onOpenChange={setIsCancelOrderAlertOpen}>
        <AlertDialogContent className="bg-white text-black rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-gray-800">Are you sure you want to cancel this order?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              This action cannot be undone. Your order will be marked as **Cancelled**, and if applicable, product inventory will be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingOrder} className="text-gray-800 hover:bg-gray-100">No, keep order</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelOrder} disabled={isUpdatingOrder} className="bg-red-500 hover:bg-red-600 text-white">
              {isUpdatingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-white text-black rounded-lg h-[90vh] flex flex-col">
          <DialogHeader className="p-4 border-b border-gray-200 pb-4 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
              {getStatusIcon(order.status)}
              Order #{order.id.substring(0, 8)}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Details for your order placed on {new Date(order.created_at).toLocaleDateString()}.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4 md:pr-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 text-sm md:text-base"><div className="flex items-center gap-2 text-gray-500"><User className="h-4 w-4 text-red-500" /> Customer</div><p className="text-gray-800">{order.customer_name}</p></div>
                <div className="space-y-2 text-sm md:text-base"><div className="flex items-center gap-2 text-gray-500"><Mail className="h-4 w-4 text-red-500" /> Email</div><p className="text-gray-800">{order.customer_email}</p></div>
                <div className="space-y-2 text-sm md:text-base"><div className="flex items-center gap-2 text-gray-500"><Calendar className="h-4 w-4 text-red-500" /> Date</div><p className="text-gray-800">{new Date(order.created_at).toLocaleString()}</p></div>
                <div className="space-y-2 text-sm md:text-base">
                  <div className="flex items-center gap-2 text-gray-500"><Banknote className="h-4 w-4 text-red-500" /> Total</div>
                  <p className="font-semibold text-gray-800">
                    {formatCurrency(order.total_amount, order.currency)}
                    {shopDetails?.currency && order.currency !== shopDetails.currency && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        (~{formatCurrency(convertCurrency(order.total_amount), shopDetails.currency)})
                      </span>
                    )}
                  </p>
                </div>
                <div className="space-y-2 text-sm md:text-base"><div className="flex items-center gap-2 text-gray-500"><CreditCard className="h-4 w-4 text-red-500" /> Payment Method</div><p className="capitalize text-gray-800">{order.payment_method.replace(/_/g, ' ')}</p></div>
                <div className="space-y-2 text-sm md:text-base"><div className="flex items-center gap-2 text-gray-500"><CheckCircle className="h-4 w-4 text-red-500" /> Payment Status</div><p className="capitalize text-gray-800">{order.payment_status}</p></div>
              </div>
              <Separator className="bg-gray-200" />
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-800 text-base md:text-lg"><MapPin className="h-5 w-5 text-red-500" /> Shipping Details</h3>
                <div className="space-y-2 text-sm text-gray-500 p-3 border rounded-md bg-gray-50">
                  <p><span className="font-medium">Address:</span> {order.shipping_address || 'N/A'}</p>
                  <p><span className="font-medium">City:</span> {order.shipping_city || 'N/A'}</p>
                  <p><span className="font-medium">State/Province:</span> {order.shipping_state || 'N/A'}</p>
                  <p><span className="font-medium">Zip/Postal Code:</span> {order.shipping_zip || 'N/A'}</p>
                  <p><span className="font-medium">Country:</span> {order.shipping_country || 'N/A'}</p>
                  {order.shipping_notes_seller && <p><span className="font-medium flex items-center gap-1"><StickyNote className="h-4 w-4" /> Notes for Seller:</span> {order.shipping_notes_seller}</p>}
                  {order.shipping_notes_courier && <p><span className="font-medium flex items-center gap-1"><Truck className="h-4 w-4" /> Notes for Courier:</span> {order.shipping_notes_courier}</p>}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Shipping address cannot be changed after an order is placed. Please contact support for urgent changes.
                </p>
              </div>
              <Separator className="bg-gray-200" />
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-800 text-base md:text-lg"><Package className="h-5 w-5 text-red-500" /> Items Ordered</h3>
                {isLoadingItems ? <Loader2 className="animate-spin text-gray-500" /> : (
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-2 border rounded-md bg-gray-50"> {/* Added responsive flex */}
                        <MediaItem src={item.products.media_url} alt={item.products.name} className="h-16 w-16 rounded-md object-cover bg-gray-100 flex-shrink-0" />
                        <div className="flex-1 w-full"> {/* Ensure text wraps */}
                          <p className="font-medium text-gray-800 text-sm md:text-base">{item.products.name}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium text-gray-800 text-sm md:text-base flex-shrink-0">
                          {formatCurrency(convertCurrency(item.price_at_purchase * item.quantity, 'ALL', shopDetails?.currency), shopDetails?.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Separator className="bg-gray-200" />
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-800 text-base md:text-lg"><MessageSquareWarning className="h-5 w-5 text-red-500" /> Issue Report</h3>
                {isLoadingDispute ? <Loader2 className="animate-spin text-gray-500" /> : dispute ? (
                  <div className="space-y-3 p-3 border rounded-md bg-gray-50">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"> {/* Responsive flex */}
                      <p className="font-medium flex items-center gap-2 text-gray-800 text-sm md:text-base"><Hash className="h-4 w-4" /> Dispute ID: {dispute.id.substring(0, 8)}</p>
                      <Badge className={cn("text-white text-xs md:text-sm", getStatusColor(dispute.status))}>{dispute.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-800"><span className="font-medium">Reason:</span> {dispute.reason}</p>
                    {dispute.message && <p className="text-sm text-gray-800"><span className="font-medium">Customer's Message:</span> {dispute.message}</p>}
                    {dispute.reply_message && (
                      <div className="space-y-2 mt-3">
                        <Label className="flex items-center gap-2 text-sm text-gray-700"><Reply className="h-4 w-4" /> Seller's Reply</Label>
                        <Textarea id="replyMessage" rows={3} value={dispute.reply_message} readOnly className="pl-3 pt-3 h-auto min-h-[80px] px-3 py-2 border-gray-300 bg-gray-100 text-gray-800 text-sm md:text-base" /> {/* Adjusted padding */}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No dispute reported for this order.</p>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t border-gray-200 flex-col sm:flex-row sm:justify-end sm:items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-2 mr-auto sm:mr-0">
              <span className="text-sm text-gray-700">Status:</span>
              <Badge className={cn("text-white text-sm md:text-base", getStatusColor(order.status))}>{order.status}</Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {order.payment_method === 'cash_on_delivery' && order.status !== 'Fulfilled' && order.status !== 'Cancelled' && (
                <Button onClick={() => setIsMarkCompletedAlertOpen(true)} disabled={isUpdatingOrder} className="bg-red-500 hover:bg-red-600 text-white w-full sm:w-auto text-sm md:text-base">
                  {isUpdatingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Completed & Paid
                </Button>
              )}
              {order.payment_method === 'card' && order.status === 'Given to Courier' && (
                <Button onClick={() => setIsConfirmReceiptAlertOpen(true)} disabled={isUpdatingOrder} className="bg-red-500 hover:bg-red-600 text-white w-full sm:w-auto text-sm md:text-base">
                  {isUpdatingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Handshake className="mr-2 h-4 w-4" />
                  Confirm Receipt
                </Button>
              )}
              {order.status === 'Pending' && (
                <Button variant="destructive" onClick={() => setIsCancelOrderAlertOpen(true)} disabled={isUpdatingOrder} className="bg-red-500 hover:bg-red-600 text-white w-full sm:w-auto text-sm md:text-base">
                  {isUpdatingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Order
                </Button>
              )}
              {!dispute && order.status !== 'Cancelled' && (
                <Button variant="outline" onClick={() => setIsReportIssueModalOpen(true)} disabled={isUpdatingOrder} className="text-gray-800 hover:bg-gray-100 w-full sm:w-auto text-sm md:text-base">
                  <MessageSquareWarning className="mr-2 h-4 w-4" />
                  Report Issue
                </Button>
              )}
              <Button variant="ghost" onClick={onClose} className="text-gray-800 hover:bg-gray-100 w-full sm:w-auto text-sm md:text-base">Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};