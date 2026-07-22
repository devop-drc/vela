// New custom storefront layout. Wires data (StorefrontProvider), cart, theme
// tokens (StorefrontThemeProvider), chrome (header/footer/bottom-nav) and the
// cart presentation. Routes render into <Outlet/>.

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { toast } from 'sonner';
import { sft, getVisitorLang } from '../lib/visitorPrefs';
import { Reveal } from '@/lib/anim';

// Page transition for storefront route changes: a soft fade + small upward
// slide, keyed on pathname so the entrance replays on every navigation
// (Home → Products → Product → Cart → Orders). Reuses the app-wide GSAP Reveal,
// which already skips animation under prefers-reduced-motion. Only the inner
// page content animates — the chrome + StorefrontThemeProvider stay mounted, so
// the Studio preview's postMessage/theme wiring is never remounted or disturbed.
// `enabled=false` (config.effects.motion === 'none') opts out entirely.
const AnimatedOutlet = ({ enabled }: { enabled: boolean }) => {
  const location = useLocation();
  if (!enabled) return <Outlet />;
  return (
    <Reveal playKey={location.pathname} from="up" duration={0.32}>
      <Outlet />
    </Reveal>
  );
};

const Chrome = () => {
  const { shopDetails, appearanceSettings, products } = useStorefront();
  const { open } = useCartUI();
  const location = useLocation();
  const navigate = useNavigate();
  useStorefrontTypeRedirect('custom');

  // Preview bridge: when embedded as ?preview=1, accept live config from the
  // editor via postMessage and apply it instantly (no reload).
  // Preview is STICKY for the iframe's lifetime. Once the editor loads us with
  // ?preview=1, internal storefront navigations (product/cart/footer links) drop
  // the query string — re-deriving from location.search would then flip us back
  // to the live/applied theme mid-edit. Capture once so the draft keeps applying.
  const [isPreview] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1');
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

  // Returning from the RaiAccept hosted form: checkout sends the gateway back
  // to the exact page the customer paid from, so the ?payment= result can land
  // on ANY storefront route. Surface it here and clean the URL. /orders keeps
  // its own richer handling (success overlay + order highlight) — skip it.
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const p = sp.get('payment');
    if (!p || location.pathname.endsWith('/orders')) return;
    const lang = getVisitorLang();
    if (p === 'success') toast.success(sft(lang, 'paymentSuccess'), { description: sft(lang, 'paymentSuccessSub') });
    else if (p === 'cancelled') toast.info(sft(lang, 'paymentCancelled'));
    else toast.error(sft(lang, 'paymentFailed'));
    sp.delete('payment');
    sp.delete('orderId');
    navigate({ search: sp.toString() ? `?${sp.toString()}` : '' }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  // Scroll restoration: SPA route changes keep the previous scroll position,
  // so tapping "Shop" from a scrolled homepage landed mid-page. Reset to top
  // on every pathname change (hash links and in-page anchors are unaffected).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  // Document title + favicon + per-shop SEO meta. Google renders SPAs, so a
  // correct title/description/OG/canonical per shop lets merchant storefronts
  // rank on their own name.
  useEffect(() => {
    if (!shopDetails) return;
    document.title = shopDetails.shop_name || 'Storefront';

    const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
      if (!content) return;
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.content = content;
    };
    const desc = shopDetails.headline || shopDetails.about ||
      `${shopDetails.shop_name} — dyqan online. Porosit me kartë ose para në dorë.`;
    const url = `https://instantshop.al/shop/${shopDetails.slug}`;
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', shopDetails.shop_name || 'Storefront');
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:url', url);
    if (shopDetails.logo_url) setMeta('property', 'og:image', shopDetails.logo_url);
    let canon = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; document.head.appendChild(canon); }
    canon.href = url;
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
  // Animate page swaps unless the merchant disabled motion for the storefront.
  const pageMotion = config.effects.motion !== 'none';
  // Only reserve space for the mobile bottom bar when it's actually shown
  // (otherwise every page has ~80px of dead space in hamburger mode). The
  // reserve lives BELOW the footer — on main it left the footer itself
  // hidden under the fixed bar.
  const navReserve = config.layout.nav.mobileBottomBar ? 'pb-[calc(5rem+var(--sab,0px))] md:pb-0' : '';

  return (
    <StorefrontThemeProvider config={config} isPreview={isPreview} className="min-h-screen flex flex-col">
      {sidebarNav ? (
        <>
          {/* Mobile keeps the top header; desktop navigation lives in the rail. */}
          <div className="md:hidden"><Header onOpenCart={openCart} /></div>
          <div className="flex flex-1">
            <SidebarNav onOpenCart={openCart} />
            <div className="flex min-w-0 flex-1 flex-col">
              <main className="flex-1">
                <AnimatedOutlet enabled={pageMotion} />
              </main>
              <div className={navReserve}><Footer /></div>
            </div>
          </div>
        </>
      ) : (
        <>
          <Header onOpenCart={openCart} />
          <main className="flex-1">
            <AnimatedOutlet enabled={pageMotion} />
          </main>
          <div className={navReserve}><Footer /></div>
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
