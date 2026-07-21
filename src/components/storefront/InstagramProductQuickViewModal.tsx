"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, Minus, Plus, ArrowLeft, Star, Truck, Sparkles } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/formatters";
import { activePromotionsFor, computePrice, promotionBadgeLabel } from "@/storefront/lib/pricing";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getAttributeIcon } from "@/lib/attributeIcons";
import { useVariantOptionsFor } from "@/hooks/useVariantOptions";

interface InstagramProductQuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  shopSlug: string;
}

const DetailDisplayRow = ({ label, icon: Icon, children }: { label: string, icon: React.ElementType, children: React.ReactNode }) => (
    <div className="flex flex-col">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <Icon className="h-3 w-3 text-red-500" />
          {label}
        </Label>
        <div className="font-medium flex flex-wrap items-center gap-1 text-sm pt-1">
            {children}
        </div>
    </div>
);

export const InstagramProductQuickViewModal = ({ isOpen, onClose, productId, shopSlug }: InstagramProductQuickViewModalProps) => {
  const { shopDetails, products, isLoading, error, convertCurrency, promotions } = useStorefront();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!api) return;
    setCurrentSlide(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrentSlide(api.selectedScrollSnap());
    });
  }, [api]);

  const product = products.find(p => p.id === productId);

  // Options come from the batched variant layer (one shared query per feed,
  // usually primed from the server payload) instead of a per-open
  // product_options fetch. Same derivation policy as InstagramProductCardFull:
  // single-option products map 1:1 to variants; for multi-option products a
  // value shows the cheapest combination's price delta and the max purchasable
  // inventory among combinations containing it.
  const variantSummary = useVariantOptionsFor(product?.id);
  const options = useMemo(() => {
    const names = Object.keys(variantSummary.options);
    if (names.length === 0) return [];
    const defaultVariant = variantSummary.variants.find(v => v.is_default) || null;
    return names.map((name) => ({
      id: name,
      name,
      values: variantSummary.options[name].map((value) => {
        const matching = variantSummary.variants.filter(v => v.option_values[name] === value);
        const inventory = matching.reduce((m, v) => Math.max(m, v.inventory), 0);
        const cheapestDiff = matching.length
          ? Math.min(...matching.map(v => v.price_difference))
          : 0;
        return {
          id: `${name}:${value}`,
          value,
          // price_difference stored in ALL; convert on the fly for display math
          price_difference: convertCurrency(cheapestDiff, 'ALL'),
          inventory,
          is_active: matching.length > 0,
          is_default: defaultVariant ? defaultVariant.option_values[name] === value : false,
        };
      }),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantSummary, convertCurrency]);

  // Initialize defaults when the product (or its freshly-arrived options) change.
  useEffect(() => {
    if (options.length === 0) {
      setSelectedValues({});
      return;
    }
    const defaults: Record<string, string> = {};
    options.forEach(opt => {
      const def = opt.values.find(v => v.is_default && v.is_active && v.inventory > 0) || opt.values.find(v => v.is_active && v.inventory > 0) || opt.values[0];
      if (def) defaults[opt.name] = def.value;
    });
    setSelectedValues(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, options.length]);

  useEffect(() => {
    if (product) {
      setQuantity(1); // Reset quantity when product changes
      // Note: selectedValues is now managed by the options useEffect
    }
  }, [product]);

  // Sum of the selected options' price deltas. Declared BEFORE the early
  // returns below so the hook order stays identical across loading/loaded
  // renders — otherwise a loading→loaded transition (e.g. a focus revalidate
  // flipping isLoading while this modal is open) changes the hook count and
  // React throws "rendered more hooks than during the previous render".
  const optionsPriceDelta = useMemo(() => {
    if (!options.length) return 0;
    let delta = 0;
    options.forEach(opt => {
      const sel = selectedValues[opt.name];
      if (!sel) return;
      const val = opt.values.find(v => v.value === sel);
      if (val) delta += val.price_difference || 0;
    });
    return delta;
  }, [options, selectedValues]);

  if (isLoading || !shopDetails) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md bg-background text-foreground rounded-lg h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b border-border pb-4 flex-shrink-0">
            <DialogTitle className="text-xl font-bold text-foreground">Product Details</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center py-8 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !product) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md bg-background text-foreground rounded-lg h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b border-border pb-4 flex-shrink-0">
            <DialogTitle className="text-xl font-bold text-foreground">Product Not Found</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground flex-1">
            <p>The product you are looking for does not exist or is no longer available.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const mediaItems = product.media_gallery?.length ? product.media_gallery : (product.media_url ? [product.media_url] : []);
  
  const baseDisplayPrice = convertCurrency(product.price, product.currency);
  const originalDisplayPrice = baseDisplayPrice != null ? (baseDisplayPrice + optionsPriceDelta) : null;

  const isOutOfStock = product.status === 'Out of Stock' || (product.pricing_type === 'one_time' && product.inventory <= 0);

  const activePromotions = activePromotionsFor(promotions as any, product.id);
  const { discounted: discountedPrice, hasDiscount } = computePrice(originalDisplayPrice, activePromotions);

  const getPromotionBadge = (promo: any) =>
    promotionBadgeLabel(promo, undefined, (v) => formatCurrency(v, shopDetails?.currency));

  const handleAddToCart = () => {
    if (!shopDetails?.slug) {
      toast.error("Shop details not available.");
      return;
    }
    if (isOutOfStock) {
      toast.error("This product is currently out of stock.");
      return;
    }
    // A product with no price (AI extraction left it null → shows "N/A") can't
    // be sold; guard here so it never enters the cart as a free line.
    if (originalDisplayPrice == null) {
      toast.error("This product isn't available for purchase yet.");
      return;
    }

    const selectedOptions: { [key: string]: string | string[] } = { ...selectedValues };

    const mediaType: 'image' | 'video' | undefined = product.media_type === 'VIDEO' ? 'video' : (product.media_type === 'IMAGE' ? 'image' : undefined);
    addToCart({
      productId: product.id,
      name: product.name,
      price: hasDiscount ? discountedPrice : originalDisplayPrice,
      originalPrice: originalDisplayPrice,
      isDiscounted: hasDiscount,
      currency: shopDetails.currency || 'USD',
      media_url: product.media_url,
      media_type: mediaType,
      slug: shopDetails.slug,
      selectedOptions: Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined,
      pricing_type: product.pricing_type,
      product_type: product.product_type,
      billing_interval: product.billing_interval,
    }, quantity);
    onClose(); // Close modal after adding to cart
  };

  const allDetails = Object.entries(product.details || {}).filter(([key, value]) => key !== 'type' && value && (!Array.isArray(value) || value.length > 0));
  const otherOptions = allDetails.filter(([key]) => !options.some(opt => opt.name.toLowerCase() === key.toLowerCase()) && key !== 'type');

  const primaryColorClass = hasDiscount ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-700 hover:bg-red-800 text-white";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background text-foreground rounded-lg h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b border-border flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-foreground">Product Details</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">Quick view of {product.name}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="p-4 space-y-4">
            {/* Product Media */}
            <div>
              <Carousel setApi={setApi} className="w-full rounded-lg overflow-hidden border border-border">
                <CarouselContent>
                  {mediaItems.map((url: string, index: number) => (
                    <CarouselItem key={index}>
                      <div className="relative aspect-square w-full bg-muted flex items-center justify-center">
                        <MediaItem src={url} alt={`${product.name} - image ${index + 1}`} className={cn(isOutOfStock && "grayscale")} />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {mediaItems.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </>
                )}
              </Carousel>
              {mediaItems.length > 1 && (
                <ScrollArea className="mt-2 pb-2">
                  <div className="flex gap-1 justify-center">
                    {mediaItems.map((url: string, index: number) => (
                      <span
                        key={index}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          index === currentSlide ? "bg-red-500" : "bg-muted-foreground/40"
                        )}
                      />
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                <span>{product.category || 'Uncategorized'}</span>
                {product.details?.type && <span> &middot; {product.details.type}</span>}
              </p>
              <h1 className="text-2xl font-bold text-foreground leading-tight flex flex-wrap items-center gap-2">
                {product.name}
                {isOutOfStock && (
                  <Badge variant="secondary" className="text-sm bg-amber-500 text-white flex-shrink-0">
                    Sold Out
                  </Badge>
                )}
                {activePromotions.length > 0 && !isOutOfStock && (
                  <div className="flex gap-1 flex-shrink-0">
                    {activePromotions.map(promo => (
                      <Badge key={promo.id} className="bg-green-500 text-white text-sm">
                        {getPromotionBadge(promo)}
                      </Badge>
                    ))}
                  </div>
                )}
              </h1>
              <div className="flex items-baseline gap-3">
                {hasDiscount && originalDisplayPrice !== null ? (
                  <>
                    <p className="text-base text-muted-foreground line-through">
                      {formatCurrency(originalDisplayPrice, shopDetails?.currency)}
                    </p>
                    <p className={cn("text-2xl font-bold", isOutOfStock ? "text-muted-foreground" : "text-green-600")}>
                      {formatCurrency(discountedPrice, shopDetails?.currency)}
                      {product.pricing_type === 'subscription' && (
                          <span className="text-base font-light text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {originalDisplayPrice != null ? formatCurrency(originalDisplayPrice, shopDetails?.currency) : 'N/A'}
                    {product.pricing_type === 'subscription' && (
                        <span className="text-base font-light text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">{product.caption || "No description provided."}</p>

            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag: string) => <Badge key={tag} variant="outline" className="text-xs bg-muted text-foreground border-border">{tag}</Badge>)}
              </div>
            )}

            {/* Options */}
            {(options.length > 0 || otherOptions.length > 0) && (
              <div className="space-y-4 pt-2">
                {options.length > 0 && options.map((opt) => (
                  <div key={opt.id} className="space-y-2">
                    <Label className="text-sm text-foreground capitalize">{opt.name}</Label>
                    <div className="flex flex-wrap gap-2">
                      {opt.values.map(val => {
                        const isOOS = val.inventory <= 0 || !val.is_active;
                        const isSelected = selectedValues[opt.name] === val.value;
                        const diffText = val.price_difference ? `(${val.price_difference > 0 ? '+' : ''}${formatCurrency(val.price_difference, shopDetails?.currency)})` : '';
                        return (
                          <Button
                            key={val.id || val.value}
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => !isOOS && setSelectedValues(prev => ({ ...prev, [opt.name]: val.value }))}
                            disabled={isOOS}
                            className={cn(
                              "text-sm h-9 px-3",
                              isSelected ? "bg-red-500 text-white border-red-500 hover:bg-red-600" : "bg-muted text-foreground border-border hover:bg-accent",
                              isOOS && "opacity-60 cursor-not-allowed"
                            )}
                            title={isOOS ? "Out of stock / inactive" : undefined}
                          >
                            <span className="capitalize">{val.value}</span>
                            {diffText && <span className="ml-1 text-xs opacity-80">{diffText}</span>}
                            <span className="ml-2 text-[10px] opacity-70">{val.inventory}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {otherOptions.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {otherOptions.map(([key, value]) => {
                      const Icon = getAttributeIcon(key);
                      return (
                        <DetailDisplayRow key={key} label={key.replace(/_/g, ' ')} icon={Icon}>
                          <p className="font-medium text-sm text-foreground pt-1">{Array.isArray(value) ? value.join(', ') : String(value)}</p>
                        </DetailDisplayRow>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Quantity & Add to Cart */}
            {product.pricing_type === 'one_time' && product.inventory !== null && product.inventory > 0 && (
              <div className="flex items-center gap-4 pt-3">
                <div className="flex items-center border border-border rounded-md">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    disabled={quantity <= 1}
                    className="h-9 w-9 rounded-r-none text-foreground hover:bg-accent"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(product.inventory || 1, parseInt(e.target.value) || 1)))}
                    className="w-14 text-center border-y-0 border-x border-border focus-visible:ring-0 text-sm h-9 rounded-none bg-transparent"
                    min={1}
                    max={product.inventory || 1}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(prev => Math.min(product.inventory || 1, prev + 1))}
                    disabled={quantity >= (product.inventory || 1)}
                    className="h-9 w-9 rounded-l-none flex items-center justify-center text-foreground hover:bg-accent"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button size="lg" className={cn("flex-1 text-base", primaryColorClass)} onClick={handleAddToCart} disabled={isOutOfStock}>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Add to Cart
                </Button>
              </div>
            )}
            {product.pricing_type === 'one_time' && (product.inventory === null || product.inventory <= 0) && (
              <Button size="lg" className="w-full text-base bg-muted text-muted-foreground rounded-md" disabled>
                Out of Stock
              </Button>
            )}
            {product.pricing_type === 'subscription' && (
              <Button size="lg" className={cn("w-full text-base", primaryColorClass)} onClick={handleAddToCart} disabled={isOutOfStock}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                Subscribe Now
              </Button>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};