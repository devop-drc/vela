import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const StorefrontCheckout = () => {
  const { shopSlug, shopDetails, appearanceSettings } = useStorefront();
  const blurEnabled = appearanceSettings?.blurEnabled;

  // Placeholder for cart items (matching the mock in StorefrontCart)
  const cartItems = [
    {
      id: "cart-item-1",
      productId: "product-1",
      name: "Vintage Sunset Tee",
      price: 35.00,
      currency: "USD",
      quantity: 1,
      media_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
      media_type: "IMAGE",
    },
    {
      id: "cart-item-2",
      productId: "product-2",
      name: "Handcrafted Leather Wallet",
      price: 50.00,
      currency: "USD",
      quantity: 2,
      media_url: "https://images.unsplash.com/photo-1615393329869-68279e0a239b?w=400",
      media_type: "IMAGE",
    },
  ];

  const subtotal = cartItems.reduce((sum, item) => item.price * item.quantity, 0);
  const shipping = cartItems.length > 0 ? 5.00 : 0; // Mock shipping
  const total = subtotal + shipping;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder for actual checkout logic
    toast.success("Order placed successfully! (Demo)");
    console.log("Order placed!");
    // In a real app, you'd redirect to an order confirmation page
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold font-heading mb-6">Checkout</h1>

      <form id="checkout-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card")}>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
              <CardDescription>Enter your details for shipping.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john.doe@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Shipping Address</Label>
                  <Input id="address" placeholder="123 Main St" required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" placeholder="Anytown" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input id="state" placeholder="CA" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">Zip/Postal Code</Label>
                    <Input id="zip" placeholder="90210" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <Textarea id="notes" rows={3} placeholder="Leave a note for the seller..." />
                </div>
            </CardContent>
          </Card>

          <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card")}>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
              <CardDescription>Securely enter your payment details.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 border rounded-lg bg-muted/50 text-muted-foreground text-center">
                <p className="font-medium">Payment gateway integration coming soon!</p>
                <p className="text-sm mt-2">For now, this is a placeholder for card input and processing.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card", "lg:sticky lg:top-24")}>
            <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.name} (x{item.quantity})</span>
                    <span>{formatCurrency(item.price * item.quantity, shopDetails?.currency)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t pt-4">
                <span>Subtotal:</span>
                <span className="font-semibold">{formatCurrency(subtotal, shopDetails?.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span className="font-semibold">{formatCurrency(shipping, shopDetails?.currency)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-4">
                <span>Total:</span>
                <span>{formatCurrency(total, shopDetails?.currency)}</span>
              </div>
              <Button type="submit" className="w-full">
                <CheckCircle className="mr-2 h-4 w-4" />
                Place Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default StorefrontCheckout;