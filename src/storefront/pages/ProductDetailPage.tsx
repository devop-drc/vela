// Product detail — composed from config.pages.productDetail via the block
// registry. The page resolves the product + shared state and provides it
// through ProductDetailContext; gallery/info-column blocks render in the
// two-column area (arrangement from components.productGalleryLayout), the
// rest full-width below.

import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Loader2, ArrowLeft, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SfButton } from '../components/SfButton';
import { toast } from 'sonner';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useCart } from '@/contexts/CartContext';
import { useRecentlyViewed } from '@/contexts/RecentlyViewedContext';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';
import { getBlockDef, DETAIL_INFO_COLUMN_TYPES } from '../blocks/registry';
import { ProductDetailContext, ProductDetailState } from '../blocks/detail/detailBlocks';
import { DEFAULT_PRODUCT_DETAIL_SECTIONS } from '../config/defaults';
import { flyToCart } from '../lib/flyToCart';
import { SectionInstance } from '../config/types';
import { activePromotionsFor, computePrice } from '../lib/pricing';
import { optionEntries, detailEntries, filterKeyTitle } from '@/components/filters/filterVisibility';
import { useVariantOptionsFor, mergeOptionEntries } from '@/hooks/useVariantOptions';

const renderBlock = (section: SectionInstance) => {
  const def = getBlockDef(section.type);
  if (!def) return null;
  const Block = def.component;
  return <Block key={section.id} props={{ ...(def.defaultProps || {}), ...section.props }} />;
};

export const ProductDetailPage = () => {
  const { shopSlug, productId } = useParams<{ shopSlug: string; productId: string }>();
  const { shopDetails, products, isLoading, error, convertCurrency, promotions, fetchProductById, hasMoreProducts, fetchMoreProducts } = useStorefront();
  const config = useStorefrontConfig();
  const { addToCart } = useCart();
  const { addRecentlyViewed } = useRecentlyViewed();
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [deepLinkResolved, setDeepLinkResolved] = useState(false);
  // Real purchase options live in product_variants (batched, session-cached).
  const variantInfo = useVariantOptionsFor(productId);

  useEffect(() => { window.scrollTo(0, 0); setQuantity(1); setSelected({}); setDeepLinkResolved(false); }, [productId]);

  const product = products.find((p) => p.id === productId);

  // Deep link: if the product isn't in the loaded page, fetch it directly by id
  // (single server round-trip) instead of paginating the whole catalog.
  useEffect(() => {
    if (product || isLoading || deepLinkResolved || !productId) return;
    let cancelled = false;
    fetchProductById(productId).finally(() => { if (!cancelled) setDeepLinkResolved(true); });
    return () => { cancelled = true; };
  }, [product, isLoading, deepLinkResolved, productId, fetchProductById]);

  // Safety net: if the direct fetch couldn't find it (e.g. the endpoint is
  // unavailable), fall back to paging through the catalog like before.
  useEffect(() => {
    if (!product && deepLinkResolved && !isLoading && hasMoreProducts) fetchMoreProducts();
  }, [product, deepLinkResolved, isLoading, hasMoreProducts, fetchMoreProducts]);

  useEffect(() => {
    if (product && shopDetails?.slug) {
      addRecentlyViewed({ id: product.id, name: product.name, media_url: product.media_url, price: product.price || 0, currency: product.currency || shopDetails.currency || 'USD', shopSlug: shopDetails.slug });
    }
  }, [product, shopDetails?.slug, addRecentlyViewed]);

  const related = useMemo(() => {
    if (!product) return [];
    const limit = config.layout.productGrid.columns;
    const candidates = products.filter((p) => p.id !== product.id);
    // Prefer products in the same category, then fall back to others to fill up to `limit`.
    const sameCategory = product.category ? candidates.filter((p) => p.category === product.category) : [];
    const others = candidates.filter((p) => !sameCategory.includes(p));
    return [...sameCategory, ...others].slice(0, limit);
  }, [products, product, config.layout.productGrid.columns]);

  if (isLoading || (!product && (!deepLinkResolved || hasMoreProducts))) {
    return (
      <div className="sf-container py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading product…</p>
      </div>
    );
  }
  if (error) return <div className="sf-container py-8 text-center text-destructive">{error}</div>;
  if (!product) {
    return (
      <div className="sf-container py-16 text-center text-muted-foreground">
        <h1 className="sf-heading text-2xl font-bold">Product Not Found</h1>
        <SfButton asChild className="mt-4"><Link to={`/shop/${shopSlug}/products`}><Home className="mr-2 h-4 w-4" /> Back to Shop</Link></SfButton>
      </div>
    );
  }

  const media = product.media_gallery?.length ? product.media_gallery : product.media_url ? [product.media_url] : [];
  const base = convertCurrency(product.price, product.currency);
  const promos = activePromotionsFor(promotions as any, product.id);
  const { original, discounted, hasDiscount } = computePrice(base, promos);
  const isOutOfStock = product.status === 'Out of Stock' || (product.pricing_type === 'one_time' && (product.inventory ?? 0) <= 0);

  // Shape-aware details parsing (scalar, array, variant-object and spec-list
  // shapes all normalize to [name, string[]]), merged with the product's real
  // variant combinations from product_variants.
  const options = mergeOptionEntries(optionEntries(product.details), variantInfo.options);
  const optionNames = new Set(options.map(([k]) => k));
  const specs = detailEntries(product.details)
    .filter(([k, vals]) => vals.length > 0 && !optionNames.has(k))
    .map(([k, vals]) => [filterKeyTitle(k), vals] as [string, string[]]);

  const addToCartHandler = (sourceEl?: HTMLElement) => {
    if (isOutOfStock) { toast.error('This product is currently out of stock.'); return; }
    // Require a choice for every option group (color/size/material) before adding.
    const missing = options.find(([key]) => !selected[key]);
    if (missing) { toast.error(`Please choose a ${missing[0]} first.`); return; }
    if (sourceEl) flyToCart(sourceEl, product.media_type === 'video' ? undefined : product.media_url);
    addToCart({
      productId: product.id, name: product.name,
      price: hasDiscount ? discounted! : original!, originalPrice: original!, isDiscounted: hasDiscount,
      currency: shopDetails!.currency || 'USD', media_url: product.media_url, media_type: product.media_type as any,
      selectedOptions: Object.keys(selected).length ? selected : undefined,
      pricing_type: product.pricing_type, product_type: (product as any).product_type, billing_interval: product.billing_interval,
    } as any, quantity);
  };

  const state: ProductDetailState = {
    product, media, original, discounted, hasDiscount, promos, isOutOfStock,
    options, specs, selected, setSelected, quantity, setQuantity, addToCartHandler, related,
  };

  // Compose from config; sections with unknown types (e.g. future 'reviews')
  // are skipped by renderBlock.
  const configured = config.pages.productDetail?.length ? config.pages.productDetail : DEFAULT_PRODUCT_DETAIL_SECTIONS;
  const enabled = configured.filter((s) => s.enabled);
  const gallerySections = enabled.filter((s) => s.type === 'gallery');
  const infoSections = enabled.filter((s) => DETAIL_INFO_COLUMN_TYPES.has(s.type));
  const belowSections = enabled.filter((s) => s.type !== 'gallery' && !DETAIL_INFO_COLUMN_TYPES.has(s.type));

  const galleryLayout = config.components.productGalleryLayout;
  // With no images (common right after an Instagram import) the gallery column
  // is empty — collapse to a single column so there's no blank half. 'top' and
  // 'full-bleed' also stack; 'top' constrains the info block for a focused read.
  const hasGallery = media.length > 0 && gallerySections.length > 0;
  const stacked = galleryLayout === 'full-bleed' || galleryLayout === 'top' || !hasGallery;

  return (
    <ProductDetailContext.Provider value={state}>
      <div className="sf-container py-6 md:py-8">
        <Link to={`/shop/${shopSlug}/products`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Products</Link>
        <div className={cn('grid gap-8 lg:gap-12', stacked ? 'grid-cols-1' : 'lg:grid-cols-2')}>
          {hasGallery && (
            <div className={cn(galleryLayout === 'sticky-split' && 'lg:sticky lg:top-20 lg:self-start')}>
              {gallerySections.map(renderBlock)}
            </div>
          )}
          <div className={cn('space-y-5', galleryLayout === 'top' && hasGallery && 'mx-auto w-full max-w-2xl')}>{infoSections.map(renderBlock)}</div>
        </div>
        {belowSections.map(renderBlock)}
      </div>
    </ProductDetailContext.Provider>
  );
};
