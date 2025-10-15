import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Package, CheckCircle, Truck, Home, XCircle, Loader2, ArrowLeft, User, Mail, Calendar, Banknote, Handshake, MessageSquareWarning, Hash, CreditCard, Eye, Box } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useStorefront } from "@/contexts/StorefrontContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { formatCurrency } from "@/lib/formatters";
import { Separator } from "@/components/ui/separator";
import { MediaItem } from "@/components/MediaItem";
import { StorefrontOrderDetailModal } from "@/components/storefront/StorefrontOrderDetailModal";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

interface OrderDetails {
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
  order_items: OrderItem[];
  shipping_address?: string;
  shipping_city?: string;
  shipping_zip?: string;
  shipping_country?: string;
  order_notes?: string;
}

const LOCAL_STORAGE_EMAIL_KEY = 'storefront_customer_email';

const getStatusColorClass = (status: OrderStatusType) => {
  switch (status) {
    case "Fulfilled": return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "Given to Courier": return "bg-blue-100 text-blue-800 border-blue-300";
    case "Order Packaged": return "bg-blue-100 text-blue-800 border-blue-300";
    case "Order Seen": return "bg-amber-100 text-amber-800 border-amber-300";
    case "Pending": return "bg-amber-100 text-amber-800 border-amber-300";
    case "Problematic": return "bg-destructive/10 text-destructive border-destructive/30";
    case "Cancelled": return "bg-gray-100 text-gray-800 border-gray-300";
    default: return "bg-gray-100 text-gray-800 border-gray-300";
  }
};

const getStatusIcon = (status: OrderStatusType) => {
  switch (status) {
    case "Fulfilled": return <CheckCircle className="h-4 w-4" />;
    case "Given to Courier": return <Truck className="h-4 w-4" />;
    case "Order Packaged": return <Box className="h-4 w-4" />;
    case "Order Seen": return <Eye className="h-4 w-4" />;
    case "Pending": return <Package className="h-4 w-4" />;
    case "Problematic": return <XCircle className="h-4 w-4" />;
    case "Cancelled": return <XCircle className="h-4 w-4" />;
    default: return <Package className="h-4 w-4" />;
  }
};

const StorefrontClientOrders = () => {
  const { shopDetails: contextShopDetails, appearanceSettings, convertCurrency } = useStorefront();
  const { shopSlug: urlShopSlug } = useParams<{ shopSlug: string }>();
  const [searchParams] = useSearchParams();
  const [customerEmailInput, setCustomerEmailInput] = useState(() => {
    return searchParams.get('email') || localStorage.getItem(LOCAL_STORAGE_EMAIL_KEY) || "";
  });
  const [orderIdInput, setOrderIdInput] = useState(searchParams.get('orderId') || "");
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatusType | 'All'>('All');

  const blurEnabled = appearanceSettings?.blurEnabled;

  const fetchOrders = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    setOrders([]);
    setSearchAttempted(true);

    if (!customerEmailInput) {
      showError("Please enter your email address.");
      setIsLoading(false);
      return;
    }
    if (!urlShopSlug) {
      showError("Shop URL is invalid. Cannot fetch orders.");
      setIsLoading(false);
      return;
    }

    try {
      const { data: shopData, error: shopError } = await supabase
        .from('shop_details')
        .select('business_id')
        .eq('slug', urlShopSlug)
        .single();

      if (shopError || !shopData) {
        throw new Error("Shop not found or inaccessible.");
      }
      const businessId = shopData.business_id;

      let query = supabase
        .from('orders')
        .select(`
          id,
          customer_name,
          customer_email,
          status,
          total_amount,
          created_at,
          updated_at,
          currency,
          payment_method,
          payment_status,
          shipping_address,
          shipping_city,
          shipping_state,
          shipping_zip,
          shipping_country,
          order_notes,
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
        .eq('customer_email', customerEmailInput)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (orderIdInput) {
        query = query.eq('id', orderIdInput);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching orders:", error);
        setOrders([]);
      } else if (data) {
        setOrders(data as OrderDetails[]);
        if (orderIdInput && data.length > 0) {
          setSelectedOrder(data[0] as OrderDetails);
          setIsOrderDetailModalOpen(true);
        }
        localStorage.setItem(LOCAL_STORAGE_EMAIL_KEY, customerEmailInput);
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
  }, [customerEmailInput, orderIdInput, urlShopSlug]);

  useEffect(() => {
    if (customerEmailInput && (orderIdInput || searchParams.get('email')) && urlShopSlug) {
      fetchOrders();
    }
  }, [customerEmailInput, orderIdInput, fetchOrders, searchParams, urlShopSlug]);

  const handleOrderUpdate = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'All') {
      return orders;
    }
    return orders.filter(order => order.status === statusFilter);
  }, [orders, statusFilter]);

  return (
    <div className="container py-6 md:py-8">
      {selectedOrder && (
        <StorefrontOrderDetailModal
          isOpen={isOrderDetailModalOpen}
          onClose={() => setIsOrderDetailModalOpen(false)}
          order={selectedOrder}
          onOrderUpdate={handleOrderUpdate}
        />
      )}

      <Button variant="ghost" asChild className="mb-4 md:mb-6 text-muted-foreground hover:text-foreground text-sm md:text-base">
        <Link to={`/shop/${urlShopSlug}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shop
        </Link>
      </Button>
      <h1 className="text-2xl md:text-3xl font-bold font-heading mb-4 md:mb-6 text-center">My Orders</h1>

      <Card className={cn(
        "max-w-4xl mx-auto shadow-lg",
        blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card"
      )}>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" />
            View Your Orders
          </CardTitle>
          <CardDescription className="text-sm md:text-base">Enter your email address to see all orders associated with it.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={fetchOrders} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerEmail" className="text-sm">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="customerEmail"
                  type="email"
                  placeholder="your.email@example.com"
                  value={customerEmailInput}
                  onChange={(e) => setCustomerEmailInput(e.target.value)}
                  required
                  className="pl-10 text-sm md:text-base"
                />
              </div>
            </div>
            {orderIdInput && (
              <div className="space-y-2">
                <Label htmlFor="orderId" className="text-sm">Specific Order ID (Optional)</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="orderId"
                    placeholder="e.g., 12345"
                    value={orderIdInput}
                    onChange={(e) => setOrderIdInput(e.target.value)}
                    className="pl-10 text-sm md:text-base"
                  />
                </div>
              </div>
            )}
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
            filteredOrders.length > 0 ? (
              <div className="mt-6 md:mt-8 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg md:text-xl font-semibold">Your Orders ({filteredOrders.length})</h2>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatusType | 'All')}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Statuses</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Order Seen">Order Seen</SelectItem>
                      <SelectItem value="Order Packaged">Order Packaged</SelectItem>
                      <SelectItem value="Given to Courier">Given to Courier</SelectItem>
                      <SelectItem value="Fulfilled">Fulfilled</SelectItem>
                      <SelectItem value="Problematic">Problematic</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Status Change</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map(order => (
                      <TableRow key={order.id} onClick={() => { setSelectedOrder(order); setIsOrderDetailModalOpen(true); }} className="cursor-pointer hover:bg-accent">
                        <TableCell className="font-medium">#{order.id.substring(0, 8)}</TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("font-normal", getStatusColorClass(order.status))}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{order.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(order.updated_at).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(convertCurrency(order.total_amount, order.currency, contextShopDetails.currency), contextShopDetails.currency)}
                          {order.currency !== contextShopDetails.currency && (
                            <div className="text-xs font-normal text-muted-foreground">
                              (~{formatCurrency(order.total_amount, order.currency)})
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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