import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Package, CheckCircle, Truck, Home, XCircle, Loader2, ArrowLeft, User, Mail, Calendar, Banknote, Handshake } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useStorefront } from "@/contexts/StorefrontContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { formatCurrency } from "@/lib/formatters";
import { Separator } from "@/components/ui/separator";
import { MediaItem } from "@/components/MediaItem";
import { ReportIssueModal } from "@/components/storefront/ReportIssueModal"; // Import the new modal

type OrderStatusType = 'Pending' | 'Order Seen' | 'Order Packaged' | 'Given to Courier' | 'Fulfilled' | 'Problematic';

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

const StorefrontClientOrders = () => {
  const { shopSlug, appearanceSettings } = useStorefront();
  const [customerEmail, setCustomerEmail] = useState("");
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [selectedOrderForIssue, setSelectedOrderForIssue] = useState<OrderDetails | null>(null);
  const blurEnabled = appearanceSettings?.blurEnabled;

  const fetchOrders = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    setOrders([]);
    setSearchAttempted(true);

    if (!customerEmail) {
      showError("Please enter your email address.");
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
        .eq('customer_email', customerEmail)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        setOrders([]);
      } else if (data) {
        setOrders(data as OrderDetails[]);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.error("Order fetching failed:", err);
      showError(`Failed to fetch orders: ${err.message || "An unexpected error occurred."}`);
      setOrders([]);
    } finally {
      setIsLoading(false);
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
      {selectedOrderForIssue && (
        <ReportIssueModal
          isOpen={!!selectedOrderForIssue}
          onClose={() => setSelectedOrderForIssue(null)}
          orderId={selectedOrderForIssue.id}
          customerEmail={selectedOrderForIssue.customer_email}
          onIssueReported={() => { /* Optionally refetch orders */ }}
        />
      )}

      <Button variant="ghost" asChild className="mb-4 md:mb-6 text-muted-foreground hover:text-foreground text-sm md:text-base">
        <Link to={`/shop/${shopSlug}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shop
        </Link>
      </Button>
      <h1 className="text-2xl md:text-3xl font-bold font-heading mb-4 md:mb-6 text-center">My Orders</h1>

      <Card className={cn(
        "max-w-2xl mx-auto shadow-lg",
        blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
      )}>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">View Your Orders</CardTitle>
          <CardDescription className="text-sm md:text-base">Enter your email address to see all orders associated with it.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={fetchOrders} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerEmail" className="text-sm">Email Address</Label>
              <Input
                id="customerEmail"
                type="email"
                placeholder="your.email@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
                className="text-sm md:text-base"
              />
            </div>
            <Button type="submit" className="w-full text-sm md:text-base" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading Orders...
                </>
              ) : "View Orders"}
            </Button>
          </form>

          {searchAttempted && !isLoading && (
            orders.length > 0 ? (
              <div className="mt-6 md:mt-8 space-y-6">
                {orders.map(order => (
                  <Card key={order.id} className={cn(
                    "p-4 md:p-6 shadow-md",
                    blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
                  )}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-lg md:text-xl">Order #{order.id.substring(0, 8)}</h3>
                      <Badge className={cn("text-white", getStatusColorClass(order.status))}>{order.status}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <p><span className="font-medium">Date:</span> {new Date(order.created_at).toLocaleDateString()}</p>
                      <p><span className="font-medium">Total:</span> {formatCurrency(order.total_amount, order.currency)}</p>
                    </div>
                    <Separator className="my-4" />
                    <h4 className="font-semibold text-base mb-3">Items:</h4>
                    <div className="space-y-3">
                      {order.order_items.map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <img src={item.products.media_url} alt={item.products.name} className="h-12 w-12 rounded-md object-cover bg-muted" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.products.name}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-medium text-sm">{formatCurrency(item.price_at_purchase * item.quantity, item.products.currency)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                      <Link to={`/shop/${shopSlug}/order-tracking?orderId=${order.id}&email=${order.customer_email}`} className={cn(buttonVariants({ variant: "outline" }), "flex-1 text-sm md:text-base")}>
                        View Details
                      </Link>
                      <Button variant="outline" onClick={() => setSelectedOrderForIssue(order)} className="flex-1 text-sm md:text-base">
                        <XCircle className="mr-2 h-4 w-4" />
                        Report Issue
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="mt-6 md:mt-8 p-4 md:p-6 border rounded-lg bg-muted/50 text-center space-y-3 md:space-y-4">
                <Package className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto" />
                <h3 className="text-lg md:text-xl font-semibold">No Orders Found</h3>
                <p className="text-sm md:text-base text-muted-foreground">We couldn't find any orders for this email address.</p>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StorefrontClientOrders;