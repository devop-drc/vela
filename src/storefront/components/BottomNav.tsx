// App-like mobile bottom navigation (shown when config.layout.nav.mobileBottomBar).
// Styles: bar (full-width), floating (rounded pill), minimal (compact, icons only).

import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Package, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useCart } from '@/contexts/CartContext';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';

interface Props { onOpenCart?: () => void }

export const BottomNav = ({ onOpenCart }: Props) => {
  const { shopDetails } = useStorefront();
  const { totalItems } = useCart();
  const config = useStorefrontConfig();
  const { pathname } = useLocation();
  if (!shopDetails || !config.layout.nav.mobileBottomBar) return null;

  const style = config.layout.nav.bottomBarStyle || 'bar';
  const base = `/shop/${shopDetails.slug}`;
  const showLabel = style !== 'minimal';

  const item = (active: boolean) =>
    cn('flex flex-col items-center justify-center gap-0.5 flex-1 py-2', showLabel ? 'text-[11px]' : '', active ? 'text-primary' : 'text-muted-foreground');

  const Items = (
    <>
      <Link to={base} className={item(pathname === base)}><Home className="h-5 w-5" />{showLabel && 'Home'}</Link>
      <Link to={`${base}/products`} className={item(pathname.includes('/products'))}><Package className="h-5 w-5" />{showLabel && 'Shop'}</Link>
      <button onClick={onOpenCart} className={item(false)} data-sf-cart-target>
        <span className="relative"><ShoppingBag className="h-5 w-5" />{totalItems > 0 && <span className="absolute -top-1 -right-2 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{totalItems}</span>}</span>
        {showLabel && 'Cart'}
      </button>
      <Link to={`${base}/orders`} className={item(pathname.includes('/orders'))}><ClipboardList className="h-5 w-5" />{showLabel && 'Orders'}</Link>
    </>
  );

  if (style === 'floating') {
    return (
      <nav className="md:hidden fixed bottom-3 inset-x-3 z-40 rounded-full border bg-card/90 glass-enabled sf-glass shadow-lg" style={{ borderRadius: 'var(--radius-full)' }}>
        <div className="flex items-stretch px-2">{Items}</div>
      </nav>
    );
  }

  return (
    <nav className={cn('md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card/90 glass-enabled sf-glass !rounded-none !border-x-0 !border-b-0', style === 'minimal' && 'h-12')}>
      <div className="flex items-stretch">{Items}</div>
    </nav>
  );
};
