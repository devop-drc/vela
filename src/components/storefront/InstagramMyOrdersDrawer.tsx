"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingBag, X, Loader2, Search, Package, CheckCircle, Truck, Box, Eye, XCircle, Mail, Hash, ArrowLeft, Calendar, Banknote } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InstagramOrderDetailModal } from "./InstagramOrderDetailModal"; // Import the new order detail modal
import { useIsMobile } from "@/hooks/use-mobile";
import { getStoredCustomer, getStoredOrderIds, saveStoredCustomer } from "@/lib/instagramCustomer";

type OrderStatusType = 'Pending' | 'Order Seen' | 'Order Packaged' | 'Given to Courier' | 'Fulfilled' | 'Problematic' | 'Cancelled';

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
  order_items: any[]; // Simplified for now, full type in modal
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: string;
  order_notes?: string;
}

const LOCAL_STORAGE_EMAIL_KEY = 'instagram_shop_customer_email';

const getStatusColorClass = (status: OrderStatusType) => {
  switch (status) {
    case "Fulfilled": return "bg-green-500 text-white";
    case "Given to Courier": return "bg-blue-500 text-white";
    case "Order Packaged": return "bg-blue-500 text-white";
    case "Order Seen": return "bg-amber-500 text-white";
    case "Pending": return "bg-amber-500 text-white";
    case "Problematic": return "bg-red-500 text-white";
    case "Cancelled": return "bg-gray-500 text-white";
    default: return "bg-gray-500 text-white";
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

interface InstagramMyOrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string | null; // New prop
  onOrderOpened?: () => void; // New callback
}

export const InstagramMyOrdersDrawer = ({ isOpen, onClose, initialOrderId, onOrderOpened }: InstagramMyOrdersDrawerProps) => {
  const { shopDetails, convertCurrency, customerOrders: contextCustomerOrders } = useStorefront(); // Use customerOrders from context
  const isMobile = useIsMobile();
  const [customerEmailInput, setCustomerEmailInput] = useState(() => {
    return getStoredCustomer()?.email || localStorage.getItem(LOCAL_STORAGE_EMAIL_KEY) || "";
  });
  const [orderIdInput, setOrderIdInput] = useState(""); // This will be managed by initialOrderId prop
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);

  // Effect to handle initialOrderId prop
  useEffect(() => {
    if (initialOrderId) {
      setOrderIdInput(initialOrderId);
      // Trigger fetchOrders if we have an email or any locally-saved order IDs
      if (shopDetails?.slug && (customerEmailInput || getStoredOrderIds().length > 0)) {
        fetchOrders();
      }
      // Do NOT auto-open the modal here. The user will click the card.
      if (onOrderOpened) {
        onOrderOpened(); // Notify parent that order has been processed
      }
    }
  }, [initialOrderId, customerEmailInput, shopDetails?.slug, onOrderOpened]); // Add dependencies

  const fetchOrders = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSearchAttempted(true);

    if (!shopDetails?.slug) {
      showError("Shop URL is invalid. Cannot fetch orders.");
      return;
    }

    // Orders saved on this device load freely; a guest lookup needs BOTH the
    // email and the order number from the confirmation (email alone would
    // expose anyone's orders to anyone who knows their address).
    const storedOrderIds = getStoredOrderIds();
    if (!customerEmailInput && storedOrderIds.length === 0) {
      showError("Please enter your email address and order number.");
      return;
    }
    if (customerEmailInput && !orderIdInput.trim() && storedOrderIds.length === 0) {
      showError("Please also enter the order number from your confirmation.");
      return;
    }

    setIsLoading(true);
    setOrders([]);

    try {
      // Fetch orders via edge function to avoid RLS issues on anon client.
      // Pass both the email and the locally-saved order IDs so freshly placed
      // orders always show up even if the email casing differs.
      const { data, error } = await supabase.functions.invoke('get-public-shop-data', {
        body: {
          shopSlug: shopDetails.slug,
          customerEmail: customerEmailInput || undefined,
          // Short order number pairs with the email server-side as proof of purchase.
          orderId: orderIdInput.trim() ? orderIdInput.trim().toLowerCase() : undefined,
          orderIds: storedOrderIds,
        }
      });
      if (error) throw error;
      let fetched = (data?.customerOrders || []) as OrderDetails[];
      if (orderIdInput) {
        // Match the short order number shown to customers (first 8 chars of the UUID).
        const q = orderIdInput.trim().toLowerCase();
        fetched = fetched.filter(o => o.id.toLowerCase().startsWith(q));
      }
      setOrders(fetched);
      if (customerEmailInput) saveStoredCustomer({ email: customerEmailInput });

    } catch (err: unknown) {
      console.error("Order fetching failed:", err);
      const msg = typeof err === 'object' && err && 'message' in err ? (err as any).message : 'An unexpected error occurred.';
      showError(`Failed to fetch orders: ${msg}`);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [customerEmailInput, orderIdInput, shopDetails?.slug]);

  useEffect(() => {
    // Auto-load only the orders placed on this device — an email alone no
    // longer authorizes a lookup, so auto-searching with it would just toast
    // a validation error at the user on open.
    if (isOpen && shopDetails?.slug && getStoredOrderIds().length > 0) {
      fetchOrders();
    }
  }, [isOpen, shopDetails?.slug, fetchOrders]);

  const handleOrderUpdate = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  const inner = (
    <>
      {selectedOrder && (
        <InstagramOrderDetailModal
          isOpen={isOrderDetailModalOpen}
          onClose={() => setIsOrderDetailModalOpen(false)}
          order={selectedOrder}
          onOrderUpdate={handleOrderUpdate}
        />
      )}
      <div className="p-4 border-b" style={{borderColor:'hsl(var(--border))'}}>
        <div className="flex items-center gap-2 text-xl font-bold">
          <ShoppingBag className="h-6 w-6 text-[hsl(var(--primary))]" />
          My Orders
        </div>
      </div>
      <span id="instagram-my-orders-description" className="sr-only">Enter your email and the order number from your confirmation to view an order.</span>

      <ScrollArea className="flex-1 p-4 pr-6" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
        <div className="space-y-4">
          <form onSubmit={fetchOrders} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerEmail" className="text-sm text-[hsl(var(--foreground))] opacity-80">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70" />
                <Input id="customerEmail" type="email" placeholder="your.email@example.com" value={customerEmailInput} onChange={(e) => setCustomerEmailInput(e.target.value)} required className="pl-10 text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-[hsl(var(--border))]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderId" className="text-sm text-[hsl(var(--foreground))] opacity-80">Order number</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70" />
                <Input id="orderId" placeholder="e.g., 2b7f9933" value={orderIdInput} onChange={(e) => setOrderIdInput(e.target.value)} className="pl-10 text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-[hsl(var(--border))]" />
              </div>
            </div>
            <Button type="submit" className="w-full text-base bg-[hsl(var(--primary))] text-white" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading Orders...</>) : "View Orders"}
            </Button>
          </form>

          {searchAttempted && !isLoading && (
            orders.length > 0 ? (
              <div className="mt-6 space-y-4">
                <h2 className="text-lg font-bold">Your Orders ({orders.length})</h2>
                <div className="space-y-3">
                  {orders.map(order => (
                    <Card key={order.id} onClick={() => { setSelectedOrder(order); setIsOrderDetailModalOpen(true); }} className="cursor-pointer hover:bg-[hsl(var(--muted))] shadow-sm border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold flex items-center gap-2 text-base">
                            <Hash className="h-4 w-4 text-[hsl(var(--primary))]" /> Order #{order.id.substring(0, 8)}
                          </p>
                          <Badge className={cn("font-normal text-md", getStatusColorClass(order.status))}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{order.status}</span>
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs opacity-80">
                          <p className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
                            <Calendar className="h-4 w-4 text-[hsl(var(--primary))]" /> {formatDate(order.created_at)}
                          </p>
                          <p className={cn("font-bold text-xl", {
                            "text-green-500": order.status === "Fulfilled",
                            "text-blue-500": order.status === "Given to Courier" || order.status === "Order Packaged",
                            "text-amber-500": order.status === "Order Seen" || order.status === "Pending",
                            "text-red-500": order.status === "Problematic" || order.status === "Cancelled",
                            "text-gray-500": !["Fulfilled", "Given to Courier", "Order Packaged", "Order Seen", "Pending", "Problematic", "Cancelled"].includes(order.status),
                          })}>
                            {formatCurrency(convertCurrency(order.total_amount, order.currency), shopDetails?.currency)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 p-4 border rounded-lg bg-[hsl(var(--card))] text-center space-y-3 opacity-80" style={{borderColor:'hsl(var(--border))'}}>
                <Package className="h-12 w-12 opacity-60 mx-auto" />
                <h3 className="text-lg font-semibold">No Orders Found</h3>
                <p className="text-sm">We couldn't find any orders for this email address.</p>
              </div>
            )
          )}
        </div>
      </ScrollArea>
      <div className="pt-1 border-t flex-shrink-0 p-4" style={{ paddingBottom: 'calc(1rem + var(--sab))', borderColor:'hsl(var(--border))' }}>
        <Button variant="outline" className="w-full text-base bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-none hover:bg-[hsl(var(--muted))]" onClick={onClose}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shop
        </Button>
      </div>
    </>
  );

  return isMobile ? (
    <Drawer open={isOpen} onOpenChange={onClose} shouldScaleBackground>
      <DrawerContent className="p-0 flex flex-col bg-[hsl(var(--card))] text-[hsl(var(--foreground))] rounded-t-xl" style={{ maxHeight: 'calc(100dvh - var(--sat))' }} aria-describedby="instagram-my-orders-description">
        {inner}
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 sm:max-w-[720px] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
        <DialogHeader className="sr-only"><DialogTitle>My Orders</DialogTitle></DialogHeader>
        {inner}
      </DialogContent>
    </Dialog>
  );
};