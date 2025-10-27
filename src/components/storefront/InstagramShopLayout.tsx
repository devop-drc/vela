"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Outlet, useSearchParams, useLocation } from 'react-router-dom'; // Import useSearchParams
import { StorefrontProvider, useStorefront } from '@/contexts/StorefrontContext';
import { InstagramShopHeader } from './InstagramShopHeader'; // Custom header
import { defaultSettings } from '@/contexts/AppearanceContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { CartProvider } from '@/contexts/CartContext';
import { RecentlyViewedProvider } from '@/contexts/RecentlyViewedContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { InstagramCartDrawer } from './InstagramCartDrawer'; // Import InstagramCartDrawer
import { cn } from '@/lib/utils';
import { loadGoogleFont } from '@/lib/fontUtils';
import { InstagramMyOrdersDrawer } from './InstagramMyOrdersDrawer'; // Import InstagramMyOrdersDrawer
import { supabase } from '@/integrations/supabase/client'; // Import supabase for order count
import { Drawer } from '@/components/ui/drawer'; // Import Drawer.Root
import { InstagramBottomNav } from './InstagramBottomNav'; // Import new bottom nav
import { InstagramDesktopSidebar } from './InstagramDesktopSidebar';
import { InstagramFilterDrawer } from './InstagramFilterDrawer'; // Import InstagramFilterDrawer
import { FloatingCartPill } from './FloatingCartPill';

// Function to apply fixed Instagram-like settings to the DOM
const applyInstagramShopSettingsToDOM = (isDark: boolean) => {
  const root = document.documentElement;

  // Reset any custom properties from AppearanceContext
  for (const key of Object.keys(defaultSettings)) {
    if (key.startsWith('--')) {
      root.style.removeProperty(key);
    }
  }
  root.style.removeProperty('--font-sans');
  root.style.removeProperty('--font-heading');
  root.classList.remove('blur-enabled');

  // Mark root so other code can detect we own the theme while in InstagramShop
  root.setAttribute('data-instagram-shop-theme', isDark ? 'dark' : 'light');
  root.classList.add('instagram-shop-theme');

  // Apply fixed Instagram-like styles (light/dark)
  if (isDark) {
    root.style.setProperty('--background', '0 0% 0%');
    root.style.setProperty('--foreground', '0 0% 98%');
    root.style.setProperty('--primary', '210 90% 56%');
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--muted', '0 0% 12%');
    root.style.setProperty('--muted-foreground', '0 0% 70%');
    root.style.setProperty('--border', '0 0% 20%');
    root.style.setProperty('--card', '0 0% 7%');
    root.style.setProperty('--input', '0 0% 12%');
  } else {
    root.style.setProperty('--background', '0 0% 100%');
    root.style.setProperty('--foreground', '0 0% 10%');
    root.style.setProperty('--primary', '210 90% 50%');
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--muted', '0 0% 95%');
    root.style.setProperty('--muted-foreground', '0 0% 45%');
    root.style.setProperty('--border', '0 0% 85%');
    root.style.setProperty('--card', '0 0% 100%');
    root.style.setProperty('--input', '0 0% 90%');
  }
  root.style.setProperty('--radius', '0.5rem'); // Slightly rounded corners

  // Fonts will be applied dynamically based on appearanceSettings below

  // Ensure no background overlay for InstagramShop
  const bgOverlay = document.getElementById('background-overlay');
  if (bgOverlay) {
    bgOverlay.style.backgroundImage = 'none';
    bgOverlay.style.backgroundColor = 'transparent';
    bgOverlay.style.filter = 'none';
  }

  // Inject/update a style tag with !important variables to prevent overrides
  const existing = document.getElementById('instagram-shop-theme-style') as HTMLStyleElement | null;
  const vars = getComputedStyle(root);
  const css = `:root{--background:${vars.getPropertyValue('--background').trim()} !important;--foreground:${vars.getPropertyValue('--foreground').trim()} !important;--primary:${vars.getPropertyValue('--primary').trim()} !important;--primary-foreground:${vars.getPropertyValue('--primary-foreground').trim()} !important;--muted:${vars.getPropertyValue('--muted').trim()} !important;--muted-foreground:${vars.getPropertyValue('--muted-foreground').trim()} !important;--border:${vars.getPropertyValue('--border').trim()} !important;--card:${vars.getPropertyValue('--card').trim()} !important;--input:${vars.getPropertyValue('--input').trim()} !important;--radius:${vars.getPropertyValue('--radius').trim()} !important;--font-sans:${vars.getPropertyValue('--font-sans').trim() || 'Montserrat, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'} !important;--font-heading:${vars.getPropertyValue('--font-heading').trim() || 'Montserrat, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'} !important;} body{font-family:var(--font-sans) !important;} h1,h2,h3,h4,h5,h6{font-family:var(--font-heading) !important;}`;
  if (existing) {
    existing.textContent = css;
  } else {
    const styleEl = document.createElement('style');
    styleEl.id = 'instagram-shop-theme-style';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }
};

const InstagramShopLayoutContent = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('instagram_shop_theme');
    if (saved === 'light') return false;
    if (saved === 'dark') return true;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('instagram_shop_theme');
      if (!saved) setIsDark(e.matches);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('instagram_shop_theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);
  const { shopDetails, products: allProducts, isLoading, error, convertCurrency, appearanceSettings } = useStorefront();
  const isMobile = useIsMobile();
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isMyOrdersDrawerOpen, setIsMyOrdersDrawerOpen] = useState(false); // New state for My Orders drawer
  const [myOrdersCount, setMyOrdersCount] = useState(0); // State for My Orders count
  const [searchParams, setSearchParams] = useSearchParams(); // Initialize useSearchParams
  const location = useLocation(); // Use useLocation to get current path

  // New state for filter drawer
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // New state for initial order ID to pass to the drawer
  const [initialOrderIdForDrawer, setInitialOrderIdForDrawer] = useState<string | null>(null);

  // Define header and bottom nav heights as CSS variables
  const HEADER_HEIGHT = '56px'; // h-14
  const BOTTOM_NAV_HEIGHT = '56px'; // h-14

  useEffect(() => {
    let applying = false;
    const safeApply = () => {
      if (applying) return;
      applying = true;
      applyInstagramShopSettingsToDOM(isDark);
      requestAnimationFrame(() => { applying = false; });
    };

    safeApply();
    // Notify listeners (e.g., bottom nav) that theme has been updated
    try { window.dispatchEvent(new CustomEvent('instagram-shop-theme-updated')); } catch {}
    const reapply = () => safeApply();
    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'instagram_shop_theme') reapply();
    };

    window.addEventListener('focus', reapply);
    document.addEventListener('visibilitychange', reapply);
    window.addEventListener('storage', storageHandler);
    const toggleListener = () => toggleTheme();
    window.addEventListener('instagram-shop-toggle-theme', toggleListener as EventListener);

    // Apply admin-selected fonts if available (fallback to Montserrat)
    try {
      const root = document.documentElement;
      const heading = (appearanceSettings as any)?.typography?.headings || (appearanceSettings as any)?.fonts?.headings || 'Montserrat';
      const body = (appearanceSettings as any)?.typography?.body || (appearanceSettings as any)?.fonts?.body || 'Montserrat';
      if (heading) loadGoogleFont(heading);
      if (body) loadGoogleFont(body);
      const fallback = 'Montserrat, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';
      if (body) root.style.setProperty('--font-sans', `"${body}", ${fallback}`);
      if (heading) root.style.setProperty('--font-heading', `"${heading}", ${fallback}`);
    } catch {}
    // Clean up styles when component unmounts or path changes away from instagramShop
    return () => {
      const root = document.documentElement;
      for (const key of Object.keys(defaultSettings)) {
        if (key.startsWith('--')) {
          root.style.removeProperty(key);
        }
      }
      root.style.removeProperty('--font-sans');
      root.style.removeProperty('--font-heading');
      root.classList.remove('blur-enabled');
      window.removeEventListener('focus', reapply);
      document.removeEventListener('visibilitychange', reapply);
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener('instagram-shop-toggle-theme', toggleListener as EventListener);
      const styleEl = document.getElementById('instagram-shop-theme-style');
      if (styleEl && styleEl.parentElement) styleEl.parentElement.removeChild(styleEl);
      // Re-apply default settings or main app settings if needed elsewhere
    };
  }, [appearanceSettings, isDark]);

  // Global events to open drawers from anywhere (e.g., floating pill / sidebar)
  useEffect(() => {
    const openCart = () => setIsCartModalOpen(true);
    const openOrders = () => setIsMyOrdersDrawerOpen(true);
    window.addEventListener('open-instagram-cart', openCart as EventListener);
    window.addEventListener('open-instagram-orders', openOrders as EventListener);
    return () => {
      window.removeEventListener('open-instagram-cart', openCart as EventListener);
      window.removeEventListener('open-instagram-orders', openOrders as EventListener);
    };
  }, []);

  // Dynamically set page title and meta description
  useEffect(() => {
    if (shopDetails) {
      document.title = shopDetails.username ? `@${shopDetails.username}` : shopDetails.shop_name || "Instagram Shop";
      // Update meta description (simplified for Instagram-like context)
      let metaDescriptionTag = document.querySelector('meta[name="description"]');
      if (!metaDescriptionTag) {
        metaDescriptionTag = document.createElement('meta');
        metaDescriptionTag.name = 'description';
        document.head.appendChild(metaDescriptionTag);
      }
      metaDescriptionTag.setAttribute('content', shopDetails.headline || shopDetails.about || `Shop the Instagram feed of ${shopDetails.shop_name}.`);

      // Set favicon
      const setFavicon = (url: string | null) => {
        let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (url) {
          if (link) {
            link.href = url;
          } else {
            link = document.createElement('link');
            link.rel = 'icon';
            link.href = url;
            document.head.appendChild(link);
          }
        } else {
          if (link) link.href = '/favicon.ico';
          else {
            link = document.createElement('link');
            link.rel = 'icon';
            link.href = '/favicon.ico';
            document.head.appendChild(link);
          }
        }
      };
      setFavicon(shopDetails.favicon_url || shopDetails.logo_url); // Use logo as favicon
    } else {
      document.title = "Instagram Shop";
      let metaDescriptionTag = document.querySelector('meta[name="description"]');
      if (metaDescriptionTag) metaDescriptionTag.setAttribute('content', "Discover unique products from various shops.");
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (link) link.remove();
    }
  }, [shopDetails]);

  // Effect to handle initialOrderId prop
  useEffect(() => {
    if (shopDetails) { // Ensure shopDetails are loaded before checking URL
      const orderIdFromUrl = searchParams.get('orderId');
      if (orderIdFromUrl) {
        setInitialOrderIdForDrawer(orderIdFromUrl);
        setIsMyOrdersDrawerOpen(true);
        // Clear the orderId from URL after processing
        searchParams.delete('orderId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, shopDetails, setSearchParams]); // Add shopDetails to dependencies

  // Fetch order count for the fixed button
  useEffect(() => {
    const fetchOrderCount = async () => {
      if (!shopDetails?.business_id) return;
      const customerEmail = localStorage.getItem('instagram_shop_customer_email');
      if (!customerEmail) return;

      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', shopDetails.business_id)
        .eq('customer_email', customerEmail)
        .in('status', ['Pending', 'Order Seen', 'Order Packaged', 'Given to Courier', 'Problematic']); // Only count active orders

      if (error) {
        console.error("Error fetching my orders count:", error);
      } else {
        setMyOrdersCount(count || 0);
      }
    };
    fetchOrderCount();
  }, [shopDetails?.business_id, isMyOrdersDrawerOpen]); // Re-fetch when drawer opens/closes

  // Determine if current route is the products feed page
  const isProductsFeedPage = location.pathname.includes('/products');

  // Memoize maxPrice for filter drawer
  const maxPrice = useMemo(() => {
    let currentMax = 0;
    allProducts.forEach(p => {
      if (p.price !== null) {
        const convertedPrice = convertCurrency(p.price, p.currency);
        if (convertedPrice > currentMax) {
          currentMax = convertedPrice;
        }
      }
    });
    return Math.ceil(currentMax / 10) * 10 || 100;
  }, [allProducts, convertCurrency]);

  // Memoize filter state for the drawer
  const [filters, setFilters] = useState({
    categories: searchParams.getAll('category') || [],
    tags: searchParams.getAll('tag') || [],
    priceRange: [0, maxPrice],
  });

  useEffect(() => {
    setFilters(prev => ({ ...prev, priceRange: [0, maxPrice] }));
  }, [maxPrice]);

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    const newSearchParams = new URLSearchParams();
    const sortOption = searchParams.get('sort') || "newest";
    if (sortOption !== 'newest') newSearchParams.set('sort', sortOption);
    newFilters.categories.forEach(cat => newSearchParams.append('category', cat));
    newFilters.tags.forEach(tag => newSearchParams.append('tag', tag));
    // Price range is handled internally by the drawer and passed to the products feed page via URL
    // For now, we'll just update the local state. The products feed page will read from URL.
    setSearchParams(newSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleResetFilters = useCallback(() => {
    setFilters({
      categories: [],
      tags: [],
      priceRange: [0, maxPrice],
    });
    setSearchParams({}, { replace: true });
  }, [maxPrice, setSearchParams]);


  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]" style={{ height: '100dvh' }}>
        <InstagramShopHeader onOpenCart={() => setIsCartModalOpen(true)} onOpenMyOrders={() => setIsMyOrdersDrawerOpen(true)} isProductsFeedPage={isProductsFeedPage} onOpenFilterDrawer={() => setIsFilterDrawerOpen(true)} />
        <main className="flex-1 container py-4 mt-14">
          <div className="flex flex-col items-center mb-8">
            <Skeleton className="h-24 w-24 rounded-full mb-4" />
            <Skeleton className="h-6 w-48 mb-2" />
            <div className="flex gap-4 mb-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-4 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="grid grid-cols-3 gap-1 w-full max-w-md">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center text-center p-8 bg-[hsl(var(--background))] text-[hsl(var(--foreground))]" style={{ height: '100dvh' }}>
        <h1 className="text-xl md:text-2xl font-bold text-red-600">Error Loading Instagram Shop</h1>
        <p className="text-sm md:text-base text-gray-600 mt-2">{error}</p>
        <p className="text-xs md:text-sm text-gray-500 mt-4">Please check the URL or contact support.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] mb-[--instagram-bottom-nav-height]">
      <style>{`
        :root {
          --instagram-header-height: ${HEADER_HEIGHT};
          --instagram-bottom-nav-height: ${BOTTOM_NAV_HEIGHT};
          --sat: env(safe-area-inset-top, 0px);
          --sab: env(safe-area-inset-bottom, 0px);
          --sal: env(safe-area-inset-left, 0px);
          --sar: env(safe-area-inset-right, 0px);
          --vh: 100dvh;
        }
      `}</style>
      <InstagramDesktopSidebar onToggleTheme={toggleTheme} isDark={isDark} />
      <div className="flex flex-col flex-1 md:pl-[244px]">
        <div className="md:hidden">
          <InstagramShopHeader
            onOpenCart={() => setIsCartModalOpen(true)}
            onOpenMyOrders={() => setIsMyOrdersDrawerOpen(true)}
            isProductsFeedPage={isProductsFeedPage}
            onOpenFilterDrawer={() => setIsFilterDrawerOpen(true)}
          />
        </div>
        <main className="flex-1 flex justify-center">
        <Outlet context={{
          isFilterDrawerOpen,
          setIsFilterDrawerOpen,
          filters,
          handleFilterChange,
          handleResetFilters,
          maxPrice,
          allProducts,
          convertCurrency,
        }} />
        </main>
      </div>
      <Sonner />
      <InstagramCartDrawer isOpen={isCartModalOpen} onClose={() => setIsCartModalOpen(false)} />
      <InstagramMyOrdersDrawer
        isOpen={isMyOrdersDrawerOpen}
        onClose={() => setIsMyOrdersDrawerOpen(false)}
        initialOrderId={initialOrderIdForDrawer}
        onOrderOpened={() => setInitialOrderIdForDrawer(null)}
      />
      <InstagramFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        products={allProducts}
        currentFilters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
      />
      {/* Floating cart pill for quick access to cart/checkout */}
      <FloatingCartPill label="Checkout" />
      <div className="md:hidden">
        <InstagramBottomNav onOpenCart={() => setIsCartModalOpen(true)} onOpenMyOrders={() => setIsMyOrdersDrawerOpen(true)} myOrdersCount={myOrdersCount} />
      </div>
    </div>
  );
};

const InstagramShopLayout = () => (
  <StorefrontProvider>
    <CartProvider>
      <RecentlyViewedProvider>
        <InstagramShopLayoutContent />
      </RecentlyViewedProvider>
    </CartProvider>
  </StorefrontProvider>
);

export default InstagramShopLayout;