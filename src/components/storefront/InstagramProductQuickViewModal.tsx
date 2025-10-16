"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, Minus, Plus, ArrowLeft, Star, Truck, Sparkles } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getAttributeIcon } from "@/lib/attributeIcons";

interface InstagramProductQuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  shopSlug: string;
}

const DetailDisplayRow = ({ label, icon: Icon, children }: { label: string, icon: React.ElementType, children: React.ReactNode }) => (
    <div className="flex flex-col">
        <Label className="text-xs text-gray-500 flex items-center gap-1">
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

  useEffect(() => {
    if (!api) return;
    setCurrentSlide(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrentSlide(api.selectedScrollSnap());
    });
  }, [api]);

  const product = products.find(p => p.id === productId);

  useEffect(() => {
    if (product) {
      setQuantity(1); // Reset quantity when product changes
      setSelectedColor(null); // Reset selected options
      setSelectedSize(null);
    }
  }, [product]);

  if (isLoading || !shopDetails) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md bg-white text-black rounded-lg">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-800">Product Details</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !product) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md bg-white text-black rounded-lg">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-800">Product Not Found</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-gray-600">
            <p>The product you are looking for does not exist or is no longer available.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const mediaItems = product.media_gallery?.length ? product.media_gallery : (product.media_url ? [product.media_url] : []);
  const originalDisplayPrice = convertCurrency(product.price, product.currency);
  const isOutOfStock = product.status === 'Out of Stock' || (product.pricing_type === 'one_time' && product.inventory <= 0);

  const activePromotions = promotions.filter(promo => {
    if (!promo.is_active) return false;
    const now = new Date();
    const startDate = promo.start_date ? new Date(promo.start_date) : null;
    const endDate = promo.end_date ? new Date(promo.end_date) : null;

    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;

    if (promo.target_products && promo.target_products.length > 0) {
      return promo.target_products.includes(product.id);
    }
    return true;
  });

  let discountedPrice = originalDisplayPrice;
  let hasDiscount = false;

  if (activePromotions.length > 0 && originalDisplayPrice !== null) {
    const firstDiscount = activePromotions.find(p => p.type === 'discount');
    if (firstDiscount && firstDiscount.value) {
      if (firstDiscount.value.discountType === 'percentage') {
        discountedPrice = originalDisplayPrice * (1 - firstDiscount.value.discountValue / 100);
        hasDiscount = true;
      } else if (firstDiscount.value.discountType === 'flat') {
        discountedPrice = originalDisplayPrice - firstDiscount.value.discountValue;
        hasDiscount = true;
      }
      discountedPrice = Math.max(0, discountedPrice);
    }
  }

  const getPromotionBadge = (promo: any) => {
    switch (promo.type) {
      case 'discount':
        if (promo.value?.discountType === 'percentage') return `${promo.value.discountValue}% OFF`;
        if (promo.value?.discountType === 'flat') return `-${formatCurrency(promo.value.discountValue, shopDetails?.currency)} OFF`;
        return 'Discount';
      case 'offer':
        if (promo.value?.offerType === 'free_shipping') return 'Free Shipping';
        return 'Offer';
      default: return null;
    }
  };

  const handleAddToCart = () => {
    if (!shopDetails?.slug) {
      toast.error("Shop details not available.");
      return;
    }
    if (isOutOfStock) {
      toast.error("This product is currently out of stock.");
      return;
    }

    const selectedOptions: { [key: string]: string | string[] } = {};
    if (selectedColor) selectedOptions.color = selectedColor;
    if (selectedSize) selectedOptions.size = selectedSize;

    addToCart({
      productId: product.id,
      name: product.name,
      price: hasDiscount ? discountedPrice : originalDisplayPrice,
      originalPrice: originalDisplayPrice,
      isDiscounted: hasDiscount,
      currency: shopDetails.currency || 'USD',
      media_url: product.media_url,
      media_type: product.media_type,
      slug: shopDetails.slug,
      selectedOptions: Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined,
      pricing_type: product.pricing_type,
      product_type: product.product_type,
      billing_interval: product.billing_interval,
    }, quantity);
    onClose(); // Close modal after adding to cart
  };

  const allDetails = Object.entries(product.details || {}).filter(([key, value]) => key !== 'type' && value && (!Array.isArray(value) || value.length > 0));
  const colors = allDetails.find(([key]) => key === 'color')?.[1] as string[] || [];
  const sizes = allDetails.find(([key]) => key === 'size')?.[1] as string[] || [];
  const otherOptions = allDetails.filter(([key]) => !['color', 'size', 'type'].includes(key));

  const primaryColorClass = hasDiscount ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-700 hover:bg-red-800 text-white";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[90vh] flex flex-col p-0 bg-white text-black rounded-lg">
        <DialogHeader className="p-4 border-b border-gray-200 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-gray-800">Product Details</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">Quick view of {product.name}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="p-4 space-y-4">
            {/* Product Media */}
            <div>
              <Carousel setApi={setApi} className="w-full rounded-lg overflow-hidden border border-gray-200">
                <CarouselContent>
                  {mediaItems.map((url: string, index: number) => (
                    <CarouselItem key={index}>
                      <div className="relative aspect-square w-full bg-gray-100 flex items-center justify-center">
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
                  <div className="flex gap-2 justify-center">
                    {mediaItems.map((url: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => api?.scrollTo(index)}
                        className={cn(
                          "h-16 w-16 rounded-md overflow-hidden border-2 transition-all flex-shrink-0",
                          index === currentSlide ? "border-red-500" : "border-gray-300 hover:border-gray-400"
                        )}
                      >
                        <MediaItem src={url} alt={`Thumbnail ${index + 1}`} className="object-cover h-full w-full" />
                      </button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">
                <span>{product.category || 'Uncategorized'}</span>
                {product.details?.type && <span> &middot; {product.details.type}</span>}
              </p>
              <h1 className="text-2xl font-bold text-gray-800 leading-tight flex flex-wrap items-center gap-2">
                {product.name}
                {isOutOfStock && (
                  <Badge variant="secondary" className="text-sm bg-amber-500 text-white flex-shrink-0">
                    Coming Soon
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
                    <p className="text-base text-gray-500 line-through">
                      {formatCurrency(originalDisplayPrice, shopDetails?.currency)}
                    </p>
                    <p className={cn("text-2xl font-bold", isOutOfStock ? "text-gray-500" : "text-green-600")}>
                      {formatCurrency(discountedPrice, shopDetails?.currency)}
                      {product.pricing_type === 'subscription' && (
                          <span className="text-base font-light text-gray-500">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-gray-800">
                    {originalDisplayPrice != null ? formatCurrency(originalDisplayPrice, shopDetails?.currency) : 'N/A'}
                    {product.pricing_type === 'subscription' && (
                        <span className="text-base font-light text-gray-500">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">{product.caption || "No description provided."}</p>

            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag: string) => <Badge key={tag} variant="outline" className="text-xs bg-gray-100 text-gray-700 border-gray-300">{tag}</Badge>)}
              </div>
            )}

            {/* Options */}
            {(colors.length > 0 || sizes.length > 0 || otherOptions.length > 0) && (
              <div className="space-y-4 pt-2">
                {colors.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-700">Colors</Label>
                    <div className="flex flex-wrap gap-2">
                      {colors.map(color => (
                        <Button
                          key={color}
                          variant="outline"
                          onClick={() => setSelectedColor(color)}
                          className={cn(
                            "capitalize text-sm h-9 w-9 rounded-full p-0 border-2",
                            selectedColor === color ? "border-red-500" : "border-gray-300",
                            "hover:border-red-500"
                          )}
                          style={{ backgroundColor: color.toLowerCase() }}
                        >
                          <span className="sr-only">{color}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {sizes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-700">Sizes</Label>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map(size => (
                        <Button
                          key={size}
                          variant={selectedSize === size ? "default" : "outline"}
                          onClick={() => setSelectedSize(size)}
                          className={cn(
                            "text-sm border-gray-300 bg-gray-50 text-gray-800 hover:bg-gray-100",
                            selectedSize === size && "bg-red-500 text-white hover:bg-red-600 border-red-500"
                          )}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {otherOptions.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {otherOptions.map(([key, value]) => {
                      const Icon = getAttributeIcon(key);
                      return (
                        <DetailDisplayRow key={key} label={key.replace(/_/g, ' ')} icon={Icon}>
                          <p className="font-medium text-sm text-gray-800 pt-1">{Array.isArray(value) ? value.join(', ') : String(value)}</p>
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
                <div className="flex items-center border border-gray-300 rounded-md">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    disabled={quantity <= 1}
                    className="h-9 w-9 rounded-r-none text-gray-800 hover:bg-gray-100"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(product.inventory || 1, parseInt(e.target.value) || 1)))}
                    className="w-14 text-center border-y-0 border-x border-gray-300 focus-visible:ring-0 text-sm h-9 rounded-none bg-white"
                    min={1}
                    max={product.inventory || 1}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(prev => Math.min(product.inventory || 1, prev + 1))}
                    disabled={quantity >= (product.inventory || 1)}
                    className="h-9 w-9 rounded-l-none flex items-center justify-center text-gray-800 hover:bg-gray-100"
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
              <Button size="lg" className="w-full text-base bg-gray-500 hover:bg-gray-600 text-white rounded-md" disabled>
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