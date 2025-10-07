import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Package, CheckCircle, Truck, Home, XCircle, Loader2, ArrowLeft, User, Mail, Calendar, Banknote, Handshake } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useStorefront } from "@/contexts/StorefrontContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { formatCurrency } from "@/lib/formatters";
import { Separator } from "@/components/ui/separator";
import { MediaItem } from "@/components/MediaItem";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OrderStatusType = 'Pending' | 'Order Seen' | 'Order Packaged' | 'Given to Courier' | 'Fulfilled' | 'Problematic' | 'Not Found' | null;

interface OrderItem {
  quantity: number;
  price_at_purchase: number;
  products: {
    name: string;
    media_url: string;
    currency: string;
  };
}

interface OrderDetails {
  id: string;
  customer_name: string;
  customer_email: string;
  status: OrderStatusType;
  total_amount: number;
  created_at: string;
  currency: string;
  order_items: OrderItem[];
}

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  customerEmail: string;
  onIssueReported: () => void;
}

const ReportIssueModal = ({ isOpen, onClose, orderId, customerEmail, onIssueReported }: ReportIssueModalProps) => {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!reason) {
      showError("Please select a reason for the issue.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from('order_disputes').insert({
        order_id: orderId,
        customer_email: customerEmail,
        reason,
        message,
        status: 'Open',
      });

      if (error) throw error;

      showSuccess("Issue reported successfully! We will get back to you soon.");
      onIssueReported();
      onClose();
    } catch (err: any) {
      console.error("Failed to report issue:", err);
      showError(`Failed to report issue: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report an Issue with Order #{orderId.substring(0, 8)}</DialogTitle>
          <DialogDescription>
            Please tell us what went wrong with your order. We'll review it and get back to you.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Issue</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Delivery Late">Delivery Late</SelectItem>
                <SelectItem value="Product Missing">Product Missing</SelectItem>
                <SelectItem value="Product Damaged">Product Damaged</SelectItem>
                <SelectItem value="Incorrect Product">Incorrect Product</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Your Message (Optional)</Label>
            <Textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Provide more details about the issue..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !reason}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const StorefrontOrderTracking = () => {
  const { shopSlug, appearanceSettings } = useStorefront();
  const [searchParams] = useSearchParams();
  const [orderIdInput, setOrderIdInput] = useState(searchParams.get('orderId') || "");
  const [customerEmailInput, setCustomerEmailInput] = useState(searchParams.get('email') || "");
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [isReportIssueModalOpen, setIsReportIssueModalOpen] = useState(false);
  const blurEnabled = appearanceSettings?.blurEnabled;

  useEffect(() => {
    if (orderIdInput && customerEmailInput) {
      handleTrackOrder();
    }
  }, []); // Run once if orderId and email are pre-filled

  const handleTrackOrder = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    setOrder(null);
    setSearchAttempted(true);

    if (!orderIdInput || !customerEmailInput) {
      showError("Please enter both Order ID and Email Address.");
      setIsLoading(false);
      return;
    }

    try {
      const { data: shopData, error: shopError } = await supabase
        .from('shop_details')
        .select('business_id')
        .eq('slug', shopSlug)
        .single();

      if (shopError || !shopData) {
        throw new Error("Shop not found or inaccessible.");
      }
      const businessId = shopData.business_id;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          customer_name,
          customer_email,
          status,
          total_amount,
          created_at,
          currency,
          order_items (
            quantity,
            price_at_purchase,
            products (
              name,
              media_url,
              currency
            )
          )
        `)
        .eq('id', orderIdInput)
        .eq('customer_email', customerEmailInput)
        .eq('business_id', businessId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching order:", error);
        setOrder(null); // Explicitly set to null if error
      } else if (data) {
        setOrder(data as OrderDetails);
      } else {
        setOrder(null); // Explicitly set to null if no data
      }
    } catch (err: any) {
      console.error("Order tracking failed:", err);
      showError(`Order tracking failed: ${err.message || "An unexpected error occurred."}`);
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!order) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('orders').update({ status: 'Fulfilled' }).eq('id', order.id);
      if (error) throw error;
      showSuccess("Order receipt confirmed! Thank you.");
      setOrder(prev => prev ? { ...prev, status: 'Fulfilled' } : null);
    } catch (err: any) {
      console.error("Failed to confirm receipt:", err);
      showError(`Failed to confirm receipt: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: OrderStatusType) => {
    switch (status) {
      case "Fulfilled": return <CheckCircle className="h-12 w-12 md:h-16 md:w-16 text-emerald-500 mx-auto" />;
      case "Given to Courier": return <Truck className="h-12 w-12 md:h-16 md:w-16 text-blue-500 mx-auto" />;
      case "Order Packaged": return <Package className="h-12 w-12 md:h-16 md:w-16 text-blue-500 mx-auto" />;
      case "Order Seen": return <Search className="h-12 w-12 md:h-16 md:w-16 text-amber-500 mx-auto" />;
      case "Pending": return <Package className="h-12 w-12 md:h-16 md:w-16 text-amber-500 mx-auto" />;
      case "Problematic": return <XCircle className="h-12 w-12 md:h-16 md:w-16 text-destructive mx-auto" />;
      default: return <Search className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto" />;
    }
  };

  const getStatusColorClass = (status: OrderStatusType) => {
    switch (status) {
      case "Fulfilled": return "text-emerald-500";
      case "Given to Courier": return "text-blue-500";
      case "Order Packaged": return "text-blue-500";
      case "Order Seen": return "text-amber-500";
      case "Pending": return "text-amber-500";
      case "Problematic": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="container py-6 md:py-8">
      {order && isReportIssueModalOpen && (
        <ReportIssueModal
          isOpen={isReportIssueModalOpen}
          onClose={() => setIsReportIssueModalOpen(false)}
          orderId={order.id}
          customerEmail={order.customer_email}
          onIssueReported={() => { /* Maybe refetch order details or just close */ }}
        />
      )}

      <Button variant="ghost" asChild className="mb-4 md:mb-6 text-muted-foreground hover:text-foreground text-sm md:text-base">
        <Link to={`/shop/${shopSlug}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shop
        </Link>
      </Button>
      <h1 className="text-2xl md:text-3xl font-bold font-heading mb-4 md:mb-6 text-center">Track Your Order</h1>

      <Card className={cn(
        "max-w-lg mx-auto shadow-lg",
        blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
      )}>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">Find Your Order</CardTitle>
          <CardDescription className="text-sm md:text-base">Enter your order ID and email to check its status.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTrackOrder} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orderId" className="text-sm">Order ID</Label>
              <Input
                id="orderId"
                placeholder="e.g., 12345"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                required
                className="text-sm md:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail" className="text-sm">Email Address</Label>
              <Input
                id="customerEmail"
                type="email"
                placeholder="your.email@example.com"
                value={customerEmailInput}
                onChange={(e) => setCustomerEmailInput(e.target.value)}
                required
                className="text-sm md:text-base"
              />
            </div>
            <Button type="submit" className="w-full text-sm md:text-base" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Tracking...
                </>
              ) : "Track Order"}
            </Button>
          </form>

          {searchAttempted && !isLoading && (
            order ? (
              <div className="mt-6 md:mt-8 p-4 md:p-6 border rounded-lg bg-muted/50 text-center space-y-3 md:space-y-4">
                {getStatusIcon(order.status)}
                <h3 className={cn("text-lg md:text-xl font-semibold", getStatusColorClass(order.status))}>
                  Order Status: {order.status}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Your order <span className="font-medium">#{order.id.substring(0, 8)}</span> is currently{" "}
                  <span className="font-medium lowercase">{order.status}</span>.
                </p>
                
                <Separator className="my-4 md:my-6" />

                <div className="text-left space-y-3 md:space-y-4">
                  <h4 className="text-base md:text-lg font-semibold flex items-center gap-2"><User className="h-4 w-4 md:h-5 md:w-5" /> Customer Details</h4>
                  <p className="text-sm"><span className="font-medium">Name:</span> {order.customer_name}</p>
                  <p className="text-sm"><span className="font-medium">Email:</span> {order.customer_email}</p>
                  <p className="text-sm"><span className="font-medium">Order Date:</span> {new Date(order.created_at).toLocaleDateString()}</p>
                  <p className="text-sm"><span className="font-medium">Total Amount:</span> {formatCurrency(order.total_amount, order.currency)}</p>
                </div>

                <Separator className="my-4 md:my-6" />

                <div className="text-left space-y-3 md:space-y-4">
                  <h4 className="text-base md:text-lg font-semibold flex items-center gap-2"><Package className="h-4 w-4 md:h-5 md:w-5" /> Items Ordered</h4>
                  <div className="space-y-3">
                    {order.order_items.map((item, index) => (
                      <div key={index} className="flex items-center gap-4 border-b pb-3 last:border-b-0 last:pb-0">
                        <img src={item.products.media_url} alt={item.products.name} className="h-14 w-14 md:h-16 md:w-16 rounded-md object-cover bg-muted" />
                        <div className="flex-1">
                          <p className="font-medium text-sm md:text-base">{item.products.name}</p>
                          <p className="text-xs md:text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium text-sm md:text-base">{formatCurrency(item.price_at_purchase * item.quantity, item.products.currency)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {(order.status === 'Given to Courier' || order.status === 'Problematic') && (
                  <div className="flex flex-col sm:flex-row gap-3 mt-6 md:mt-8">
                    {order.status === 'Given to Courier' && (
                      <Button onClick={handleConfirmReceipt} disabled={isLoading} className="flex-1 text-sm md:text-base">
                        <Handshake className="mr-2 h-4 w-4" />
                        Confirm Receipt
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setIsReportIssueModalOpen(true)} className="flex-1 text-sm md:text-base">
                      <XCircle className="mr-2 h-4 w-4" />
                      Report an Issue
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6 md:mt-8 p-4 md:p-6 border rounded-lg bg-destructive/10 text-center space-y-3 md:space-y-4">
                {getStatusIcon("Not Found")}
                <h3 className={cn("text-lg md:text-xl font-semibold", getStatusColorClass("Not Found"))}>
                  Order Not Found
                </h3>
                <p className="text-sm md:text-base text-muted-foreground">Please double-check your Order ID and email address.</p>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StorefrontOrderTracking;