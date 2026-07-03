// New custom storefront layout. Wires data (StorefrontProvider), cart, theme
// tokens (StorefrontThemeProvider), chrome (header/footer/bottom-nav) and the
// cart presentation. Routes render into <Outlet/>.

import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { StorefrontProvider, useStorefront } from '@/contexts/StorefrontContext';
import { CartProvider } from '@/contexts/CartContext';
import { RecentlyViewedProvider } from '@/contexts/RecentlyViewedContext';
import { useStorefrontTypeRedirect } from '@/hooks/useStorefrontTypeRedirect';
import { normalizeConfig } from '../config';
import type { StorefrontConfig } from '../config/types';
import { StorefrontThemeProvider } from '../theme/StorefrontThemeProvider';
import { Header } from '../components/Header';
import { SidebarNav } from '../components/SidebarNav';
import { Footer } from '../components/Footer';
import { BottomNav } from '../components/BottomNav';
import { Cart, CartUIProvider, useCartUI } from '../components/Cart';
import { Toaster as Sonner } from '@/components/ui/sonner';

const Chrome = () => {
  const { shopDetails, appearanceSettings, products } = useStorefront();
  const { open } = useCartUI();
  const location = useLocation();
  const navigate = useNavigate();
  useStorefrontTypeRedirect('custom');

  // Preview bridge: when embedded as ?preview=1, accept live config from the
  // editor via postMessage and apply it instantly (no reload).
  const isPreview = typeof window !== 'undefined' && new URLSearchParams(location.search).get('preview') === '1';
  const [previewConfig, setPreviewConfig] = useState<StorefrontConfig | null>(null);

  useEffect(() => {
    if (!isPreview) return;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'sf-preview-config' && e.data.config) setPreviewConfig(e.data.config as StorefrontConfig);
      // Smart navigation: the editor sends a semantic target when a setting is
      // only visible on a specific page/element; we resolve the concrete route
      // here (we know the slug + the first product).
      if (e.data?.type === 'sf-preview-navigate' && e.data.target && shopDetails?.slug) {
        const base = `/shop/${shopDetails.slug}`;
        const keepPreview = { search: '?preview=1' };
        const t = e.data.target as string;
        if (t === 'products') navigate({ pathname: `${base}/products`, ...keepPreview });
        else if (t === 'productDetail') {
          const first = products?.[0];
          navigate(first ? { pathname: `${base}/product/${first.id}`, ...keepPreview } : { pathname: `${base}/products`, ...keepPreview });
        } else if (t === 'orders') navigate({ pathname: `${base}/orders`, ...keepPreview });
        else if (t === 'cart') open();
        else if (t === 'footer') {
          navigate({ pathname: base, ...keepPreview });
          setTimeout(() => document.querySelector('footer')?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 350);
        } else {
          // 'home' — top of the homepage (hero/header/banner edits live here).
          navigate({ pathname: base, ...keepPreview });
          setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
        }
      }
    };
    window.addEventListener('message', onMsg);
    // Tell the parent editor we're ready to receive config.
    window.parent?.postMessage({ type: 'sf-preview-ready' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, [isPreview, shopDetails?.slug, products, navigate, open]);

  const config = useMemo(
    () => (isPreview && previewConfig ? previewConfig : normalizeConfig(appearanceSettings)),
    [isPreview, previewConfig, appearanceSettings]
  );

  // Document title + favicon.
  useEffect(() => {
    if (!shopDetails) return;
    document.title = shopDetails.shop_name || 'Storefront';
    const setFavicon = (url: string | null) => {
      document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((e) => e.parentNode?.removeChild(e));
      const href = url || '/favicon.ico';
      ['icon', 'shortcut icon', 'apple-touch-icon'].forEach((rel) => {
        const link = document.createElement('link');
        link.rel = rel as any; link.href = href;
        document.head.appendChild(link);
      });
    };
    setFavicon(shopDetails.favicon_url || shopDetails.logo_url || null);
  }, [shopDetails]);

  // The Instagram layout owns the /instagramShop routes.
  if (location.pathname.includes('/instagramShop')) return null;

  const sidebarNav = config.layout.nav.desktop === 'sidebar';

  return (
    <StorefrontThemeProvider config={config} className="min-h-screen flex flex-col">
      {sidebarNav ? (
        <>
          {/* Mobile keeps the top header; desktop navigation lives in the rail. */}
          <div className="md:hidden"><Header onOpenCart={open} /></div>
          <div className="flex flex-1">
            <SidebarNav onOpenCart={open} />
            <div className="flex min-w-0 flex-1 flex-col">
              <main className="flex-1 pb-20 md:pb-0">
                <Outlet />
              </main>
              <Footer />
            </div>
          </div>
        </>
      ) : (
        <>
          <Header onOpenCart={open} />
          <main className="flex-1 pb-20 md:pb-0">
            <Outlet />
          </main>
          <Footer />
        </>
      )}
      <BottomNav onOpenCart={open} />
      <Cart />
      <Sonner />
    </StorefrontThemeProvider>
  );
};

const StorefrontLayout = () => (
  <StorefrontProvider>
    <CartProvider>
      <RecentlyViewedProvider>
        <CartUIProvider>
          <Chrome />
        </CartUIProvider>
      </RecentlyViewedProvider>
    </CartProvider>
  </StorefrontProvider>
);

export default StorefrontLayout;
