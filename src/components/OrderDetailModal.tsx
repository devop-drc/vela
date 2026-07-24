import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui-app/StatusBadge";
import { orderStatusTone, paymentStatusTone, type StatusTone } from "@/lib/status";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Package, User, Mail, Calendar, Banknote, CheckCircle, Truck, Box, Eye, XCircle, CreditCard, MessageSquareWarning, Hash, Reply, MapPin, StickyNote } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "./ui/skeleton";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label"; // Import Label
import { Textarea } from "./ui/textarea"; // Import Textarea
import { useTranslation } from "react-i18next";

type OrderStatusType = 'Pending' | 'Order Seen' | 'Order Packaged' | 'Given to Courier' | 'Fulfilled' | 'Problematic' | 'Cancelled';

interface OrderItem {
  quantity: number;
  price_at_purchase: number;
  products: {
    name: string;
    media_url: string;
  } | null;
}

/** Product thumbnail with a graceful placeholder for missing/broken images. */
const ProductThumb = ({ src, alt }: { src?: string | null; alt?: string }) => {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Package className="h-6 w-6" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt || ""}
      onError={() => setErrored(true)}
      className="h-16 w-16 shrink-0 rounded-md bg-muted object-cover"
    />
  );
};

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
  const { t } = useTranslation();
  const { shopDetails, convertCurrency } = useShop();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<OrderStatusType>('Pending');
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [isLoadingDispute, setIsLoadingDispute] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [disputeStatus, setDisputeStatus] = useState<Dispute['status']>('Open');
  const [pendingCancel, setPendingCancel] = useState(false);

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
          showError(t('order_detail.fetch_items_failed'));
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

  // Cancelling restores inventory and can't be undone — confirm first, matching
  // the inline table dropdown's guard so both entry points behave identically.
  const handleStatusSelect = (newStatus: OrderStatusType) => {
    if (newStatus === currentStatus) return;
    if (newStatus === 'Cancelled') {
      setPendingCancel(true);
      return;
    }
    handleStatusUpdate(newStatus);
  };

  const handleStatusUpdate = async (newStatus: OrderStatusType) => {
    if (!order) return;
    setIsUpdating(true);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', order.id);

    if (error) {
      showError(t('order_detail.update_status_failed', { message: error.message }));
    } else {
      showSuccess(t('order_detail.marked_as', { status: t('status_labels.' + newStatus.toLowerCase().replace(/\s+/g, '_'), { defaultValue: newStatus }) }));
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

      showSuccess(t('order_detail.dispute_updated'));
      setDispute(prev => prev ? { ...prev, reply_message: replyMessage, status: disputeStatus } : null);
      onUpdate();
    } catch (err: any) {
      console.error("Failed to update dispute:", err);
      showError(t('order_detail.dispute_update_failed', { message: err.message || t('order_detail.unexpected_error') }));
    } finally {
      setIsUpdating(false);
    }
  };

  if (!order || !shopDetails) return null; // Ensure shopDetails is available

  const disputeStatusTone = (status: Dispute['status']): StatusTone => {
    switch (status) {
      case 'Resolved': return 'success';
      case 'In Review': return 'info';
      case 'Open': return 'warning';
      case 'Closed': return 'neutral';
      default: return 'neutral';
    }
  };

  // Displayed label for a DB enum value (order/payment/dispute statuses, payment methods).
  const statusLabel = (value: string) => t('status_labels.' + value.toLowerCase().replace(/\s+/g, '_'), { defaultValue: value });

  const statusOptions = [
    { value: 'Pending', label: statusLabel('Pending'), icon: Package },
    { value: 'Order Seen', label: statusLabel('Order Seen'), icon: Eye },
    { value: 'Order Packaged', label: statusLabel('Order Packaged'), icon: Box },
    { value: 'Given to Courier', label: statusLabel('Given to Courier'), icon: Truck },
    { value: 'Fulfilled', label: statusLabel('Fulfilled'), icon: CheckCircle },
    { value: 'Problematic', label: statusLabel('Problematic'), icon: MessageSquareWarning },
    { value: 'Cancelled', label: statusLabel('Cancelled'), icon: XCircle },
  ];

  // Enable the dispute action when EITHER the reply text or the status changed,
  // so a seller can advance a dispute without being forced to type a reply.
  const disputeDirty =
    !!dispute &&
    (replyMessage !== (dispute.reply_message || '') || disputeStatus !== dispute.status);

  // Formatted shipping block — omit empty fields instead of "N/A" rows.
  const cityLine = [order.shipping_city, order.shipping_state, order.shipping_zip]
    .filter((p) => p && String(p).trim())
    .join(', ');
  const shippingLines = [order.shipping_address, cityLine, order.shipping_country].filter(
    (l) => l && String(l).trim(),
  );

  // Order money summary.
  const itemsSubtotal = items.reduce(
    (sum, it) => sum + convertCurrency(it.price_at_purchase * it.quantity, 'ALL', shopDetails.currency),
    0,
  );
  const orderTotal = convertCurrency(order.total_amount, order.currency, shopDetails.currency);

  return (
    <>
      <AlertDialog open={pendingCancel} onOpenChange={setPendingCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('order_detail.cancel_order_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('order_detail.cancel_order_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('order_detail.keep_order')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setPendingCancel(false); handleStatusUpdate('Cancelled'); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('order_detail.cancel_order')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('order_detail.order_number', { id: order.id.substring(0, 8) })}</DialogTitle>
          <DialogDescription>
            {t('order_detail.placed_on', { date: new Date(order.created_at).toLocaleDateString() })}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60dvh] pr-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><User className="h-4 w-4" /> {t('order_detail.customer')}</div><p>{order.customer_name}</p></div>
              <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" /> {t('order_detail.email')}</div><p>{order.customer_email}</p></div>
              <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" /> {t('order_detail.date')}</div><p>{new Date(order.created_at).toLocaleString()}</p></div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Banknote className="h-4 w-4" /> {t('order_detail.total')}</div>
                <p className="text-lg font-bold leading-tight text-foreground">
                  {/* Convert order.total_amount from its stored currency (order.currency) to shopDetails.currency */}
                  {formatCurrency(orderTotal, shopDetails.currency)}
                  {order.currency !== shopDetails.currency && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      (~{formatCurrency(order.total_amount, order.currency)})
                    </span>
                  )}
                </p>
              </div>
              <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><CreditCard className="h-4 w-4" /> {t('order_detail.payment_method')}</div><p className="capitalize">{t('status_labels.' + order.payment_method.toLowerCase().replace(/\s+/g, '_'), { defaultValue: order.payment_method.replace(/_/g, ' ') })}</p></div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle className="h-4 w-4" /> {t('order_detail.payment_status')}</div>
                <StatusBadge tone={paymentStatusTone(order.payment_status)} className="capitalize">{statusLabel(order.payment_status)}</StatusBadge>
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><MapPin className="h-5 w-5" /> {t('order_detail.shipping_details')}</h3>
              {shippingLines.length > 0 ? (
                <div className="rounded-md border bg-muted/50 p-3 text-sm">
                  <p className="font-medium text-foreground">{order.customer_name}</p>
                  {shippingLines.map((line, i) => (
                    <p key={i} className="text-muted-foreground">{line}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('order_detail.no_shipping_address')}</p>
              )}
              {(order.shipping_notes_seller || order.shipping_notes_courier) && (
                <div className="mt-2 space-y-2">
                  {order.shipping_notes_seller && (
                    <div className="flex items-start gap-2 rounded-md border border-info/25 bg-info/10 p-2.5 text-sm text-info">
                      <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />
                      <div><span className="font-medium">{t('order_detail.notes_for_seller')} </span><span className="text-foreground">{order.shipping_notes_seller}</span></div>
                    </div>
                  )}
                  {order.shipping_notes_courier && (
                    <div className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning/10 p-2.5 text-sm text-warning">
                      <Truck className="mt-0.5 h-4 w-4 shrink-0" />
                      <div><span className="font-medium">{t('order_detail.notes_for_courier')} </span><span className="text-foreground">{order.shipping_notes_courier}</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Package className="h-5 w-5" /> {t('order_detail.items_ordered')}</h3>
              {isLoadingItems ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-16 w-16 rounded-md" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <ProductThumb src={item.products?.media_url} alt={item.products?.name} />
                      <div className="flex-1">
                        <p className="font-medium">{item.products?.name || t('order_detail.deleted_product')}</p>
                        <p className="text-sm text-muted-foreground">{t('order_detail.qty', { count: item.quantity })}</p>
                      </div>
                      <p className="font-medium">
                        {/* Convert item.price_at_purchase from its stored currency ('ALL') to shopDetails.currency */}
                        {formatCurrency(convertCurrency(item.price_at_purchase * item.quantity, 'ALL', shopDetails.currency), shopDetails.currency)}
                      </p>
                    </div>
                  ))}
                  {items.length > 0 && (
                    <div className="space-y-1 border-t pt-3 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t('order_detail.subtotal')}</span>
                        <span>{formatCurrency(itemsSubtotal, shopDetails.currency)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-foreground">
                        <span>{t('order_detail.total')}</span>
                        <span>{formatCurrency(orderTotal, shopDetails.currency)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2"><MessageSquareWarning className="h-5 w-5" /> {t('order_detail.client_dispute')}</h3>
              {isLoadingDispute ? <Spinner /> : dispute ? (
                <div className="space-y-3 p-3 border rounded-md bg-muted/50">
                  <div className="flex items-center justify-between">
                    <p className="font-medium flex items-center gap-2"><Hash className="h-4 w-4" /> {t('order_detail.dispute_id')} {dispute.id.substring(0, 8)}</p>
                    <StatusBadge tone={disputeStatusTone(dispute.status)}>{statusLabel(dispute.status)}</StatusBadge>
                  </div>
                  <p className="text-sm"><span className="font-medium">{t('order_detail.reason')}</span> {dispute.reason}</p>
                  {dispute.message && <p className="text-sm"><span className="font-medium">{t('order_detail.customer_message')}</span> {dispute.message}</p>}
                  <div className="space-y-2 mt-3">
                    <Label htmlFor="replyMessage" className="flex items-center gap-2 text-sm"><Reply className="h-4 w-4" /> {t('order_detail.your_reply')}</Label>
                    <Textarea id="replyMessage" rows={3} value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder={t('order_detail.reply_placeholder')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="disputeStatus">{t('order_detail.dispute_status')}</Label>
                    <Select value={disputeStatus} onValueChange={(value: Dispute['status']) => setDisputeStatus(value)}>
                      <SelectTrigger id="disputeStatus">
                        <SelectValue placeholder={t('order_detail.change_status')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">{statusLabel('Open')}</SelectItem>
                        <SelectItem value="In Review">{statusLabel('In Review')}</SelectItem>
                        <SelectItem value="Resolved">{statusLabel('Resolved')}</SelectItem>
                        <SelectItem value="Closed">{statusLabel('Closed')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleDisputeUpdate} disabled={isUpdating || !disputeDirty} size="sm">
                    {isUpdating && <Spinner className="mr-2 h-4 w-4" />}
                    {t('order_detail.update_dispute')}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('order_detail.no_dispute')}</p>
              )}
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="pt-4 flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-sm">{t('order_detail.status')}</span>
            <StatusBadge tone={orderStatusTone(currentStatus)}>{statusLabel(currentStatus)}</StatusBadge>
          </div>
          <div className="flex gap-2">
            <Select value={currentStatus} onValueChange={(value: OrderStatusType) => handleStatusSelect(value)} disabled={isUpdating}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('order_detail.change_status')} />
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
            <Button variant="ghost" onClick={onClose}>{t('common.close')}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};