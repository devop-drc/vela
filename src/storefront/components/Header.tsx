// Storefront header — variant selected by config.layout.header.variant.
// classic | minimal | centered | split. Reads branding from StorefrontContext.
// With transparentOnHero, the header floats transparently over the top of the
// homepage and solidifies once the visitor scrolls.

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Search, Package, Home, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useCart } from '@/contexts/CartContext';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';

interface Props {
  onOpenCart?: () => void;
  onOpenSearch?: () => void;
}

export const Header = ({ onOpenCart, onOpenSearch }: Props) => {
  const { shopDetails } = useStorefront();
  const { totalItems } = useCart();
  const config = useStorefrontConfig();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!shopDetails) return null;

  const h = config.layout.header;
  const slug = shopDetails.slug;
  const base = `/shop/${slug}`;
  // Transparent overlay only applies on the homepage, before any scroll.
  const transparent = h.transparentOnHero && pathname === base && !scrolled;

  const Brand = ({ center }: { center?: boolean }) => (
    <Link to={base} className={cn('flex items-center gap-2.5', center && 'flex-col')}>
      {shopDetails.logo_url ? (
        <Avatar className="h-9 w-9"><AvatarImage src={shopDetails.logo_url} /><AvatarFallback>{shopDetails.shop_name?.[0]}</AvatarFallback></Avatar>
      ) : null}
      <span className="sf-heading font-bold text-lg leading-none">{shopDetails.shop_name}</span>
    </Link>
  );

  const navLinks = (
    <nav className="flex items-center gap-6 text-sm font-medium">
      <Link to={base} className={cn('hover:text-primary transition-colors', pathname === base && 'text-primary')}>Home</Link>
      <Link to={`${base}/products`} className={cn('hover:text-primary transition-colors', pathname.includes('/products') && 'text-primary')}>Shop</Link>
      <Link to={`${base}/orders`} className={cn('hover:text-primary transition-colors', pathname.includes('/orders') && 'text-primary')}>Orders</Link>
    </nav>
  );

  const actions = (
    <div className="flex items-center gap-1">
      {h.showSearch && (
        <Button variant="ghost" size="icon" onClick={onOpenSearch} aria-label="Search"><Search className="h-5 w-5" /></Button>
      )}
      <Button variant="ghost" size="icon" onClick={onOpenCart} aria-label="Cart" className="relative">
        <ShoppingBag className="h-5 w-5" />
        {totalItems > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{totalItems}</span>
        )}
      </Button>
    </div>
  );

  return (
    <header
      className={cn(
        'top-0 z-40 w-full border-b transition-colors duration-300',
        h.sticky && 'sticky',
        h.blur ? 'glass-enabled' : '',
        transparent
          ? '!border-transparent !bg-transparent !backdrop-blur-0 !shadow-none'
          : 'bg-card/80 sf-glass !rounded-none !border-x-0 !border-t-0'
      )}
    >
      <div className="sf-container flex h-14 items-center justify-between gap-4">
        {h.variant === 'centered' ? (
          <>
            {/* Nav collapses below md (the mobile bottom bar covers navigation);
                the empty flex-1 keeps the brand centered. */}
            <div className="hidden flex-1 md:block">{navLinks}</div>
            <div className="flex-1 md:hidden" />
            <Brand center />
            <div className="flex-1 flex justify-end">{actions}</div>
          </>
        ) : h.variant === 'split' ? (
          <>
            <Brand />
            <div className="hidden md:block">{navLinks}</div>
            {actions}
          </>
        ) : h.variant === 'minimal' ? (
          <>
            <Brand />
            {actions}
          </>
        ) : (
          // classic
          <>
            <Brand />
            <div className="hidden md:block absolute left-1/2 -translate-x-1/2">{navLinks}</div>
            {actions}
          </>
        )}
      </div>
    </header>
  );
};
