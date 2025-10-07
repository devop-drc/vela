import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingBag, X, Minus, Plus, Trash2, Loader2, CreditCard, CheckCircle, ArrowLeft } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useStorefront } from "@/contexts/StorefrontContext";
import { formatCurrency } from "@/lib/formatters";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { MediaItem } from "@/components/MediaItem";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { CheckoutForm } from "./CheckoutForm"; // Import the new CheckoutForm

interface StorefrontCartCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorefrontCartCheckoutModal = ({ isOpen, onClose }: StorefrontCartCheckoutModalProps) => {
  const { cartItems, totalItems, subtotal, shipping, total, updateQuantity, removeFromCart, clearCart, checkoutSuccess } = useCart();
  const { shopDetails, appearanceSettings, convertCurrency } = useStorefront();
  const { toast } = useToast();
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);

  const blurEnabled = appearanceSettings?.blurEnabled;

  useEffect(() => {
    if (!isOpen) {
      setIsCheckoutMode(false); // Reset to cart view when modal closes
      if (checkoutSuccess) {
        clearCart(); // Clear cart after successful checkout and modal closes
      }
    }
  }, [isOpen, checkoutSuccess, clearCart]);

  const convertedTotalPrice = useMemo(() => {
    if (!shopDetails?.currency) return 0;
    return total; // total is already in the shop's display currency from useCart
  }, [total, shopDetails?.currency]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "sm:max-w-5xl h-[90vh] flex flex-col p-0",
          blurEnabled ? "bg-card/80 backdrop-blur-lg" : "bg-card"
        )}
      >
        <DialogHeader className="p-6 border-b flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            {isCheckoutMode ? (
              <Button variant="ghost" size="icon" onClick={() => setIsCheckoutMode(false)} className="mr-2">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back to Cart</span>
              </Button>
            ) : (
              <ShoppingBag className="h-7 w-7" />
            )}
            {isCheckoutMode ? "Checkout" : "Your Cart"}
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
            <span className="sr-only">Close cart</span>
          </Button>
        </DialogHeader>

        {checkoutSuccess ? (
          <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
            <CheckCircle className="h-24 w-24 text-green-500 mb-6" />
            <h3 className="text-3xl font-bold mb-4">Order Placed Successfully!</h3>
            <p className="text-lg text-muted-foreground mb-8">Thank you for your purchase. Your order is being processed.</p>
            <Button onClick={onClose}>Continue Shopping</Button>
          </div>
        ) : (
          <>
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
                <ShoppingBag className="h-24 w-24 text-muted-foreground mb-6" />
                <h3 className="text-3xl font-bold mb-4">Your cart is empty</h3>
                <p className="text-lg text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet.</p>
                <Button onClick={onClose}>Start Shopping</Button>
              </div>
            ) : (
              <>
                {isCheckoutMode ? (
                  <CheckoutForm 
                    onSubmit={async (formData) => {
                      // This onSubmit is handled internally by CheckoutForm now
                      // The CheckoutForm will handle the supabase.functions.invoke('create-order')
                      // and then redirect.
                      // We just need to ensure the modal closes if needed, but the redirect will handle it.
                    }} 
                    onBackToCart={() => setIsCheckoutMode(false)}
                    isSubmitting={false} // isSubmitting is handled internally by CheckoutForm
                    totalPrice={convertedTotalPrice}
                    currency={shopDetails?.currency || 'USD'}
                  />
                ) : (
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid gap-6">
                      {cartItems.map(item => (
                        <Card key={item.productId} className={cn(
                          "flex items-center p-4",
                          blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
                        )}>
                          <MediaItem 
                            src={item.media_url} 
                            alt={item.name} 
                            type={item.media_type} 
                            className="h-20 w-20 object-cover rounded-md mr-4" 
                          />
                          <div className="flex-1 grid gap-1">
                            <Link to={`/shop/${shopDetails?.slug}/product/${item.productId}`} onClick={onClose} className="font-semibold hover:underline">
                              {item.name}
                            </Link>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(convertCurrency(item.price, item.currency), shopDetails?.currency)}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7" 
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="font-medium">{item.quantity}</span>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7" 
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="ml-auto text-destructive hover:text-destructive" 
                                onClick={() => removeFromCart(item.productId)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remove item</span>
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {!isCheckoutMode && (
                  <div className="p-6 border-t">
                    <div className="flex justify-between items-center text-lg font-semibold mb-4">
                      <span>Subtotal ({totalItems} items):</span>
                      <span>{formatCurrency(subtotal, shopDetails?.currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-semibold mb-4">
                      <span>Shipping:</span>
                      <span>{formatCurrency(shipping, shopDetails?.currency)}</span>
                    </div>
                    <Separator className="my-4" />
                    <div className="flex justify-between items-center text-xl font-bold mb-4">
                      <span>Total:</span>
                      <span>{formatCurrency(total, shopDetails?.currency)}</span>
                    </div>
                    <Button 
                      className="w-full py-3 text-lg" 
                      onClick={() => setIsCheckoutMode(true)}
                      disabled={cartItems.length === 0}
                    >
                      <CreditCard className="mr-2 h-5 w-5" />
                      Proceed to Checkout
                    </Button>
                    <Button variant="link" className="w-full mt-2" onClick={onClose}>
                      Continue Shopping
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};