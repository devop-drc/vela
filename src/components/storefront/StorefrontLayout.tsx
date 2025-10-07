import { useEffect, useState, useRef } from 'react';
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
import { StorefrontBottomNav } from './StorefrontBottomNav'; // Import the new bottom nav
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
};

const StorefrontLayoutContent = () => {
  const { shopDetails, appearanceSettings, isLoading, error, products } = useStorefront();
  const isMobile = useIsMobile();
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false); // State for mobile sidebar
  const [isDesktopFilterSidebarOpen, setIsDesktopFilterSidebarOpen] = useState(false); // State for desktop sidebar
  const [isCartCheckoutModalOpen, setIsCartCheckoutModalOpen] = useState(false); // State for cart/checkout modal
  const footerRef = useRef<HTMLDivElement>(null);

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

      // Set favicon
      const setFavicon = (url: string) => {
        let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (link) {
          link.href = url;
        } else {
          link = document.createElement('link');
          link.rel = 'icon';
          link.href = url;
          document.head.appendChild(link);
        }
      };

      if (shopDetails.favicon_url) {
        const proxiedFaviconUrl = `https://images.weserv.nl/?url=${encodeURIComponent(shopDetails.favicon_url)}&w=32&h=32&fit=contain&mask=circle`;
        setFavicon(proxiedFaviconUrl);
      }
    } else {
      document.title = "Storefront";
      const metaDescriptionTag = document.querySelector('meta[name="description"]');
      if (metaDescriptionTag) metaDescriptionTag.setAttribute('content', "Discover unique products from various shops.");
    }
  }, [appearanceSettings, shopDetails]);

  // Autohide/Autoshow desktop filter sidebar based on footer visibility
  useEffect(() => {
    if (isMobile || !footerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const footerHeight = entry.boundingClientRect.height;
          const intersectionRatio = entry.intersectionRect.height / footerHeight;
          
          // If footer overlaps by more than 20%, hide the sidebar
          if (intersectionRatio > 0.2) {
            setIsDesktopFilterSidebarOpen(false);
          } else if (intersectionRatio <= 0.2 && window.location.pathname.includes('/products')) {
            // If footer is mostly out of view and on products page, show sidebar
            setIsDesktopFilterSidebarOpen(true);
          }
        });
      },
      { threshold: [0, 0.2, 0.8, 1] } // Observe at different intersection ratios
    );

    observer.observe(footerRef.current);

    return () => {
      if (footerRef.current) {
        observer.unobserve(footerRef.current);
      }
    };
  }, [isMobile, footerRef, setIsDesktopFilterSidebarOpen]);

  // Reset desktop filter sidebar state when navigating away from /products
  useEffect(() => {
    if (!window.location.pathname.includes('/products')) {
      setIsDesktopFilterSidebarOpen(false);
    } else {
      // Only open if not mobile and on products page
      if (!isMobile) {
        setIsDesktopFilterSidebarOpen(true);
      }
    }
  }, [window.location.pathname, isMobile]);


  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <StorefrontHeader onOpenCart={() => setIsCartCheckoutModalOpen(true)} isDesktopSidebarOpen={false} />
        <main className="flex-1 container py-8 mt-16"> {/* Added mt-16 to main for header */}
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

  const headerHeight = '3.5rem'; // 56px for mobile, 64px for desktop
  const floatingHeaderOffset = '1rem'; // 16px
  const mainContentPaddingTop = appearanceSettings?.layoutStyle === 'floating' ? `calc(${headerHeight} + ${floatingHeaderOffset} + ${floatingHeaderOffset})` : headerHeight;

  return (
    <div className="flex flex-col min-h-screen">
      <div id="background-overlay" className="fixed inset-0 z-[-1] transition-colors" />
      <StorefrontHeader 
        onToggleFilterSidebar={() => setIsFilterSidebarOpen(true)} 
        onOpenCart={() => setIsCartCheckoutModalOpen(true)}
        isDesktopSidebarOpen={isDesktopFilterSidebarOpen} // Pass desktop sidebar state
      />
      <main className="flex-1 overflow-y-auto" style={{ paddingTop: mainContentPaddingTop, paddingBottom: isMobile ? '4rem' : '0' }}> {/* Add padding-bottom for mobile nav */}
        <Outlet context={{ 
          onToggleFilterSidebar: () => setIsFilterSidebarOpen(true), 
          isFilterSidebarOpen, 
          setIsFilterSidebarOpen, 
          products,
          // Pass desktop sidebar state to Outlet context as well
          isDesktopFilterSidebarOpen,
          setIsDesktopFilterSidebarOpen,
        }} />
      </main>
      <StorefrontFooter ref={footerRef} />
      <StorefrontBottomNav /> {/* Render the new bottom navigation */}
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