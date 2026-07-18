"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Loader2, Package, User, Mail, Calendar, Banknote, CheckCircle, Truck, Box, Eye, XCircle, CreditCard, MessageSquareWarning, Hash, Reply, Handshake, MapPin, StickyNote, Star } from "lucide-react";
import { LeaveReviewDialog } from "./ProductReviews";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { useStorefront } from "@/contexts/StorefrontContext";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { MediaItem } from "../MediaItem";
import { InstagramReportIssueModal } from "./InstagramReportIssueModal"; // Use InstagramReportIssueModal
import { Textarea } from "../ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type OrderStatusType = 'Pending' | 'Order Seen' | 'Order Packaged' | 'Given to Courier' | 'Fulfilled' | 'Problematic' | 'Cancelled';

interface OrderItem {
  product_id?: string;
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
  const [reviewedProductIds, setReviewedProductIds] = useState<Set<string>>(new Set());
  const [reviewTarget, setReviewTarget] = useState<{ productId: string; productName: string } | null>(null);

  useEffect(() => {
    if (order) {
      const fetchOrderData = async () => {
        setIsLoadingItems(true);
        setIsLoadingDispute(true);
        // Prefer items provided by the public edge function to avoid RLS issues
        if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
          setItems(order.order_items as any);
        } else {
          const { data: itemsData, error: itemsError } = await supabase
            .from('order_items')
            .select(`
              product_id,
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
        }
        setIsLoadingItems(false);

        // Which products in this order has the customer already reviewed?
        const { data: reviewRows } = await supabase
          .from('product_reviews')
          .select('product_id')
          .eq('order_id', order.id);
        setReviewedProductIds(new Set((reviewRows || []).map((r: any) => r.product_id)));

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

      {reviewTarget && (
        <LeaveReviewDialog
          isOpen={!!reviewTarget}
          onClose={() => setReviewTarget(null)}
          orderId={order.id}
          productId={reviewTarget.productId}
          productName={reviewTarget.productName}
          customerEmail={order.customer_email}
          onSubmitted={(pid) => setReviewedProductIds(prev => new Set(prev).add(pid))}
        />
      )}

      <AlertDialog open={isConfirmReceiptAlertOpen} onOpenChange={setIsConfirmReceiptAlertOpen}>
        <AlertDialogContent className="bg-background text-foreground rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">Confirm Order Receipt?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              By confirming receipt, you are marking this order as **Fulfilled**. This action cannot be reversed.
              Please ensure you have received all items in good condition.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingOrder} className="text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReceipt} disabled={isUpdatingOrder} className="bg-red-500 hover:bg-red-600 text-white">
              {isUpdatingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Receipt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isMarkCompletedAlertOpen} onOpenChange={setIsMarkCompletedAlertOpen}>
        <AlertDialogContent className="bg-background text-foreground rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">Confirm you received this order?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              This confirms you've received your order and paid on delivery. Once confirmed, you'll be able to leave a review. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingOrder} className="text-foreground hover:bg-muted">Not yet</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkCompletedAndPaid} disabled={isUpdatingOrder} className="bg-green-600 hover:bg-green-700 text-white">
              {isUpdatingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, I received it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCancelOrderAlertOpen} onOpenChange={setIsCancelOrderAlertOpen}>
        <AlertDialogContent className="bg-background text-foreground rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">Are you sure you want to cancel this order?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              This action cannot be undone. Your order will be marked as **Cancelled**, and if applicable, product inventory will be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingOrder} className="text-foreground hover:bg-muted">No, keep order</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelOrder} disabled={isUpdatingOrder} className="bg-red-500 hover:bg-red-600 text-white">
              {isUpdatingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="flex h-[90dvh] max-w-2xl flex-col rounded-2xl bg-background text-foreground" aria-describedby="instagram-order-detail-description">
          <DialogHeader className="p-4 border-b border-border pb-4 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
              {getStatusIcon(order.status)}
              Order #{order.id.substring(0, 8)}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Details for your order placed on {formatDate(order.created_at)}.
            </DialogDescription>
          </DialogHeader>
          <span id="instagram-order-detail-description" className="sr-only">
            This modal displays the details of your order, including customer information, shipping details, items ordered, and any reported issues.
          </span>
          <ScrollArea className="flex-1 pr-4 md:pr-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 text-sm md:text-base"><div className="flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4 text-[hsl(var(--primary))]" /> Customer</div><p className="text-foreground">{order.customer_name}</p></div>
                <div className="space-y-2 text-sm md:text-base"><div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4 text-[hsl(var(--primary))]" /> Email</div><p className="text-foreground">{order.customer_email}</p></div>
                <div className="space-y-2 text-sm md:text-base"><div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4 text-[hsl(var(--primary))]" /> Date</div><p className="text-foreground">{formatDateTime(order.created_at)}</p></div>
                <div className="space-y-2 text-sm md:text-base">
                  <div className="flex items-center gap-2 text-muted-foreground"><Banknote className="h-4 w-4 text-[hsl(var(--primary))]" /> Total</div>
                  <p className="font-semibold text-foreground">
                    {formatCurrency(convertCurrency(order.total_amount, order.currency), shopDetails?.currency)}
                  </p>
                </div>
                <div className="space-y-2 text-sm md:text-base"><div className="flex items-center gap-2 text-muted-foreground"><CreditCard className="h-4 w-4 text-[hsl(var(--primary))]" /> Payment Method</div><p className="capitalize text-foreground">{order.payment_method.replace(/_/g, ' ')}</p></div>
                <div className="space-y-2 text-sm md:text-base"><div className="flex items-center gap-2 text-muted-foreground"><CheckCircle className="h-4 w-4 text-[hsl(var(--primary))]" /> Payment Status</div><p className="capitalize text-foreground">{order.payment_status}</p></div>
              </div>
              <Separator className="bg-border" />
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground text-base md:text-lg"><MapPin className="h-5 w-5 text-[hsl(var(--primary))]" /> Shipping Details</h3>
                <div className="space-y-2 rounded-xl border border-border bg-muted/60 p-3.5 text-sm text-muted-foreground">
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
              <Separator className="bg-border" />
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground text-base md:text-lg"><Package className="h-5 w-5 text-[hsl(var(--primary))]" /> Items Ordered</h3>
                {isLoadingItems ? <Loader2 className="animate-spin text-muted-foreground" /> : (
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 p-3">
                        <MediaItem src={item.products.media_url} alt={item.products.name} className="h-16 w-16 flex-shrink-0 rounded-lg bg-muted object-cover" />
                        <div className="flex-1 w-full"> {/* Ensure text wraps */}
                          <p className="font-medium text-foreground text-sm md:text-base">{item.products.name}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                          {/* Reviews allowed only after the order is received/paid (Fulfilled). */}
                          {order.status === 'Fulfilled' && item.product_id && (
                            reviewedProductIds.has(item.product_id) ? (
                              <span className="inline-flex items-center gap-1 mt-1 text-xs text-emerald-600 font-medium"><CheckCircle className="h-3.5 w-3.5" /> Reviewed</span>
                            ) : (
                              <Button type="button" variant="outline" size="sm" className="h-7 mt-1.5 text-xs" onClick={() => setReviewTarget({ productId: item.product_id!, productName: item.products.name })}>
                                <Star className="h-3.5 w-3.5 mr-1.5 text-amber-400" /> Leave a review
                              </Button>
                            )
                          )}
                        </div>
                        <p className="font-medium text-foreground text-sm md:text-base flex-shrink-0">
                          {formatCurrency(convertCurrency(item.price_at_purchase * item.quantity, 'ALL', shopDetails?.currency), shopDetails?.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Separator className="bg-border" />
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground text-base md:text-lg"><MessageSquareWarning className="h-5 w-5 text-[hsl(var(--primary))]" /> Issue Report</h3>
                {isLoadingDispute ? <Loader2 className="animate-spin text-muted-foreground" /> : dispute ? (
                  <div className="space-y-3 rounded-xl border border-border bg-muted/60 p-3.5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"> {/* Responsive flex */}
                      <p className="font-medium flex items-center gap-2 text-foreground text-sm md:text-base"><Hash className="h-4 w-4" /> Dispute ID: {dispute.id.substring(0, 8)}</p>
                      <Badge className={cn("text-white text-xs md:text-sm", getStatusColor(dispute.status))}>{dispute.status}</Badge>
                    </div>
                    <p className="text-sm text-foreground"><span className="font-medium">Reason:</span> {dispute.reason}</p>
                    {dispute.message && <p className="text-sm text-foreground"><span className="font-medium">Customer's Message:</span> {dispute.message}</p>}
                    {dispute.reply_message && (
                      <div className="space-y-2 mt-3">
                        <Label className="flex items-center gap-2 text-sm text-foreground"><Reply className="h-4 w-4" /> Seller's Reply</Label>
                        <Textarea id="replyMessage" rows={3} value={dispute.reply_message} readOnly className="pl-3 pt-3 h-auto min-h-[80px] px-3 py-2 border-border bg-background text-foreground text-sm md:text-base" /> {/* Adjusted padding */}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No dispute reported for this order.</p>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t border-border flex-col sm:flex-row sm:justify-end sm:items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-2 mr-auto sm:mr-0">
              <span className="text-sm text-foreground">Status:</span>
              <Badge className={cn("text-white text-sm md:text-base", getStatusColor(order.status))}>{order.status}</Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {order.payment_method === 'cash_on_delivery' && order.status !== 'Fulfilled' && order.status !== 'Cancelled' && (
                <Button onClick={() => setIsMarkCompletedAlertOpen(true)} disabled={isUpdatingOrder} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto text-sm md:text-base">
                  {isUpdatingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm order received
                </Button>
              )}
              {order.payment_method === 'card' && order.status === 'Given to Courier' && (
                <Button onClick={() => setIsConfirmReceiptAlertOpen(true)} disabled={isUpdatingOrder} className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto text-sm md:text-base">
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
                <Button variant="outline" onClick={() => setIsReportIssueModalOpen(true)} disabled={isUpdatingOrder} className="text-foreground hover:bg-muted w-full sm:w-auto text-sm md:text-base">
                  <MessageSquareWarning className="mr-2 h-4 w-4" />
                  Report Issue
                </Button>
              )}
              <Button variant="ghost" onClick={onClose} className="text-foreground hover:bg-muted w-full sm:w-auto text-sm md:text-base">Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};