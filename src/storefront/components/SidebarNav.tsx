// Desktop sidebar navigation chrome (config.layout.nav.desktop === 'sidebar').
// Replaces the top header at md+ — brand, page links, category shortcuts and
// the cart live in a sticky left rail; mobile keeps the regular header.

import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Home, Package, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useCart } from '@/contexts/CartContext';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';

interface Props {
  onOpenCart?: () => void;
}

export const SidebarNav = ({ onOpenCart }: Props) => {
  const { shopDetails, products } = useStorefront();
  const { totalItems } = useCart();
  const config = useStorefrontConfig();
  const { pathname } = useLocation();

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    (products || []).forEach((p) => {
      const c = p.category || 'Uncategorized';
      m.set(c, (m.get(c) || 0) + 1);
    });
    return Array.from(m.keys()).sort((a, b) => a.localeCompare(b)).slice(0, 8);
  }, [products]);

  if (!shopDetails) return null;
  const base = `/shop/${shopDetails.slug}`;

  const links = [
    { to: base, label: 'Home', icon: Home, active: pathname === base },
    { to: `${base}/products`, label: 'Shop', icon: Package, active: pathname.includes('/products') },
    { to: `${base}/orders`, label: 'My Orders', icon: ClipboardList, active: pathname.includes('/orders') },
  ];

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card/60 sf-glass !rounded-none !border-y-0 !border-l-0">
      <div className="sticky top-0 flex max-h-screen flex-col gap-6 overflow-y-auto p-5">
        <Link to={base} className="flex items-center gap-3">
          {shopDetails.logo_url && (
            <Avatar className="h-10 w-10"><AvatarImage src={shopDetails.logo_url} /><AvatarFallback>{shopDetails.shop_name?.[0]}</AvatarFallback></Avatar>
          )}
          <span className="sf-heading text-lg font-bold leading-tight">{shopDetails.shop_name}</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon, active }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>

        {config.layout.nav.showCategories && categories.length > 0 && (
          <div>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Categories</p>
            <div className="flex flex-col gap-0.5">
              {categories.map((c) => (
                <Link
                  key={c}
                  to={`${base}/products?category=${encodeURIComponent(c)}`}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={onOpenCart}>
            <ShoppingBag className="h-4 w-4" /> Cart
            {totalItems > 0 && (
              <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">{totalItems}</span>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
};
