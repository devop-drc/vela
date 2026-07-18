// Cart + checkout, presented as a slide-over drawer, a modal, or a full page
// depending on config.components.cart. Shares one CartContents body.

import { createContext, useContext, useState, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Minus, Plus, XCircle, ArrowRight, ArrowLeft, CheckCircle, Loader2, Info, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MediaItem } from '@/components/MediaItem';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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

export const CartContents = ({ onClose, variant = 'drawer' }: { onClose?: () => void; variant?: 'drawer' | 'page' }) => {
  const { cartItems, subtotal, shipping, total, totalItems, totalSaved, freeShippingThreshold, updateQuantity, removeFromCart, hasSubscriptionProducts } = useCart();
  const { shopDetails, convertCurrency } = useStorefront();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('cart');
  const { placeOrder, isSubmitting } = useCheckout(onClose);

  const back = () => setStep(step === 'payment' ? 'contact-shipping' : step === 'contact-shipping' ? 'cart' : 'cart');

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-10 text-center min-h-[40vh]">
        <div className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-primary">
          <ShoppingBag className="h-9 w-9" />
        </div>
        <h3 className="sf-heading text-2xl font-bold mb-2">Your cart is empty</h3>
        <p className="text-muted-foreground mb-6">Browse the shop and add something you love.</p>
        <SfButton onClick={onClose}>Start Shopping</SfButton>
      </div>
    );
  }

  // ── Reusable pieces (shared by the drawer and the two-column page) ──────────
  const price = (n: number, cur?: string) => formatCurrency(convertCurrency(n, cur, shopDetails?.currency), shopDetails?.currency);

  // Free-shipping nudge with a progress meter toward the threshold.
  const freeShipHint = step === 'cart' && shipping > 0 && freeShippingThreshold > subtotal ? (
    <div className="space-y-1.5 rounded-md bg-muted/50 px-3 py-2.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>Add <span className="font-semibold text-foreground">{formatCurrency(freeShippingThreshold - subtotal, shopDetails?.currency)}</span> more for free shipping.</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60" role="progressbar" aria-label="Progress toward free shipping" aria-valuenow={Math.round((subtotal / freeShippingThreshold) * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%` }} />
      </div>
    </div>
  ) : null;

  const totals = (
    <div className="space-y-3">
      <div className="flex justify-between text-sm"><span>Subtotal ({totalItems})</span><span className="font-semibold">{formatCurrency(subtotal, shopDetails?.currency)}</span></div>
      <div className="flex justify-between text-sm"><span>Shipping</span><span className={cn('font-semibold', shipping === 0 && 'text-success')}>{shipping === 0 ? 'FREE' : formatCurrency(shipping, shopDetails?.currency)}</span></div>
      {totalSaved > 0 && <div className="flex justify-between text-sm text-success"><span>You saved</span><span className="font-semibold">{formatCurrency(totalSaved, shopDetails?.currency)}</span></div>}
      <Separator />
      <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatCurrency(total, shopDetails?.currency)}</span></div>
    </div>
  );

  const cta = (
    <>
      {step === 'cart' && <SfButton className="w-full" onClick={() => setStep('contact-shipping')}>Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" /></SfButton>}
      {step === 'contact-shipping' && <SfButton type="submit" form="sf-checkout-form" className="w-full">Continue to Payment <ArrowRight className="ml-2 h-4 w-4" /></SfButton>}
      {step === 'payment' && (
        <SfButton type="submit" form="sf-checkout-form" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Placing Order…</> : <><CheckCircle className="mr-2 h-4 w-4" /> Place Order</>}
        </SfButton>
      )}
    </>
  );

  const subscriptionNote = hasSubscriptionProducts ? (
    <div
      className="flex items-center gap-2 rounded-md border p-3 text-sm text-foreground"
      style={{ background: 'hsl(var(--warning) / 0.12)', borderColor: 'hsl(var(--warning) / 0.35)' }}
    >
      <Info className="h-4 w-4 shrink-0" style={{ color: 'hsl(var(--warning))' }} /> Cart includes subscriptions. Cash on Delivery is unavailable.
    </div>
  ) : null;

  const itemRows = cartItems.map((item) => (
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
          <div className="flex h-10 items-center rounded-md border md:h-8">
            <button aria-label="Decrease quantity" onClick={() => updateQuantity(item.uid, item.quantity - 1)} disabled={item.quantity <= 1} className="flex h-full w-10 items-center justify-center disabled:opacity-40 md:w-8"><Minus className="h-3.5 w-3.5" /></button>
            <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
            <button aria-label="Increase quantity" onClick={() => updateQuantity(item.uid, item.quantity + 1)} disabled={item.quantity >= 99} className="flex h-full w-10 items-center justify-center disabled:opacity-40 md:w-8"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          <span className={cn('font-semibold', item.isDiscounted && 'text-success')}>{price(item.price * item.quantity, item.currency)}</span>
          <button aria-label={`Remove ${item.name} from cart`} onClick={() => removeFromCart(item.uid)} className="-m-2 p-2 text-muted-foreground hover:text-destructive"><XCircle className="h-5 w-5" /></button>
        </div>
      </div>
    </div>
  ));

  // ── Two-column page layout: form/items on the left, sticky summary on the right ──
  if (variant === 'page') {
    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="min-w-0 space-y-5">
          <div className="flex items-center gap-2">
            {step !== 'cart' && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={back}><ArrowLeft className="h-4 w-4" /></Button>}
            <h1 className="sf-heading text-2xl font-bold flex items-center gap-2"><ShoppingBag className="h-6 w-6" /> {step === 'cart' ? 'Your Cart' : 'Checkout'}</h1>
          </div>
          {step === 'cart' ? (
            <div className="space-y-4">{subscriptionNote}{itemRows}</div>
          ) : (
            <CheckoutSteps step={step} hasSubscriptionProducts={hasSubscriptionProducts} onContinue={() => setStep('payment')} onPlaceOrder={placeOrder} />
          )}
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="sf-glass p-5 space-y-4">
            <h2 className="sf-heading text-lg font-bold">Order Summary</h2>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div key={item.uid} className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 rounded-md overflow-hidden bg-muted border">
                    <MediaItem src={item.media_url} alt={item.name} type={item.media_type} className="object-cover h-full w-full" />
                    <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[1.25rem] px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold grid place-items-center">{item.quantity}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight line-clamp-1">{item.name}</p>
                    {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{Object.entries(item.selectedOptions).map(([k, v]) => `${Array.isArray(v) ? v.join(', ') : v}`).join(' · ')}</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold whitespace-nowrap">{price(item.price * item.quantity, item.currency)}</span>
                </div>
              ))}
            </div>
            <Separator />
            {freeShipHint}
            {totals}
            {cta}
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Secure checkout</div>
          </div>
        </aside>
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
          <>{subscriptionNote}{itemRows}</>
        ) : (
          <CheckoutSteps step={step} hasSubscriptionProducts={hasSubscriptionProducts} onContinue={() => setStep('payment')} onPlaceOrder={placeOrder} />
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t p-4 pb-[calc(1rem+var(--sab,0px))]">
        {freeShipHint}
        {totals}
        {cta}
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
        <DialogContent aria-describedby={undefined} className={cn('sm:max-w-2xl h-[88vh] p-0 flex flex-col bg-background text-foreground rounded-[var(--sf-radius-card,1rem)] sm:rounded-[var(--sf-radius-card,1rem)]', token.className)} style={token.style} {...token.attrs}>
          <DialogTitle className="sr-only">Shopping cart</DialogTitle>
          <CartContents onClose={close} />
        </DialogContent>
      </Dialog>
    );
  }

  // drawer (default)
  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" aria-describedby={undefined} className={cn('w-full sm:max-w-md p-0 flex flex-col bg-background text-foreground', token.className)} style={token.style} {...token.attrs}>
        {/* Sheet is built on the same Radix dialog primitive, so DialogTitle
            satisfies its accessible-title requirement. */}
        <DialogTitle className="sr-only">Shopping cart</DialogTitle>
        <CartContents onClose={close} />
      </SheetContent>
    </Sheet>
  );
};
