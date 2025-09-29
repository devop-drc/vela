import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, ArrowRight, Trash2, Minus, Plus } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Input } from "@/components/ui/input";

// Mock Cart Item Type (for demonstration)
interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  media_url: string;
  media_type: string;
}

const StorefrontCart = () => {
  const { shopSlug, shopDetails, appearanceSettings } = useStorefront();
  const blurEnabled = appearanceSettings?.blurEnabled;

  // Placeholder for cart items (using useState for interactivity in demo)
  const [cartItems, setCartItems] = useState<CartItem[]>([
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
  ]);

  const updateQuantity = (itemId: string, newQuantity: number) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, quantity: Math.max(1, newQuantity) } : item
      )
    );
  };

  const removeItem = (itemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = cartItems.length > 0 ? 5.00 : 0; // Mock shipping
  const total = subtotal + shipping;

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold font-heading mb-6">Your Shopping Cart</h1>

      {cartItems.length === 0 ? (
        <Card className={cn(
          "text-center py-12",
          blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
        )}>
          <CardHeader className="flex flex-col items-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="text-xl">Your cart is empty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">Looks like you haven't added anything to your cart yet.</p>
            <Button asChild>
              <Link to={`/shop/${shopSlug}`}>Start Shopping</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map(item => (
              <Card key={item.id} className={cn(
                "flex items-center p-4 gap-4",
                blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
              )}>
                <div className="h-24 w-24 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                  <MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="object-cover" />
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 items-center gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{item.name}</h3>
                    <p className="text-muted-foreground text-sm">
                      {formatCurrency(item.price, item.currency || shopDetails?.currency)}
                    </p>
                  </div>
                  <div className="flex items-center justify-end md:justify-start gap-4">
                    <div className="flex items-center border rounded-md">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-16 text-center border-y-0 border-x rounded-none focus-visible:ring-0"
                        min={1}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="font-semibold text-lg">
                      {formatCurrency(item.price * item.quantity, item.currency || shopDetails?.currency)}
                    </p>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove {item.name}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="lg:col-span-1">
            <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card")}>
              <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
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
                <Button className="w-full" asChild>
                  <Link to={`/shop/${shopDetails.slug}/checkout`}>
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