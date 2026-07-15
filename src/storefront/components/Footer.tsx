// Storefront footer — variant from config.layout.footer.variant.
//  rich    — brand story + explore + contact (default)
//  columns — link directory: uppercase-label columns incl. shop categories
//  minimal — single slim row
//  hidden  — nothing

import { Link } from 'react-router-dom';
import { forwardRef, useMemo } from 'react';
import { Mail, Instagram } from 'lucide-react';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';

export const Footer = forwardRef<HTMLDivElement>((_, ref) => {
  const { shopDetails, products } = useStorefront();
  const config = useStorefrontConfig();
  const categories = useMemo(() => {
    const s = new Set<string>();
    (products || []).forEach((p) => { if (p.category) s.add(p.category); });
    return Array.from(s).sort((a, b) => a.localeCompare(b)).slice(0, 6);
  }, [products]);
  if (!shopDetails) return null;
  const variant = config.layout.footer.variant;
  if (variant === 'hidden') return <div ref={ref} />;

  const base = `/shop/${shopDetails.slug}`;
  const year = new Date().getFullYear();

  if (variant === 'minimal') {
    return (
      <footer ref={ref} className="border-t mt-12 py-8">
        <div className="sf-container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span className="sf-heading font-semibold text-foreground">{shopDetails.shop_name}</span>
          <span>© {year} {shopDetails.shop_name}</span>
        </div>
      </footer>
    );
  }

  const links = (
    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
      <Link to={base} className="hover:text-primary">Home</Link>
      <Link to={`${base}/products`} className="hover:text-primary">Shop</Link>
      <Link to={`${base}/orders`} className="hover:text-primary">My Orders</Link>
    </div>
  );

  if (variant === 'columns') {
    const Col = ({ title, children }: { title: string; children: React.ReactNode }) => (
      <div>
        <h4 className="sf-eyebrow mb-3">{title}</h4>
        {children}
      </div>
    );
    return (
      <footer ref={ref} className="border-t mt-16 py-12">
        <div className="sf-container grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-8">
          <Col title="Pages">{links}</Col>
          <Col title="Categories">
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              {categories.length > 0
                ? categories.map((c) => (
                    <Link key={c} to={`${base}/products?category=${encodeURIComponent(c)}`} className="hover:text-primary">{c}</Link>
                  ))
                : <Link to={`${base}/products`} className="hover:text-primary">All products</Link>}
            </div>
          </Col>
          <Col title="Contact">
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              {shopDetails.contact_email && (
                <a href={`mailto:${shopDetails.contact_email}`} className="flex items-center gap-2 hover:text-primary"><Mail className="h-4 w-4" /> Email us</a>
              )}
              {shopDetails.instagram_url && (
                <a href={shopDetails.instagram_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary"><Instagram className="h-4 w-4" /> Instagram</a>
              )}
            </div>
          </Col>
          <Col title={shopDetails.shop_name}>
            {shopDetails.headline && <p className="text-sm text-muted-foreground">{shopDetails.headline}</p>}
          </Col>
        </div>
        <div className="sf-container mt-10 flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
          <span className="sf-heading font-semibold text-foreground">{shopDetails.shop_name}</span>
          <span>© {year} {shopDetails.shop_name}. All rights reserved.</span>
        </div>
      </footer>
    );
  }

  return (
    <footer ref={ref} className="border-t mt-16 py-12">
      <div className="sf-container grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <h3 className="sf-heading font-bold text-lg mb-2">{shopDetails.shop_name}</h3>
          {shopDetails.headline && <p className="text-sm text-muted-foreground max-w-xs">{shopDetails.headline}</p>}
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3">Explore</h4>
          {links}
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3">Get in touch</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {shopDetails.contact_email && (
              <a href={`mailto:${shopDetails.contact_email}`} className="flex items-center gap-2 hover:text-primary"><Mail className="h-4 w-4" /> {shopDetails.contact_email}</a>
            )}
            {shopDetails.instagram_url && (
              <a href={shopDetails.instagram_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary"><Instagram className="h-4 w-4" /> Instagram</a>
            )}
          </div>
        </div>
      </div>
      <div className="sf-container mt-8 pt-6 border-t text-xs text-muted-foreground text-center">© {year} {shopDetails.shop_name}. All rights reserved.</div>
    </footer>
  );
});
Footer.displayName = 'Footer';
