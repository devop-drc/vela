"use client";

import { useEffect, useState, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { StorefrontProvider, useStorefront } from '@/contexts/StorefrontContext';
import { InstagramShopHeader } from './InstagramShopHeader'; // Custom header
import { defaultSettings } from '@/contexts/AppearanceContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { CartProvider } from '@/contexts/CartContext';
import { RecentlyViewedProvider } from '@/contexts/RecentlyViewedContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { StorefrontCartModal } from './StorefrontCartModal';
import { cn } from '@/lib/utils';
import { loadGoogleFont } from '@/lib/fontUtils';

// Function to apply settings to the DOM, similar to AppearanceContext
const applyStorefrontSettingsToDOM = (settings: any, shopDetails: any) => {
  const root = document.documentElement;
  const effectiveSettings = { ...defaultSettings, ...settings }; // Merge with defaults

  for (const [key, value] of Object.entries(effectiveSettings)) {
    if (key.startsWith('--')) {
      root.style.setProperty(key, value as string);
    }
  }
  if (effectiveSettings.fontSans) {
    root.style.setProperty('--font-sans', `'${effectiveSettings.fontSans}', sans-serif`);
    loadGoogleFont(effectiveSettings.fontSans); // Load font for storefront
  }
  if (effectiveSettings.fontHeading) {
    root.style.setProperty('--font-heading', `'${effectiveSettings.fontHeading}', sans-serif`);
    loadGoogleFont(effectiveSettings.fontHeading); // Load font for storefront
  }

  if (effectiveSettings.blurEnabled) {
    root.classList.add('blur-enabled');
  } else {
    root.classList.remove('blur-enabled');
  }

  const bgOverlay = document.getElementById('background-overlay');
  if (!bgOverlay) return;

  if (effectiveSettings.backgroundImageUrl) {
    bgOverlay.style.backgroundImage = `url(${effectiveSettings.backgroundImageUrl})`;
    bgOverlay.style.backgroundColor = 'transparent';
    bgOverlay.style.backgroundSize = effectiveSettings.backgroundSize || 'cover';
    bgOverlay.style.backgroundRepeat = effectiveSettings.backgroundRepeat || 'no-repeat';
    bgOverlay.style.backgroundPosition = 'center';
  } else if (effectiveSettings.solidBackgroundColor) {
    bgOverlay.style.backgroundImage = 'none';
    bgOverlay.style.backgroundColor = `hsl(${effectiveSettings.solidBackgroundColor})`;
  } else {
    // Fallback to transparent if no specific background is set
    bgOverlay.style.backgroundImage = 'none';
    bgOverlay.style.backgroundColor = 'transparent';
  }
  
  bgOverlay.style.filter = `
    brightness(${effectiveSettings.backgroundBrightness || 100}%)
    contrast(${effectiveSettings.backgroundContrast || 100}%)
    saturate(${effectiveSettings.backgroundSaturation || 100}%)
    hue-rotate(${effectiveSettings.backgroundHue || 0}deg)
  `;

  // Dynamically set page title and meta description
  if (shopDetails) {
    document.title = shopDetails.shop_name || "Storefront";

    // Update meta description
    let metaDescriptionTag = document.querySelector('meta[name="description"]');
    if (!metaDescriptionTag) {
      metaDescriptionTag = document.createElement('meta');
      metaDescriptionTag.name = 'description';
      document.head.appendChild(metaDescriptionTag);
    }
    metaDescriptionTag.setAttribute('content', shopDetails.headline || shopDetails.about || `Welcome to ${shopDetails.shop_name}'s online store.`);

    // Update Open Graph title
    let ogTitleTag = document.querySelector('meta[property="og:title"]');
    if (!ogTitleTag) {
      ogTitleTag = document.createElement('meta');
      ogTitleTag.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitleTag);
    }
    ogTitleTag.setAttribute('content', shopDetails.shop_name || "Storefront");

    // Update Open Graph description
    let ogDescriptionTag = document.querySelector('meta[property="og:description"]');
    if (!ogDescriptionTag) {
      ogDescriptionTag = document.createElement('meta');
      ogDescriptionTag.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescriptionTag);
    }
    ogDescriptionTag.setAttribute('content', shopDetails.headline || shopDetails.about || `Welcome to ${shopDetails.shop_name}'s online store.`);

    // Update Open Graph image
    let ogImageTag = document.querySelector('meta[property="og:image"]');
    if (!ogImageTag) {
      ogImageTag = document.createElement('meta');
      ogImageTag.setAttribute('property', 'og:image');
      document.head.appendChild(ogImageTag);
    }
    ogImageTag.setAttribute('content', shopDetails.logo_url || '');

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
        // Fallback to default favicon if none is provided
        if (link) link.href = '/favicon.ico';
        else {
          link = document.createElement('link');
          link.rel = 'icon';
          link.href = '/favicon.ico';
          document.head.appendChild(link);
        }
      }
    };

    if (shopDetails.favicon_url) {
      setFavicon(shopDetails.favicon_url);
    } else {
      setFavicon(null); // Explicitly remove favicon if no URL is provided
    }
    
  } else {
    document.title = "Storefront";
    let metaDescriptionTag = document.querySelector('meta[name="description"]');
    if (metaDescriptionTag) metaDescriptionTag.setAttribute('content', "Discover unique products from various shops.");
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.remove(); // Remove default favicon if shopDetails not loaded
  }
};

const InstagramShopLayoutContent = () => {
  const { shopDetails, appearanceSettings, isLoading, error, products } = useStorefront();
  const isMobile = useIsMobile();
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [isDesktopFilterSidebarOpen, setIsDesktopFilterSidebarOpen] = useState(false);
  const [wasDesktopFilterSidebarExplicitlyOpened, setWasDesktopFilterSidebarExplicitlyOpened] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (appearanceSettings || shopDetails) {
      applyStorefrontSettingsToDOM(appearanceSettings, shopDetails);
    } else {
      applyStorefrontSettingsToDOM(defaultSettings, null);
    }
  }, [appearanceSettings, shopDetails]);

  // Reset desktop filter sidebar state when navigating away from /products
  useEffect(() => {
    if (!location.pathname.includes('/products')) {
      setIsDesktopFilterSidebarOpen(false);
      setWasDesktopFilterSidebarExplicitlyOpened(false);
    } else {
      if (!isMobile && wasDesktopFilterSidebarExplicitlyOpened) {
        setIsDesktopFilterSidebarOpen(true);
      }
    }
  }, [location.pathname, isMobile, wasDesktopFilterSidebarExplicitlyOpened]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <InstagramShopHeader onOpenCart={() => setIsCartModalOpen(true)} isDesktopSidebarOpen={false} setIsDesktopFilterSidebarOpen={setIsDesktopFilterSidebarOpen} setWasDesktopFilterSidebarExplicitlyOpened={setWasDesktopFilterSidebarExplicitlyOpened} />
        <main className="flex-1 container py-8 mt-16">
          <Skeleton className="h-10 w-1/2 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center text-center p-8">
        <h1 className="text-xl md:text-2xl font-bold text-destructive">Error Loading Storefront</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-2">{error}</p>
        <p className="text-xs md:text-sm text-muted-foreground mt-4">Please check the URL or contact support.</p>
      </div>
    );
  }

  const headerHeight = '3.5rem'; // 56px for mobile, 64px for desktop
  const mainContentPaddingTop = headerHeight; // No floating header for this layout

  return (
    <div className="flex flex-col min-h-screen">
      <div id="background-overlay" className="fixed inset-0 z-[-1] transition-colors" />
      <InstagramShopHeader
        onOpenCart={() => setIsCartModalOpen(true)}
        isDesktopSidebarOpen={isDesktopFilterSidebarOpen}
        setIsDesktopFilterSidebarOpen={setIsDesktopFilterSidebarOpen}
        setWasDesktopFilterSidebarExplicitlyOpened={setWasDesktopFilterSidebarExplicitlyOpened}
      />
      <main className="flex-1 overflow-y-auto" style={{ paddingTop: mainContentPaddingTop }}>
        <Outlet context={{
          onToggleFilterSidebar: () => setIsFilterSidebarOpen(true),
          isFilterSidebarOpen,
          setIsFilterSidebarOpen,
          products,
          isDesktopFilterSidebarOpen,
          setIsDesktopFilterSidebarOpen,
          setWasDesktopFilterSidebarExplicitlyOpened,
        }} />
      </main>
      <Sonner />
      <StorefrontCartModal isOpen={isCartModalOpen} onClose={() => setIsCartModalOpen(false)} />
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