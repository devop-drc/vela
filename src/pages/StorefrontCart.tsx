import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, ArrowRight, Trash2, Minus, Plus, Home, ArrowLeft, Bookmark, MoveRight } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { Separator } from "@/components/ui/separator";
import { StorefrontBreadcrumb } from "@/components/storefront/StorefrontBreadcrumb"; // Import StorefrontBreadcrumb

const StorefrontCart = () => {
  const { shopSlug, shopDetails, appearanceSettings } = useStorefront();
  const { cartItems, savedItems, updateQuantity, removeFromCart, saveForLater, moveToCart, removeSavedItem, subtotal, shipping, total } = useCart();
  const blurEnabled = appearanceSettings?.blurEnabled;

  return (
    <div className="container py-8">
      <StorefrontBreadcrumb /> {/* Added breadcrumb here */}
      <h1 className="text-3xl font-bold font-heading mb-6">Your Shopping Cart</h1>

      {cartItems.length === 0 && savedItems.length === 0 ? (
        <Card className={cn(
          "text-center py-12 shadow-lg",
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
          <div className="lg:col-span-2 space-y-6">
            {cartItems.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold font-heading">Items in Cart ({cartItems.length})</h2>
                {cartItems.map(item => (
                  <Card key={item.productId} className={cn(
                    "flex flex-col sm:flex-row items-center p-4 gap-4 shadow-md",
                    blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
                  )}>
                    <Link to={`/shop/${shopSlug}/product/${item.productId}`} className="flex-shrink-0">
                      <div className="h-24 w-24 rounded-md overflow-hidden bg-muted border">
                        <MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="object-cover" />
                      </div>
                    </Link>
                    <div className="flex-1 w-full sm:w-auto grid grid-cols-1 md:grid-cols-2 items-center gap-4 text-center sm:text-left">
                      <div>
                        <Link to={`/shop/${shopSlug}/product/${item.productId}`}>
                          <h3 className="font-semibold text-lg hover:underline">{item.name}</h3>
                        </Link>
                        <p className="text-muted-foreground text-sm">
                          {formatCurrency(item.price, item.currency || shopDetails?.currency)}
                        </p>
                      </div>
                      <div className="flex items-center justify-center sm:justify-end gap-4">
                        <div className="flex items-center border rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                            className="w-16 text-center border-y-0 border-x rounded-none focus-visible:ring-0"
                            min={1}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="font-semibold text-lg">
                          {formatCurrency(item.price * item.quantity, item.currency || shopDetails?.currency)}
                        </p>
                        <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.productId)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove {item.name}</span>
                        </Button>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => saveForLater(item)} className="flex-shrink-0">
                        <Bookmark className="mr-2 h-4 w-4" />
                        Save for Later
                    </Button>
                  </Card>
                ))}
                <div className="flex justify-between items-center pt-4">
                    <Button variant="outline" asChild>
                        <Link to={`/shop/${shopSlug}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Continue Shopping
                        </Link>
                    </Button>
                </div>
              </div>
            )}

            {savedItems.length > 0 && (
              <div className="space-y-4 mt-8">
                <h2 className="text-2xl font-bold font-heading">Saved for Later ({savedItems.length})</h2>
                {savedItems.map(item => (
                  <Card key={item.productId} className={cn(
                    "flex flex-col sm:flex-row items-center p-4 gap-4 shadow-md",
                    blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
                  )}>
                    <Link to={`/shop/${shopSlug}/product/${item.productId}`} className="flex-shrink-0">
                      <div className="h-24 w-24 rounded-md overflow-hidden bg-muted border">
                        <MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="object-cover" />
                      </div>
                    </Link>
                    <div className="flex-1 w-full sm:w-auto grid grid-cols-1 md:grid-cols-2 items-center gap-4 text-center sm:text-left">
                      <div>
                        <Link to={`/shop/${shopSlug}/product/${item.productId}`}>
                          <h3 className="font-semibold text-lg hover:underline">{item.name}</h3>
                        </Link>
                        <p className="text-muted-foreground text-sm">
                          {formatCurrency(item.price, item.currency || shopDetails?.currency)}
                        </p>
                      </div>
                      <div className="flex items-center justify-center sm:justify-end gap-4">
                        <Button variant="outline" size="sm" onClick={() => moveToCart(item.productId)}>
                            <MoveRight className="mr-2 h-4 w-4" />
                            Move to Cart
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removeSavedItem(item.productId)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove {item.name}</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <div className="lg:col-span-1">
            <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card", "lg:sticky lg:top-24 shadow-lg")}>
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
                <Button className="w-full" asChild disabled={cartItems.length === 0}>
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