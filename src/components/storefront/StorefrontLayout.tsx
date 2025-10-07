import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { StorefrontProvider, useStorefront } from '@/contexts/StorefrontContext';
import { StorefrontHeader } from './StorefrontHeader';
import { StorefrontFooter } from './StorefrontFooter';
import { defaultSettings } from '@/contexts/AppearanceContext'; // Import default settings
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster as Sonner } from "@/components/ui/sonner"; // Import Sonner
import { CartProvider } from '@/contexts/CartContext'; // Import CartProvider
import { RecentlyViewedProvider } from '@/contexts/RecentlyViewedContext'; // Import RecentlyViewedProvider
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile
import { StorefrontCartCheckoutModal } from './StorefrontCartCheckoutModal'; // Import the new modal
import { cn } from '@/lib/utils'; // Import cn for conditional classnames

// Function to apply settings to the DOM, similar to AppearanceContext
const applyStorefrontSettingsToDOM = (settings: any) => {
  const root = document.documentElement;
  const effectiveSettings = { ...defaultSettings, ...settings }; // Merge with defaults

  for (const [key, value] of Object.entries(effectiveSettings)) {
    if (key.startsWith('--')) {
      root.style.setProperty(key, value as string);
    }
  }
  if (effectiveSettings.fontSans) {
    root.style.setProperty('--font-sans', `'${effectiveSettings.fontSans}', sans-serif`);
  }
  if (effectiveSettings.fontHeading) {
    root.style.setProperty('--font-heading', `'${effectiveSettings.fontHeading}', sans-serif`);
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
    bgOverlay.style.backgroundColor = `hsl(${effectiveSettings['--background']})`;
  }
  
  bgOverlay.style.filter = `
    brightness(${effectiveSettings.backgroundBrightness || 100}%)
    contrast(${effectiveSettings.backgroundContrast || 100}%)
    saturate(${effectiveSettings.backgroundSaturation || 100}%)
    hue-rotate(${effectiveSettings.backgroundHue || 0}deg)
  `;
};

const StorefrontLayoutContent = () => {
  const { shopDetails, appearanceSettings, isLoading, error, products } = useStorefront();
  const isMobile = useIsMobile();
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false); // State for mobile sidebar
  const [isCartCheckoutModalOpen, setIsCartCheckoutModalOpen] = useState(false); // State for cart/checkout modal

  useEffect(() => {
    if (appearanceSettings) {
      applyStorefrontSettingsToDOM(appearanceSettings);
    } else {
      // Apply default settings if none are found
      applyStorefrontSettingsToDOM(defaultSettings);
    }

    // Dynamically set page title and meta description
    if (shopDetails) {
      document.title = shopDetails.shop_name || "Storefront";
      const metaDescriptionTag = document.querySelector('meta[name="description"]');
      if (metaDescriptionTag) {
        metaDescriptionTag.setAttribute('content', shopDetails.headline || shopDetails.about || `Welcome to ${shopDetails.shop_name}'s online store.`);
      }
      const ogTitleTag = document.querySelector('meta[property="og:title"]');
      if (ogTitleTag) ogTitleTag.setAttribute('content', shopDetails.shop_name || "Storefront");
      const ogDescriptionTag = document.querySelector('meta[property="og:description"]');
      if (ogDescriptionTag) ogDescriptionTag.setAttribute('content', shopDetails.headline || shopDetails.about || `Welcome to ${shopDetails.shop_name}'s online store.`);
      const ogImageTag = document.querySelector('meta[property="og:image"]');
      if (ogImageTag) ogImageTag.setAttribute('content', shopDetails.logo_url || ''); // Ensure og:image is set
    } else {
      document.title = "Storefront";
      const metaDescriptionTag = document.querySelector('meta[name="description"]');
      if (metaDescriptionTag) metaDescriptionTag.setAttribute('content', "Discover unique products from various shops.");
    }
  }, [appearanceSettings, shopDetails]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <StorefrontHeader onOpenCart={() => setIsCartCheckoutModalOpen(true)} />
        <main className="flex-1 container py-8">
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
        <h1 className="text-2xl font-bold text-destructive">Error Loading Storefront</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <p className="text-sm text-muted-foreground mt-4">Please check the URL or contact support.</p>
      </div>
    );
  }

  const headerHeight = '4rem'; // 64px
  const floatingHeaderOffset = '1rem'; // 16px
  const mainContentPaddingTop = appearanceSettings?.layoutStyle === 'floating' ? `calc(${headerHeight} + ${floatingHeaderOffset} + ${floatingHeaderOffset})` : headerHeight;

  return (
    <div className="flex flex-col min-h-screen">
      <div id="background-overlay" className="fixed inset-0 z-[-1] transition-colors" />
      <StorefrontHeader 
        onToggleFilterSidebar={() => setIsFilterSidebarOpen(true)} 
        onOpenCart={() => setIsCartCheckoutModalOpen(true)}
      />
      <main className="flex-1 overflow-y-auto" style={{ paddingTop: mainContentPaddingTop }}>
        <Outlet context={{ onToggleFilterSidebar: () => setIsFilterSidebarOpen(true), isFilterSidebarOpen, setIsFilterSidebarOpen, products }} />
      </main>
      <StorefrontFooter />
      <Sonner />
      <StorefrontCartCheckoutModal isOpen={isCartCheckoutModalOpen} onClose={() => setIsCartCheckoutModalOpen(false)} />
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