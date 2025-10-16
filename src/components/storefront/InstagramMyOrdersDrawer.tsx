"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ShoppingBag, X, Loader2, Search, Package, CheckCircle, Truck, Box, Eye, XCircle, Mail, Hash, ArrowLeft, Calendar, Banknote } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { formatCurrency } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InstagramOrderDetailModal } from "./InstagramOrderDetailModal"; // Import the new order detail modal

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
  const { shopDetails, convertCurrency } = useStorefront();
  const [customerEmailInput, setCustomerEmailInput] = useState(() => {
    return localStorage.getItem(LOCAL_STORAGE_EMAIL_KEY) || "";
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
      // Trigger fetchOrders if email is already present
      if (customerEmailInput && shopDetails?.slug) {
        fetchOrders();
      }
      if (onOrderOpened) {
        onOrderOpened(); // Notify parent that order has been processed
      }
    }
  }, [initialOrderId, customerEmailInput, shopDetails?.slug, onOrderOpened]); // Add dependencies

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
    if (!shopDetails?.slug) {
      showError("Shop URL is invalid. Cannot fetch orders.");
      setIsLoading(false);
      return;
    }

    try {
      const { data: shopData, error: shopError } = await supabase
        .from('shop_details')
        .select('business_id')
        .eq('slug', shopDetails.slug)
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

      // Use the orderIdInput state, which might be set by initialOrderId prop
      if (orderIdInput) {
        query = query.eq('id', orderIdInput);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching orders:", error);
        setOrders([]);
      } else if (data) {
        setOrders(data as OrderDetails[]);
        // Automatically open the order detail modal if a specific order was searched
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
  }, [customerEmailInput, orderIdInput, shopDetails?.slug]); // Add orderIdInput to dependencies

  useEffect(() => {
    if (isOpen && customerEmailInput && shopDetails?.slug) {
      fetchOrders();
    }
  }, [isOpen, customerEmailInput, shopDetails?.slug, fetchOrders]);

  const handleOrderUpdate = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <>
      {selectedOrder && (
        <InstagramOrderDetailModal
          isOpen={isOrderDetailModalOpen}
          onClose={() => setIsOrderDetailModalOpen(false)}
          order={selectedOrder}
          onOrderUpdate={handleOrderUpdate}
        />
      )}

      <DrawerContent
        className="h-[90vh] p-0 flex flex-col bg-white text-black rounded-t-xl"
      >
        <DrawerHeader className="p-4 border-b border-gray-200 flex-row items-center justify-between flex-shrink-0">
          <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <ShoppingBag className="h-6 w-6 text-red-500" />
            My Orders
          </DrawerTitle>
          {/* Removed X button */}
        </DrawerHeader>

        <ScrollArea className="flex-1 p-4 pr-6">
          <div className="space-y-4">
            <form onSubmit={fetchOrders} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerEmail" className="text-sm text-gray-700">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="customerEmail"
                    type="email"
                    placeholder="your.email@example.com"
                    value={customerEmailInput}
                    onChange={(e) => setCustomerEmailInput(e.target.value)}
                    required
                    className="pl-10 text-sm border-gray-300 bg-gray-50 text-gray-800"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderId" className="text-sm text-gray-700">Specific Order ID (Optional)</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="orderId"
                    placeholder="e.g., 12345"
                    value={orderIdInput}
                    onChange={(e) => setOrderIdInput(e.target.value)}
                    className="pl-10 text-sm border-gray-300 bg-gray-50 text-gray-800"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full text-base bg-red-500 hover:bg-red-600 text-white" disabled={isLoading}>
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
                <div className="mt-6 space-y-4">
                  <h2 className="text-lg font-bold text-gray-800">Your Orders ({orders.length})</h2>
                  <div className="space-y-3">
                    {orders.map(order => (
                      <Card key={order.id} onClick={() => { setSelectedOrder(order); setIsOrderDetailModalOpen(true); }} className="cursor-pointer hover:bg-gray-100 shadow-sm border border-gray-200 bg-white">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-gray-800 flex items-center gap-2 text-base">
                              <Hash className="h-4 w-4 text-red-500" /> Order #{order.id.substring(0, 8)}
                            </p>
                            <Badge className={cn("font-normal text-xs", getStatusColorClass(order.status))}>
                              {getStatusIcon(order.status)}
                              <span className="ml-1">{order.status}</span>
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-700">
                            <p className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-red-500" /> {new Date(order.created_at).toLocaleDateString()}
                            </p>
                            <p className="font-semibold text-gray-800">
                              {formatCurrency(convertCurrency(order.total_amount, order.currency, shopDetails?.currency), shopDetails?.currency)}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" className="w-full mt-3 bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200">View Details</Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-6 p-4 border rounded-lg bg-gray-50 text-center space-y-3 text-gray-600">
                  <Package className="h-12 w-12 text-gray-400 mx-auto" />
                  <h3 className="text-lg font-semibold">No Orders Found</h3>
                  <p className="text-sm">We couldn't find any orders for this email address.</p>
                </div>
              )
            )}
          </div>
        </ScrollArea>
        <DrawerFooter className="p-4 border-t border-gray-200 flex-shrink-0">
          <Button variant="ghost" className="w-full text-base text-gray-800 hover:bg-gray-100" onClick={onClose}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shop
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </>
  );
};