import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { StorefrontProvider, useStorefront } from '@/contexts/StorefrontContext';
import { StorefrontHeader } from './StorefrontHeader';
import { StorefrontFooter } from './StorefrontFooter';
import { defaultSettings } from '@/contexts/AppearanceContext'; // Import default settings
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster as Sonner } from "@/components/ui/sonner"; // Import Sonner

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
  const { shopDetails, appearanceSettings, isLoading, error } = useStorefront();

  useEffect(() => {
    if (appearanceSettings) {
      applyStorefrontSettingsToDOM(appearanceSettings);
    } else {
      // Apply default settings if none are found
      applyStorefrontSettingsToDOM(defaultSettings);
    }
    if (shopDetails?.shop_name) {
      document.title = shopDetails.shop_name;
    } else {
      document.title = "Storefront";
    }
  }, [appearanceSettings, shopDetails]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <StorefrontHeader />
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

  return (
    <div className="flex flex-col min-h-screen">
      <div id="background-overlay" className="fixed inset-0 z-[-1] transition-colors" />
      <StorefrontHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <StorefrontFooter />
      <Sonner /> {/* Add Sonner for notifications */}
    </div>
  );
};

const StorefrontLayout = () => (
  <StorefrontProvider>
    <StorefrontLayoutContent />
  </StorefrontProvider>
);

export default StorefrontLayout;