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
import { SfButton } from './SfButton';
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

  // On mobile only the profile avatar shows (logo, or the shop's initial) —
  // the full shop name would crowd the bar; it appears from `sm` up.
  const Brand = ({ center }: { center?: boolean }) => (
    <Link to={base} aria-label={shopDetails.shop_name} className={cn('flex min-w-0 items-center gap-2.5', center && 'flex-col')}>
      <Avatar className="h-9 w-9 shrink-0">
        {shopDetails.logo_url && <AvatarImage src={shopDetails.logo_url} />}
        <AvatarFallback className="bg-primary/10 font-semibold text-primary">{shopDetails.shop_name?.[0]}</AvatarFallback>
      </Avatar>
      <span className={cn('sf-heading hidden font-bold text-lg leading-none sm:inline', !center && 'truncate')}>{shopDetails.shop_name}</span>
    </Link>
  );

  // Active-underline nav item. Over a transparent hero the ink flips to white.
  const NavItem = ({ to, label, active }: { to: string; label: string; active: boolean }) => (
    <Link to={to} className={cn('group relative py-1 text-sm font-medium transition-colors', active ? (transparent ? 'text-white' : 'text-primary') : 'hover:text-primary')}>
      {label}
      <span
        className={cn('absolute inset-x-0 -bottom-1 h-0.5 origin-left rounded-full transition-transform duration-300',
          transparent ? 'bg-white' : 'bg-primary',
          active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100')}
        aria-hidden
      />
    </Link>
  );

  const showCategories = config.layout.nav.showCategories && categories.length > 0;

  const navLinks = (
    <nav className="flex items-center gap-7">
      <NavItem to={base} label="Home" active={pathname === base} />
      {/* Shop — with a hover categories dropdown when enabled. */}
      <div className="group relative">
        <NavItem to={`${base}/products`} label="Shop" active={pathname.includes('/products')} />
        {showCategories && (
          <div className="invisible absolute left-1/2 top-full z-50 min-w-[13rem] -translate-x-1/2 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
            <div className="rounded-xl border bg-card p-2 text-foreground shadow-xl">
              {categories.map((c) => (
                <Link key={c} to={`${base}/products?category=${encodeURIComponent(c)}`}
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  {c}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <NavItem to={`${base}/orders`} label="Orders" active={pathname.includes('/orders')} />
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
        <SfButton className="mt-6 w-full" onClick={() => { setMenuOpen(false); onOpenCart?.(); }}>
          <ShoppingBag className="mr-2 h-4 w-4" /> Cart{totalItems > 0 ? ` (${totalItems})` : ''}
        </SfButton>
      </SheetContent>
    </Sheet>
  );

  const actions = (
    <div className="flex items-center gap-0.5">
      {h.showSearch && (
        <Button variant="ghost" size="icon" onClick={onOpenSearch} aria-label="Search" className="rounded-full hover:bg-foreground/10"><Search className="h-5 w-5" /></Button>
      )}
      <Button variant="ghost" size="icon" onClick={onOpenCart} aria-label={`Cart${totalItems > 0 ? `, ${totalItems} items` : ''}`} className="relative rounded-full hover:bg-foreground/10" data-sf-cart-target>
        <ShoppingBag className="h-5 w-5" />
        {totalItems > 0 && (
          <span aria-hidden className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-card">{totalItems}</span>
        )}
      </Button>
    </div>
  );

  const presentation = h.presentation ?? 'bar';

  const inner = (
    <div className={cn('flex items-center justify-between gap-4 transition-colors', presentation === 'minimal' ? 'h-14' : 'h-16', presentation === 'floating' ? 'px-4' : 'sf-container', transparent && 'text-white')}>
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
          style={{ borderRadius: 'calc(var(--sf-radius-card) + 6px)' }}
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
        'top-0 z-40 w-full border-b transition-all duration-300',
        h.sticky && 'sticky',
        h.blur ? 'glass-enabled' : '',
        transparent
          ? '!border-transparent !bg-transparent !backdrop-blur-0 !shadow-none'
          : 'bg-card/80 sf-glass !rounded-none !border-x-0 !border-t-0',
        scrolled && !transparent && 'shadow-sm'
      )}
    >
      <div className="relative">{inner}</div>
    </header>
  );
};
