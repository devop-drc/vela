// New custom storefront layout. Wires data (StorefrontProvider), cart, theme
// tokens (StorefrontThemeProvider), chrome (header/footer/bottom-nav) and the
// cart presentation. Routes render into <Outlet/>.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
  // Dedup incoming config so the editor's heartbeat only re-renders (and re-inits
  // GSAP) when something actually changed.
  const lastCfgJson = useRef('');

  const config = useMemo(
    () => (isPreview && previewConfig ? previewConfig : normalizeConfig(appearanceSettings)),
    [isPreview, previewConfig, appearanceSettings]
  );

  // When the cart is presented as a full page, "open cart" must navigate there
  // (the drawer/modal don't render) — otherwise every cart trigger is a dead
  // click and the shop is unshoppable.
  const openCart = () => {
    if (config.components.cart === 'page' && shopDetails?.slug) {
      navigate({ pathname: `/shop/${shopDetails.slug}/cart`, ...(isPreview ? { search: '?preview=1' } : {}) });
    } else open();
  };

  useEffect(() => {
    if (!isPreview) return;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'sf-preview-config' && e.data.config) {
        const json = JSON.stringify(e.data.config);
        if (json !== lastCfgJson.current) {
          lastCfgJson.current = json;
          setPreviewConfig(e.data.config as StorefrontConfig);
        }
      }
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
        else if (t === 'cart') openCart();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview, shopDetails?.slug, products, navigate, open, config.components.cart]);

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
  // Only reserve space for the mobile bottom bar when it's actually shown
  // (otherwise every page has ~80px of dead space in hamburger mode).
  const mainPad = config.layout.nav.mobileBottomBar ? 'pb-[calc(5rem+var(--sab,0px))] md:pb-0' : '';

  return (
    <StorefrontThemeProvider config={config} className="min-h-screen flex flex-col">
      {sidebarNav ? (
        <>
          {/* Mobile keeps the top header; desktop navigation lives in the rail. */}
          <div className="md:hidden"><Header onOpenCart={openCart} /></div>
          <div className="flex flex-1">
            <SidebarNav onOpenCart={openCart} />
            <div className="flex min-w-0 flex-1 flex-col">
              <main className={cn('flex-1', mainPad)}>
                <Outlet />
              </main>
              <Footer />
            </div>
          </div>
        </>
      ) : (
        <>
          <Header onOpenCart={openCart} />
          <main className={cn('flex-1', mainPad)}>
            <Outlet />
          </main>
          <Footer />
        </>
      )}
      <BottomNav onOpenCart={openCart} />
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
