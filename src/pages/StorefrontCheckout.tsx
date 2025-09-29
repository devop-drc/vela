import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle } from "lucide-react";

const StorefrontCheckout = () => {
  const { businessId } = useParams<{ businessId: string }>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder for checkout logic
    alert("Checkout functionality coming soon!");
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
              <CardDescription>Enter your details for shipping.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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
              </form>
            </CardContent>
          </Card>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
              <CardDescription>Securely enter your payment details.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 border rounded-lg bg-muted/50 text-muted-foreground text-center">
                <p>Payment gateway integration coming soon!</p>
                <p className="text-sm mt-2">For now, this is a placeholder for card input and processing.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Placeholder for cart items */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Product A (x1)</span>
                  <span>$10.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Product B (x2)</span>
                  <span>$30.00</span>
                </div>
              </div>
              <div className="flex justify-between border-t pt-4">
                <span>Subtotal:</span>
                <span className="font-semibold">$40.00</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span className="font-semibold">$5.00</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-4">
                <span>Total:</span>
                <span>$45.00</span>
              </div>
              <Button type="submit" form="checkout-form" className="w-full">
                <CheckCircle className="mr-2 h-4 w-4" />
                Place Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StorefrontCheckout;