import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, ArrowRight } from "lucide-react";

const StorefrontCart = () => {
  const { shopSlug } = useParams<{ shopSlug: string }>(); // Changed to shopSlug

  // Placeholder for cart items
  const cartItems = []; // In a real app, this would come from a CartContext or local storage

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Your Shopping Cart</h1>

      {cartItems.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader className="flex flex-col items-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="text-xl">Your cart is empty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">Looks like you haven't added anything to your cart yet.</p>
            <Button asChild>
              <Link to={`/shop/${shopSlug}`}>Start Shopping</Link> {/* Use shopSlug */}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {/* Placeholder for actual cart items */}
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Cart items will appear here.</p>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card>
              <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span className="font-semibold">Calculated at checkout</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-4">
                  <span>Total:</span>
                  <span>$0.00</span>
                </div>
                <Button className="w-full" asChild>
                  <Link to={`/shop/${shopSlug}/checkout`}> {/* Use shopSlug */}
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorefrontCart;