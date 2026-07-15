// Config-driven storefront homepage: renders config.pages.home through the
// SectionRenderer. Handles loading / empty / error states.

import { Wrench, Mail } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';
import { SectionRenderer } from '../blocks/SectionRenderer';
import { SfButton } from '../components/SfButton';

export const HomePage = () => {
  const { shopDetails, products, isLoading, isLoadingMore, hasMoreProducts, bestSellers, recommendedProducts, error } = useStorefront();
  const config = useStorefrontConfig();

  if (isLoading) {
    return (
      <div className="sf-container py-8">
        <Skeleton className="h-96 w-full mb-12" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2"><Skeleton className="aspect-square w-full" /><Skeleton className="h-4 w-3/4" /></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) return <div className="sf-container py-8 text-destructive">{error}</div>;
  if (!shopDetails) return <div className="sf-container py-8 text-center text-muted-foreground">Shop details not found.</div>;

  // Only show the empty state once loading has genuinely finished AND there is
  // truly nothing to display from any source (main products, best sellers, or
  // recommended). During the initial load `isLoading` already short-circuits
  // above; here we also guard against the case where a page is still being
  // fetched (`isLoadingMore` / `hasMoreProducts`) so we never flash
  // "Under Construction" while products are on their way.
  const hasAnyProducts =
    (products?.length ?? 0) > 0 ||
    (bestSellers?.length ?? 0) > 0 ||
    (recommendedProducts?.length ?? 0) > 0;

  if (!hasAnyProducts && !isLoadingMore && !hasMoreProducts) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center text-muted-foreground p-8">
        <Wrench className="h-24 w-24 text-primary mb-8" />
        <h1 className="sf-heading text-4xl font-bold mb-4">Store Under Construction</h1>
        <p className="text-lg max-w-xl mb-8">We're busy curating amazing products for you! Our shop will be available soon.</p>
        {shopDetails.contact_email && (
          <SfButton asChild variant="outline" size="lg">
            <a href={`mailto:${shopDetails.contact_email}`} className="flex items-center gap-2"><Mail className="h-5 w-5" /> Contact Us</a>
          </SfButton>
        )}
      </div>
    );
  }

  return (
    <div className="sf-container py-8">
      <SectionRenderer sections={config.pages.home} />
    </div>
  );
};
