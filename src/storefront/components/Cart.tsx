// Cart + checkout, presented as a slide-over drawer, a modal, or a full page
// depending on config.components.cart. Shares one CartContents body.

import { createContext, useContext, useState, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Minus, Plus, XCircle, ArrowRight, ArrowLeft, CheckCircle, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MediaItem } from '@/components/MediaItem';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/formatters';
import { useCart } from '@/contexts/CartContext';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useStorefrontConfig, useStorefrontTokenStyle } from '../theme/StorefrontThemeProvider';
import { useCheckout } from '../lib/useCheckout';
import { CheckoutSteps } from './CheckoutSteps';
import { SfButton } from './SfButton';

// ── Cart open/close UI context ───────────────────────────────────────────────
interface CartUI { open: () => void; close: () => void; isOpen: boolean }
const CartUIContext = createContext<CartUI>({ open: () => {}, close: () => {}, isOpen: false });
export const useCartUI = () => useContext(CartUIContext);

export const CartUIProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <CartUIContext.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
    </CartUIContext.Provider>
  );
};

// ── Cart body (used in all presentations) ────────────────────────────────────
type Step = 'cart' | 'contact-shipping' | 'payment';

export const CartContents = ({ onClose }: { onClose?: () => void }) => {
  const { cartItems, subtotal, shipping, total, totalItems, totalSaved, freeShippingThreshold, updateQuantity, removeFromCart, hasSubscriptionProducts } = useCart();
  const { shopDetails, convertCurrency } = useStorefront();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('cart');
  const { placeOrder, isSubmitting } = useCheckout(onClose);

  const back = () => setStep(step === 'payment' ? 'contact-shipping' : step === 'contact-shipping' ? 'cart' : 'cart');

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-10 text-center min-h-[40vh]">
        <ShoppingBag className="h-20 w-20 text-muted-foreground mb-6" />
        <h3 className="sf-heading text-2xl font-bold mb-3">Your cart is empty</h3>
        <p className="text-muted-foreground mb-6">Looks like you haven't added anything yet.</p>
        <Button onClick={onClose}>Start Shopping</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 p-4 border-b shrink-0">
        {step !== 'cart' && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={back}><ArrowLeft className="h-4 w-4" /></Button>}
        <h2 className="sf-heading text-xl font-bold flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> {step === 'cart' ? 'Your Cart' : 'Checkout'}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {step === 'cart' ? (
          <>
            {hasSubscriptionProducts && (
              <div className="flex items-center gap-2 p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                <Info className="h-4 w-4 shrink-0" /> Cart includes subscriptions. Cash on Delivery is unavailable.
              </div>
            )}
            {cartItems.map((item) => (
              <div key={item.uid} className="flex gap-3 sf-glass p-3">
                <Link to={`/shop/${shopDetails?.slug}/product/${item.productId}`} onClick={onClose} className="shrink-0">
                  <div className="h-20 w-20 rounded-md overflow-hidden bg-muted border"><MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="object-cover h-full w-full" /></div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/shop/${shopDetails?.slug}/product/${item.productId}`} onClick={onClose}><h3 className="font-semibold leading-tight hover:underline line-clamp-1">{item.name}</h3></Link>
                  {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ')}</p>
                  )}
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <div className="flex items-center border rounded-md h-8">
                      <button aria-label="Decrease quantity" onClick={() => updateQuantity(item.uid, item.quantity - 1)} disabled={item.quantity <= 1} className="h-full w-8 flex items-center justify-center disabled:opacity-40"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
                      <button aria-label="Increase quantity" onClick={() => updateQuantity(item.uid, item.quantity + 1)} disabled={item.quantity >= 99} className="h-full w-8 flex items-center justify-center disabled:opacity-40"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <span className={cn('font-semibold', item.isDiscounted && 'text-emerald-600 dark:text-emerald-400')}>{formatCurrency(convertCurrency(item.price * item.quantity, item.currency, shopDetails?.currency), shopDetails?.currency)}</span>
                    <button aria-label={`Remove ${item.name} from cart`} onClick={() => removeFromCart(item.uid)} className="text-muted-foreground hover:text-destructive"><XCircle className="h-5 w-5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <CheckoutSteps step={step} hasSubscriptionProducts={hasSubscriptionProducts} onContinue={() => setStep('payment')} onPlaceOrder={placeOrder} />
        )}
      </div>

      <div className="border-t p-4 space-y-3 shrink-0">
        {step === 'cart' && cartItems.length > 0 && shipping > 0 && freeShippingThreshold > subtotal && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>Add {formatCurrency(freeShippingThreshold - subtotal, shopDetails?.currency)} more for free shipping.</span>
          </div>
        )}
        <div className="flex justify-between text-sm"><span>Subtotal ({totalItems})</span><span className="font-semibold">{formatCurrency(subtotal, shopDetails?.currency)}</span></div>
        <div className="flex justify-between text-sm"><span>Shipping</span><span className={cn('font-semibold', shipping === 0 && 'text-emerald-600 dark:text-emerald-400')}>{shipping === 0 ? 'FREE' : formatCurrency(shipping, shopDetails?.currency)}</span></div>
        {totalSaved > 0 && <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400"><span>You saved</span><span className="font-semibold">{formatCurrency(totalSaved, shopDetails?.currency)}</span></div>}
        <Separator />
        <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatCurrency(total, shopDetails?.currency)}</span></div>

        {step === 'cart' && <SfButton className="w-full" onClick={() => setStep('contact-shipping')}>Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" /></SfButton>}
        {step === 'contact-shipping' && <SfButton type="submit" form="sf-checkout-form" className="w-full">Continue to Payment <ArrowRight className="ml-2 h-4 w-4" /></SfButton>}
        {step === 'payment' && (
          <SfButton type="submit" form="sf-checkout-form" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Placing Order…</> : <><CheckCircle className="mr-2 h-4 w-4" /> Place Order</>}
          </SfButton>
        )}
      </div>
    </div>
  );
};

// ── Presentation wrapper ─────────────────────────────────────────────────────
export const Cart = () => {
  const { isOpen, close } = useCartUI();
  const config = useStorefrontConfig();
  const token = useStorefrontTokenStyle();
  const variant = config.components.cart;

  if (variant === 'page') return null; // rendered by the /cart route instead

  // The portal renders outside sf-root, so inject the token vars/attrs here to
  // keep the cart fully themed with the storefront's colors, radius and glass.
  if (variant === 'modal') {
    return (
      <Dialog open={isOpen} onOpenChange={(o) => !o && close()}>
        <DialogContent className={cn('sm:max-w-2xl h-[88vh] p-0 flex flex-col bg-background text-foreground', token.className)} style={token.style} {...token.attrs}>
          <CartContents onClose={close} />
        </DialogContent>
      </Dialog>
    );
  }

  // drawer (default)
  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className={cn('w-full sm:max-w-md p-0 flex flex-col bg-background text-foreground', token.className)} style={token.style} {...token.attrs}>
        <CartContents onClose={close} />
      </SheetContent>
    </Sheet>
  );
};
