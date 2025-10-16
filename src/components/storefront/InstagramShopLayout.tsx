"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Outlet, useSearchParams, useLocation } from 'react-router-dom'; // Import useSearchParams and useLocation
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
import { InstagramFilterDrawer } from './InstagramFilterDrawer'; // Import InstagramFilterDrawer

// Function to apply fixed Instagram-like settings to the DOM
const applyInstagramShopSettingsToDOM = () => {
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

  // Apply fixed Instagram-like styles
  root.style.setProperty('--background', '0 0% 100%'); // White background
  root.style.setProperty('--foreground', '0 0% 10%'); // Near-black text
  root.style.setProperty('--primary', '210 90% 50%'); // Instagram blue-ish
  root.style.setProperty('--primary-foreground', '0 0% 100%'); // White text
  root.style.setProperty('--muted', '0 0% 95%'); // Light gray for muted elements
  root.style.setProperty('--muted-foreground', '0 0% 45%'); // Darker gray for muted text
  root.style.setProperty('--border', '0 0% 85%'); // Light gray border
  root.style.setProperty('--card', '0 0% 100%'); // White card background
  root.style.setProperty('--input', '0 0% 90%'); // Light gray input background
  root.style.setProperty('--radius', '0.5rem'); // Slightly rounded corners

  // Use system fonts for Instagram-like feel
  root.style.setProperty('--font-sans', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif');
  root.style.setProperty('--font-heading', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif');

  // Ensure no background overlay for InstagramShop
  const bgOverlay = document.getElementById('background-overlay');
  if (bgOverlay) {
    bgOverlay.style.backgroundImage = 'none';
    bgOverlay.style.backgroundColor = 'transparent';
    bgOverlay.style.filter = 'none';
  }
};

const InstagramShopLayoutContent = () => {
  const { shopDetails, products: allProducts, isLoading, error, convertCurrency } = useStorefront(); // Removed appearanceSettings as it's ignored here
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
    applyInstagramShopSettingsToDOM();
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
      // Re-apply default settings or main app settings if needed elsewhere
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
      <div className="flex flex-col min-h-screen bg-white text-black" style={{ height: '100dvh' }}>
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
      <div className="flex flex-col min-h-screen items-center justify-center text-center p-8 bg-white text-black" style={{ height: '100dvh' }}>
        <h1 className="text-xl md:text-2xl font-bold text-red-600">Error Loading Instagram Shop</h1>
        <p className="text-sm md:text-base text-gray-600 mt-2">{error}</p>
        <p className="text-xs md:text-sm text-gray-500 mt-4">Please check the URL or contact support.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-black" style={{ height: '100dvh' }}>
      <style>{`
        :root {
          --instagram-header-height: ${HEADER_HEIGHT};
          --instagram-bottom-nav-height: ${BOTTOM_NAV_HEIGHT};
        }
      `}</style>
      <InstagramShopHeader
        onOpenCart={() => setIsCartModalOpen(true)}
        onOpenMyOrders={() => setIsMyOrdersDrawerOpen(true)}
        isProductsFeedPage={isProductsFeedPage}
        onOpenFilterDrawer={() => setIsFilterDrawerOpen(true)} // Pass the setter
      />
      <main className="flex-1 overflow-y-auto" style={{ paddingTop: 'var(--instagram-header-height)', paddingBottom: 'var(--instagram-bottom-nav-height)' }}>
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
      <Sonner />
      <InstagramCartDrawer isOpen={isCartModalOpen} onClose={() => setIsCartModalOpen(false)} />
      
      {/* My Orders Drawer */}
      <Drawer open={isMyOrdersDrawerOpen} onOpenChange={setIsMyOrdersDrawerOpen} shouldScaleBackground>
        <InstagramMyOrdersDrawer
          isOpen={isMyOrdersDrawerOpen}
          onClose={() => setIsMyOrdersDrawerOpen(false)}
          initialOrderId={initialOrderIdForDrawer} // Pass the initial order ID
          onOrderOpened={() => setInitialOrderIdForDrawer(null)} // Clear after order is opened
        />
      </Drawer>

      {/* Instagram Filter Drawer */}
      <InstagramFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        products={allProducts}
        currentFilters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
      />

      {/* New Instagram Bottom Nav */}
      <InstagramBottomNav onOpenCart={() => setIsCartModalOpen(true)} onOpenMyOrders={() => setIsMyOrdersDrawerOpen(true)} myOrdersCount={myOrdersCount} />
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