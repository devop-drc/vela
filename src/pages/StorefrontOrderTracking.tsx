import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Package, CheckCircle, Truck, Home } from "lucide-react";
import { Link, useParams } from "react-router-dom";

const StorefrontOrderTracking = () => {
  const { shopSlug } = useParams<{ shopSlug: string }>(); // Changed to shopSlug
  const [orderId, setOrderId] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [orderStatus, setOrderStatus] = useState<string | null>(null); // Placeholder for fetched status
  const [isLoading, setIsLoading] = useState(false);

  const handleTrackOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setOrderStatus(null); // Reset status

    // Placeholder for actual order tracking logic
    // In a real app, this would call a Supabase Edge Function
    setTimeout(() => {
      if (orderId === "12345" && customerEmail === "test@example.com") {
        setOrderStatus("Fulfilled");
      } else if (orderId === "67890" && customerEmail === "test@example.com") {
        setOrderStatus("In Progress");
      } else {
        setOrderStatus("Not Found");
      }
      setIsLoading(false);
    }, 1500);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Fulfilled": return <CheckCircle className="h-6 w-6 text-emerald-500" />;
      case "In Progress": return <Truck className="h-6 w-6 text-blue-500" />;
      case "Pending": return <Package className="h-6 w-6 text-amber-500" />;
      default: return <Search className="h-6 w-6 text-muted-foreground" />;
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Track Your Order</h1>

      <Card className="max-w-lg mx-auto">
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
              {isLoading ? "Tracking..." : "Track Order"}
            </Button>
          </form>

          {orderStatus && (
            <div className="mt-8 p-6 border rounded-lg bg-muted/50 text-center space-y-4">
              {orderStatus === "Not Found" ? (
                <>
                  <Search className="h-16 w-16 text-destructive mx-auto" />
                  <h3 className="text-xl font-semibold text-destructive">Order Not Found</h3>
                  <p className="text-muted-foreground">Please double-check your Order ID and email address.</p>
                </>
              ) : (
                <>
                  {getStatusIcon(orderStatus)}
                  <h3 className="text-xl font-semibold">Order Status: {orderStatus}</h3>
                  <p className="text-muted-foreground">
                    Your order <span className="font-medium">#{orderId}</span> is currently{" "}
                    <span className="font-medium lowercase">{orderStatus}</span>.
                  </p>
                  {orderStatus === "Fulfilled" && (
                    <p className="text-sm text-muted-foreground">Thank you for your purchase!</p>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="text-center mt-8">
        <Button variant="link" asChild>
          <Link to={`/shop/${shopSlug}`}>
            <Home className="mr-2 h-4 w-4" />
            Back to Shop
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default StorefrontOrderTracking;