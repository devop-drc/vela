import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Package, CheckCircle, Truck, Home, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useStorefront } from "@/contexts/StorefrontContext";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

type OrderStatusType = 'Pending' | 'In Progress' | 'Fulfilled' | 'Not Found' | null;

const StorefrontOrderTracking = () => {
  const { shopSlug, appearanceSettings } = useStorefront();
  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('orderId') || "");
  const [customerEmail, setCustomerEmail] = useState("");
  const [orderStatus, setOrderStatus] = useState<OrderStatusType>(null);
  const [isLoading, setIsLoading] = useState(false);
  const blurEnabled = appearanceSettings?.blurEnabled;

  useEffect(() => {
    if (orderId && customerEmail) {
      handleTrackOrder();
    }
  }, []); // Run once if orderId and email are pre-filled

  const handleTrackOrder = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    setOrderStatus(null);

    if (!orderId || !customerEmail) {
      showError("Please enter both Order ID and Email Address.");
      setIsLoading(false);
      return;
    }

    try {
      // In a real app, this would call a Supabase Edge Function to securely check order status
      // For this demo, we'll simulate a lookup
      const { data, error } = await supabase
        .from('orders')
        .select('status, customer_email')
        .eq('id', orderId)
        .eq('customer_email', customerEmail)
        .maybeSingle();

      if (error) {
        console.error("Error fetching order:", error);
        setOrderStatus("Not Found");
      } else if (data) {
        setOrderStatus(data.status as OrderStatusType);
      } else {
        setOrderStatus("Not Found");
      }
    } catch (err) {
      console.error("Order tracking failed:", err);
      setOrderStatus("Not Found");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: OrderStatusType) => {
    switch (status) {
      case "Fulfilled": return <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />;
      case "In Progress": return <Truck className="h-16 w-16 text-blue-500 mx-auto" />;
      case "Pending": return <Package className="h-16 w-16 text-amber-500 mx-auto" />;
      case "Not Found": return <XCircle className="h-16 w-16 text-destructive mx-auto" />;
      default: return <Search className="h-16 w-16 text-muted-foreground mx-auto" />;
    }
  };

  const getStatusColorClass = (status: OrderStatusType) => {
    switch (status) {
      case "Fulfilled": return "text-emerald-500";
      case "In Progress": return "text-blue-500";
      case "Pending": return "text-amber-500";
      case "Not Found": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-6 text-muted-foreground hover:text-foreground">
        <Link to={`/shop/${shopSlug}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shop
        </Link>
      </Button>
      <h1 className="text-3xl font-bold font-heading mb-6 text-center">Track Your Order</h1>

      <Card className={cn(
        "max-w-lg mx-auto shadow-lg",
        blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
      )}>
        <CardHeader>
          <CardTitle>Find Your Order</CardTitle>
          <CardDescription>Enter your order ID and email to check its status.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTrackOrder} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orderId">Order ID</Label>
              <Input
                id="orderId"
                placeholder="e.g., 12345"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email Address</Label>
              <Input
                id="customerEmail"
                type="email"
                placeholder="your.email@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Tracking...
                </>
              ) : "Track Order"}
            </Button>
          </form>

          {orderStatus && (
            <div className="mt-8 p-6 border rounded-lg bg-muted/50 text-center space-y-4">
              {getStatusIcon(orderStatus)}
              <h3 className={cn("text-xl font-semibold", getStatusColorClass(orderStatus))}>
                Order Status: {orderStatus === "Not Found" ? "Not Found" : orderStatus}
              </h3>
              {orderStatus !== "Not Found" ? (
                <p className="text-muted-foreground">
                  Your order <span className="font-medium">#{orderId}</span> is currently{" "}
                  <span className="font-medium lowercase">{orderStatus}</span>.
                </p>
              ) : (
                <p className="text-muted-foreground">Please double-check your Order ID and email address.</p>
              )}
              {orderStatus === "Fulfilled" && (
                <p className="text-sm text-muted-foreground">Thank you for your purchase!</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StorefrontOrderTracking;