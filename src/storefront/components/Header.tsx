// Storefront header — variant selected by config.layout.header.variant.
// classic | minimal | centered | split. Reads branding from StorefrontContext.
// With transparentOnHero, the header floats transparently over the top of the
// homepage and solidifies once the visitor scrolls.

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Search, Package, Home, Menu, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useCart } from '@/contexts/CartContext';
import { useStorefrontConfig, useStorefrontTokenStyle } from '../theme/StorefrontThemeProvider';

interface Props {
  onOpenCart?: () => void;
  onOpenSearch?: () => void;
}

export const Header = ({ onOpenCart, onOpenSearch }: Props) => {
  const { shopDetails, products } = useStorefront();
  const { totalItems } = useCart();
  const config = useStorefrontConfig();
  const tokenStyle = useStorefrontTokenStyle();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const categories = useMemo(() => {
    const s = new Set<string>();
    (products || []).forEach((p) => { if (p.category) s.add(p.category); });
    return Array.from(s).sort((a, b) => a.localeCompare(b)).slice(0, 8);
  }, [products]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!shopDetails) return null;
  if (config.layout.header.hidden) return null;

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

  // With the mobile bottom bar disabled, navigation moves into a hamburger
  // sheet so small screens are never stranded.
  const showHamburger = !config.layout.nav.mobileBottomBar;

  const hamburger = showHamburger && (
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className={cn('w-72 overflow-y-auto', tokenStyle.className)} style={tokenStyle.style}>
        <p className="sf-heading pr-8 text-lg font-bold leading-tight">{shopDetails.shop_name}</p>
        <nav className="mt-4 flex flex-col gap-1">
          {[
            { to: base, label: 'Home', icon: Home },
            { to: `${base}/products`, label: 'Shop', icon: Package },
            { to: `${base}/orders`, label: 'My Orders', icon: ClipboardList },
          ].map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={cn('flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors', pathname === to ? 'bg-primary/10 text-primary' : 'hover:bg-accent')}>
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>
        {categories.length > 0 && (
          <div className="mt-5">
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Categories</p>
            {categories.map((c) => (
              <Link key={c} to={`${base}/products?category=${encodeURIComponent(c)}`} className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
                {c}
              </Link>
            ))}
          </div>
        )}
        <Button className="mt-6 w-full" onClick={() => { setMenuOpen(false); onOpenCart?.(); }}>
          <ShoppingBag className="mr-2 h-4 w-4" /> Cart{totalItems > 0 ? ` (${totalItems})` : ''}
        </Button>
      </SheetContent>
    </Sheet>
  );

  const actions = (
    <div className="flex items-center gap-1">
      {h.showSearch && (
        <Button variant="ghost" size="icon" onClick={onOpenSearch} aria-label="Search"><Search className="h-5 w-5" /></Button>
      )}
      <Button variant="ghost" size="icon" onClick={onOpenCart} aria-label="Cart" className="relative" data-sf-cart-target>
        <ShoppingBag className="h-5 w-5" />
        {totalItems > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{totalItems}</span>
        )}
      </Button>
    </div>
  );

  const presentation = h.presentation ?? 'bar';

  const inner = (
    <div className={cn('flex items-center justify-between gap-4', presentation === 'minimal' ? 'h-12' : 'h-14', presentation === 'floating' ? 'px-4' : 'sf-container')}>
      {h.variant === 'centered' ? (
        <>
          {/* Nav collapses below md; the hamburger (if enabled) or the empty
              flex-1 keeps the brand centered. */}
          <div className="hidden flex-1 md:block">{navLinks}</div>
          <div className="flex flex-1 md:hidden">{hamburger}</div>
          <Brand center />
          <div className="flex flex-1 justify-end">{actions}</div>
        </>
      ) : h.variant === 'split' ? (
        <>
          <div className="flex items-center gap-1">{hamburger}<Brand /></div>
          <div className="hidden md:block">{navLinks}</div>
          {actions}
        </>
      ) : h.variant === 'minimal' ? (
        <>
          <div className="flex items-center gap-1">{hamburger}<Brand /></div>
          {actions}
        </>
      ) : (
        // classic
        <>
          <div className="flex items-center gap-1">{hamburger}<Brand /></div>
          <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">{navLinks}</div>
          {actions}
        </>
      )}
    </div>
  );

  if (presentation === 'floating') {
    return (
      <header className={cn('top-3 z-40 w-full px-3 transition-all duration-300 md:px-5', h.sticky && 'sticky')}>
        <div
          className={cn(
            'sf-container relative !px-0 overflow-visible border shadow-lg transition-colors duration-300',
            h.blur ? 'glass-enabled' : '',
            transparent ? '!border-transparent !bg-transparent !shadow-none' : 'bg-card/85 sf-glass'
          )}
          style={{ borderRadius: 'calc(var(--radius) + 6px)' }}
        >
          {inner}
        </div>
      </header>
    );
  }

  if (presentation === 'minimal') {
    return (
      <header className={cn('top-0 z-40 w-full bg-transparent transition-colors duration-300', h.sticky && 'sticky', h.sticky && scrolled && 'bg-background/80 backdrop-blur-sm')}>
        <div className="relative">{inner}</div>
      </header>
    );
  }

  // bar (default)
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
      <div className="relative">{inner}</div>
    </header>
  );
};
