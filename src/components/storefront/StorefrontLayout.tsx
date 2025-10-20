"use client";

import { useEffect, useState, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { StorefrontProvider, useStorefront } from '@/contexts/StorefrontContext';
import { StorefrontHeader } from './StorefrontHeader';
import { StorefrontFooter } from './StorefrontFooter';
import { defaultSettings } from '@/contexts/AppearanceContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { CartProvider } from '@/contexts/CartContext';
import { RecentlyViewedProvider } from '@/contexts/RecentlyViewedContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { StorefrontCartModal } from './StorefrontCartModal';
import { StorefrontBottomNav } from './StorefrontBottomNav';
import { cn } from '@/lib/utils';
import { loadGoogleFont } from '@/lib/fontUtils';

const applyStorefrontSettingsToDOM = (settings: any, shopDetails: any) => {
  const root = document.documentElement;
  const effectiveSettings = { ...defaultSettings, ...settings };

  for (const [key, value] of Object.entries(effectiveSettings)) {
    if (key.startsWith('--')) {
      root.style.setProperty(key, value as string);
    }
  }
  if (effectiveSettings.fontSans) {
    root.style.setProperty('--font-sans', `'${effectiveSettings.fontSans}', sans-serif`);
    loadGoogleFont(effectiveSettings.fontSans);
  }
  if (effectiveSettings.fontHeading) {
    root.style.setProperty('--font-heading', `'${effectiveSettings.fontHeading}', sans-serif`);
    loadGoogleFont(effectiveSettings.fontHeading);
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
    bgOverlay.style.backgroundImage = 'none';
    bgOverlay.style.backgroundColor = 'transparent';
  }
  
  bgOverlay.style.filter = `
    brightness(${effectiveSettings.backgroundBrightness || 100}%)
    contrast(${effectiveSettings.backgroundContrast || 100}%)
    saturate(${effectiveSettings.backgroundSaturation || 100}%)
    hue-rotate(${effectiveSettings.backgroundHue || 0}deg)
  `;

  if (shopDetails) {
    document.title = shopDetails.shop_name || "Storefront";

    let metaDescriptionTag = document.querySelector('meta[name="description"]');
    if (!metaDescriptionTag) {
      metaDescriptionTag = document.createElement('meta');
      metaDescriptionTag.name = 'description';
      document.head.appendChild(metaDescriptionTag);
    }
    metaDescriptionTag.setAttribute('content', shopDetails.headline || shopDetails.about || `Welcome to ${shopDetails.shop_name}'s online store.`);

    let ogTitleTag = document.querySelector('meta[property="og:title"]');
    if (!ogTitleTag) {
      ogTitleTag = document.createElement('meta');
      ogTitleTag.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitleTag);
    }
    ogTitleTag.setAttribute('content', shopDetails.shop_name || "Storefront");

    let ogDescriptionTag = document.querySelector('meta[property="og:description"]');
    if (!ogDescriptionTag) {
      ogDescriptionTag = document.createElement('meta');
      ogDescriptionTag.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescriptionTag);
    }
    ogDescriptionTag.setAttribute('content', shopDetails.headline || shopDetails.about || `Welcome to ${shopDetails.shop_name}'s online store.`);

    let ogImageTag = document.querySelector('meta[property="og:image"]');
    if (!ogImageTag) {
      ogImageTag = document.createElement('meta');
      ogImageTag.setAttribute('property', 'og:image');
      document.head.appendChild(ogImageTag);
    }
    ogImageTag.setAttribute('content', shopDetails.logo_url || '');

    const setFavicon = (url: string | null) => {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      const effectiveUrl = url || '/favicon.ico'; // Use default if null
      
      if (link) {
        link.href = effectiveUrl;
      } else {
        link = document.createElement('link');
        link.rel = 'icon';
        link.href = effectiveUrl;
        document.head.appendChild(link);
      }
    };

    setFavicon(shopDetails.favicon_url);
    
  } else {
    document.title = "Storefront";
    let metaDescriptionTag = document.querySelector('meta[name="description"]');
    if (metaDescriptionTag) metaDescriptionTag.setAttribute('content', "Discover unique products from various shops.");
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.remove();
  }
};

const StorefrontLayoutContent = () => {
  const { shopDetails, appearanceSettings, isLoading, error, products } = useStorefront();
  const isMobile = useIsMobile();
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [isDesktopFilterSidebarOpen, setIsDesktopFilterSidebarOpen] = useState(false);
  const [wasDesktopFilterSidebarExplicitlyOpened, setWasDesktopFilterSidebarExplicitlyOpened] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const footerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  if (location.pathname.includes('/instagramShop')) {
    return null;
  }

  useEffect(() => {
    if (appearanceSettings || shopDetails) {
      applyStorefrontSettingsToDOM(appearanceSettings, shopDetails);
    } else {
      applyStorefrontSettingsToDOM(defaultSettings, null);
    }
  }, [appearanceSettings, shopDetails]);

  useEffect(() => {
    if (isMobile || !footerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const footerHeight = entry.boundingClientRect.height;
          const intersectionRatio = entry.intersectionRect.height / footerHeight;
          
          if (intersectionRatio > 0.2) {
            setIsDesktopFilterSidebarOpen(false);
          } else if (intersectionRatio <= 0.2 && window.location.pathname.includes('/products')) {
            if (wasDesktopFilterSidebarExplicitlyOpened) {
              setIsDesktopFilterSidebarOpen(true);
            }
          }
        });
      },
      { threshold: [0, 0.2, 0.8, 1] }
    );

    observer.observe(footerRef.current);

    return () => {
      if (footerRef.current) {
        observer.unobserve(footerRef.current);
      }
    };
  }, [isMobile, footerRef, setIsDesktopFilterSidebarOpen, wasDesktopFilterSidebarExplicitlyOpened]);

  useEffect(() => {
    if (!window.location.pathname.includes('/products')) {
      setIsDesktopFilterSidebarOpen(false);
      setWasDesktopFilterSidebarExplicitlyOpened(false);
    } else {
      if (!isMobile && wasDesktopFilterSidebarExplicitlyOpened) {
        setIsDesktopFilterSidebarOpen(true);
      }
    }
  }, [window.location.pathname, isMobile, wasDesktopFilterSidebarExplicitlyOpened]);


  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <StorefrontHeader onOpenCart={() => setIsCartModalOpen(true)} isDesktopSidebarOpen={false} setIsDesktopFilterSidebarOpen={setIsDesktopFilterSidebarOpen} setWasDesktopFilterSidebarExplicitlyOpened={setWasDesktopFilterSidebarExplicitlyOpened} />
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
        <StorefrontFooter />
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

  const headerHeight = '3.5rem';
  const floatingHeaderOffset = '1rem';
  const mainContentPaddingTop = appearanceSettings?.layoutStyle === 'floating' ? `calc(${headerHeight} + ${floatingHeaderOffset} + ${floatingHeaderOffset})` : headerHeight;

  return (
    <div className="flex flex-col min-h-screen">
      <div id="background-overlay" className="fixed inset-0 z-[-1] transition-colors" />
      <StorefrontHeader
        onToggleFilterSidebar={() => setIsFilterSidebarOpen(true)}
        onOpenCart={() => setIsCartModalOpen(true)}
        isDesktopSidebarOpen={isDesktopFilterSidebarOpen}
        setIsDesktopFilterSidebarOpen={setIsDesktopFilterSidebarOpen}
        setWasDesktopFilterSidebarExplicitlyOpened={setWasDesktopFilterSidebarExplicitlyOpened}
      />
      <main className="flex-1 overflow-y-auto" style={{ paddingTop: mainContentPaddingTop, paddingBottom: isMobile ? '4rem' : '0' }}>
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
      <StorefrontFooter ref={footerRef} />
      <StorefrontBottomNav onOpenCart={() => setIsCartModalOpen(true)} />
      <Sonner />
      <StorefrontCartModal isOpen={isCartModalOpen} onClose={() => setIsCartModalOpen(false)} />
    </div>
  );
};

const StorefrontLayout = () => (
  <StorefrontProvider>
    <CartProvider>
      <RecentlyViewedProvider>
        <StorefrontLayoutContent />
      </RecentlyViewedProvider>
    </CartProvider>
  </StorefrontProvider>
);

export default StorefrontLayout;