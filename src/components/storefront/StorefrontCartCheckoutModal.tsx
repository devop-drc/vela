import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingBag, X, Minus, Plus, Trash2, Loader2, CreditCard, CheckCircle, ArrowLeft, Bookmark, MoveRight, ArrowRight } from "lucide-react"; // Added ArrowRight
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
import { Input } from "@/components/ui/input"; // <--- ADDED THIS IMPORT

interface StorefrontCartCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorefrontCartCheckoutModal = ({ isOpen, onClose }: StorefrontCartCheckoutModalProps) => {
  const { cartItems, savedItems, totalItems, subtotal, shipping, total, updateQuantity, removeFromCart, clearCart, saveForLater, moveToCart, removeSavedItem } = useCart();
  const { shopDetails, appearanceSettings, convertCurrency } = useStorefront();
  const { toast } = useToast();
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);

  const blurEnabled = appearanceSettings?.blurEnabled;

  useEffect(() => {
    if (!isOpen) {
      setIsCheckoutMode(false); // Reset to cart view when modal closes
    }
  }, [isOpen]);

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
        <DialogHeader className="p-4 md:p-6 border-b flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-xl md:text-2xl font-bold">
            {isCheckoutMode ? (
              <Button variant="ghost" size="icon" onClick={() => setIsCheckoutMode(false)} className="mr-2 h-8 w-8 md:h-9 md:w-9">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back to Cart</span>
              </Button>
            ) : (
              <ShoppingBag className="h-6 w-6 md:h-7 md:w-7" />
            )}
            {isCheckoutMode ? "Checkout" : "Your Cart"}
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
            <span className="sr-only">Close cart</span>
          </Button>
        </DialogHeader>

        {cartItems.length === 0 && savedItems.length === 0 && !isCheckoutMode ? (
          <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
            <ShoppingBag className="h-20 w-20 md:h-24 md:w-24 text-muted-foreground mb-6" />
            <h3 className="text-2xl md:text-3xl font-bold mb-4">Your cart is empty</h3>
            <p className="text-base md:text-lg text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet.</p>
            <Button onClick={onClose} className="text-base md:text-lg">Start Shopping</Button>
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
              <>
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                  <div className="space-y-6">
                    {cartItems.length > 0 && (
                      <div className="space-y-4">
                        <h2 className="text-lg md:text-xl font-bold font-heading">Items in Cart ({cartItems.length})</h2>
                        {cartItems.map(item => (
                          <Card key={item.productId} className={cn(
                            "flex flex-col sm:flex-row items-center p-3 md:p-4 gap-3 md:gap-4 shadow-md",
                            blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
                          )}>
                            <Link to={`/shop/${shopDetails?.slug}/product/${item.productId}`} onClick={onClose} className="flex-shrink-0">
                              <div className="h-20 w-20 md:h-24 md:w-24 rounded-md overflow-hidden bg-muted border">
                                <MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="object-cover" />
                              </div>
                            </Link>
                            <div className="flex-1 w-full sm:w-auto grid grid-cols-1 lg:grid-cols-2 items-center gap-3 md:gap-4 text-center sm:text-left">
                              <div>
                                <Link to={`/shop/${shopDetails?.slug}/product/${item.productId}`} onClick={onClose}>
                                  <h3 className="font-semibold text-base md:text-lg hover:underline">{item.name}</h3>
                                </Link>
                                <p className="text-muted-foreground text-sm">
                                  {formatCurrency(convertCurrency(item.price, item.currency), shopDetails?.currency)}
                                </p>
                              </div>
                              <div className="flex items-center justify-center sm:justify-end gap-3 md:gap-4">
                                <div className="flex items-center border rounded-md">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                    disabled={item.quantity <= 1}
                                    className="h-8 w-8"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                                    className="w-14 md:w-16 text-center border-y-0 border-x rounded-none focus-visible:ring-0 text-sm"
                                    min={1}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                    className="h-8 w-8"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="font-semibold text-base md:text-lg">
                                  {formatCurrency(item.price * item.quantity, shopDetails?.currency)}
                                </p>
                                <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.productId)} className="text-destructive hover:text-destructive h-8 w-8">
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Remove {item.name}</span>
                                </Button>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => saveForLater(item)} className="flex-shrink-0 text-sm">
                                <Bookmark className="mr-2 h-4 w-4" />
                                Save for Later
                            </Button>
                          </Card>
                        ))}
                      </div>
                    )}

                    {savedItems.length > 0 && (
                      <div className="space-y-4 mt-6 md:mt-8">
                        <h2 className="text-lg md:text-xl font-bold font-heading">Saved for Later ({savedItems.length})</h2>
                        {savedItems.map(item => (
                          <Card key={item.productId} className={cn(
                            "flex flex-col sm:flex-row items-center p-3 md:p-4 gap-3 md:gap-4 shadow-md",
                            blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
                          )}>
                            <Link to={`/shop/${shopDetails?.slug}/product/${item.productId}`} onClick={onClose} className="flex-shrink-0">
                              <div className="h-20 w-20 md:h-24 md:w-24 rounded-md overflow-hidden bg-muted border">
                                <MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="object-cover" />
                              </div>
                            </Link>
                            <div className="flex-1 w-full sm:w-auto grid grid-cols-1 lg:grid-cols-2 items-center gap-3 md:gap-4 text-center sm:text-left">
                              <div>
                                <Link to={`/shop/${shopDetails?.slug}/product/${item.productId}`} onClick={onClose}>
                                  <h3 className="font-semibold text-base md:text-lg hover:underline">{item.name}</h3>
                                </Link>
                                <p className="text-muted-foreground text-sm">
                                  {formatCurrency(item.price, shopDetails?.currency)}
                                </p>
                              </div>
                              <div className="flex items-center justify-center sm:justify-end gap-3 md:gap-4">
                                <Button variant="outline" size="sm" onClick={() => moveToCart(item.productId)} className="text-sm">
                                    <MoveRight className="mr-2 h-4 w-4" />
                                    Move to Cart
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => removeSavedItem(item.productId)} className="text-destructive hover:text-destructive h-8 w-8">
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
                </div>

                <div className="p-4 md:p-6 border-t space-y-4">
                  <div className="flex justify-between text-sm md:text-base">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(subtotal, shopDetails?.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm md:text-base">
                    <span>Shipping:</span>
                    <span className="font-semibold">{formatCurrency(shipping, shopDetails?.currency)}</span>
                  </div>
                  <div className="flex justify-between text-lg md:text-xl font-bold border-t pt-4">
                    <span>Total:</span>
                    <span>{formatCurrency(total, shopDetails?.currency)}</span>
                  </div>
                  <Button className="w-full text-base md:text-lg" onClick={() => setIsCheckoutMode(true)} disabled={cartItems.length === 0}>
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="ghost" className="w-full text-base md:text-lg" onClick={onClose}>
                    Continue Shopping
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};