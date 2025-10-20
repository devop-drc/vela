"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, Minus, Plus, ArrowLeft, Star, Truck, Sparkles, CreditCard, ShoppingBag } from "lucide-react";
import { useStorefront } from "@/contexts/StorefrontContext";
import { useCart, CartItem } from "@/contexts/CartContext";
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
import { InstagramCartDrawer } from "./InstagramCartDrawer"; // Import the drawer

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

  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  const [isBuyNowDrawerOpen, setIsBuyNowDrawerOpen] = useState(false);
  const [buyNowProduct, setBuyNowProduct] = useState<CartItem | null>(null);

  const product = products.find(p => p.id === productId);
  
  // NEW: Read structured options and variants
  const productOptions = product?.details?.options || [];
  const productVariants = product?.details?.variants || [];
  const hasVariants = productVariants.length > 0;

  // NEW: State for selected option values
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string | null }>(() => {
      const initial: { [key: string]: string | null } = {};
      productOptions.forEach((opt: any) => {
          initial[opt.name] = opt.values[0] || null; // Default to first value
      });
      return initial;
  });

  // Reset quantity and options when product changes
  useEffect(() => {
    if (product) {
      setQuantity(1);
      setSelectedOptions(() => {
          const initial: { [key: string]: string | null } = {};
          productOptions.forEach((opt: any) => {
              initial[opt.name] = opt.values[0] || null;
          });
          return initial;
      });
    }
  }, [product, productOptions]);

  useEffect(() => {
    if (!api) return;
    setCurrentSlide(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrentSlide(api.selectedScrollSnap());
    });
  }, [api]);

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

  // NEW: Find the currently selected variant
  const selectedVariant = useMemo(() => {
      if (!hasVariants) return null;
      
      const selectedValues = productOptions.map((opt: any) => selectedOptions[opt.name]);
      
      return productVariants.find((variant: any) => {
          return variant.optionValues.every((vValue: string, index: number) => vValue === selectedValues[index]);
      });
  }, [productOptions, productVariants, selectedOptions, hasVariants]);

  // NEW: Calculate final price and stock based on selected variant
  const finalDisplayPrice = selectedVariant ? originalDisplayPrice + selectedVariant.priceDifference : originalDisplayPrice;
  const finalInventory = selectedVariant ? selectedVariant.inventory : product.inventory;
  const isVariantOutOfStock = hasVariants && (selectedVariant?.disabled || finalInventory <= 0);
  
  const isProductOutOfStock = product.status === 'Out of Stock' || (product.pricing_type === 'one_time' && (product.inventory <= 0 || isVariantOutOfStock));

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

  let discountedPrice = finalDisplayPrice;
  let hasDiscount = false;

  if (activePromotions.length > 0 && finalDisplayPrice !== null) {
    const firstDiscount = activePromotions.find(p => p.type === 'discount');
    if (firstDiscount && firstDiscount.value) {
      if (firstDiscount.value.discountType === 'percentage') {
        discountedPrice = finalDisplayPrice * (1 - firstDiscount.value.discountValue / 100);
        hasDiscount = true;
      } else if (firstDiscount.value.discountType === 'flat') {
        discountedPrice = finalDisplayPrice - firstDiscount.value.discountValue;
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
    if (isProductOutOfStock) {
      toast.error("This product is currently out of stock.");
      return;
    }

    const optionsForCart: { [key: string]: string | string[] } = {};
    if (hasVariants) {
        Object.entries(selectedOptions).forEach(([key, value]) => {
            if (value) optionsForCart[key] = value;
        });
    }

    addToCart({
      productId: product.id,
      name: product.name,
      price: hasDiscount ? discountedPrice : finalDisplayPrice,
      originalPrice: finalDisplayPrice,
      isDiscounted: hasDiscount,
      currency: shopDetails.currency || 'USD',
      media_url: product.media_url,
      media_type: product.media_type,
      slug: shopDetails.slug,
      selectedOptions: Object.keys(optionsForCart).length > 0 ? optionsForCart : undefined,
      pricing_type: product.pricing_type,
      product_type: product.product_type,
      billing_interval: product.billing_interval,
    }, quantity);
    onClose(); // Close modal after adding to cart
  };

  const handleBuyNow = () => {
    if (!shopDetails?.slug) {
      toast.error("Shop details not available.");
      return;
    }
    if (isProductOutOfStock) {
      toast.error("This product is currently out of stock.");
      return;
    }

    const optionsForCart: { [key: string]: string | string[] } = {};
    if (hasVariants) {
        Object.entries(selectedOptions).forEach(([key, value]) => {
            if (value) optionsForCart[key] = value;
        });
    }

    const itemToBuy: CartItem = {
      productId: product.id,
      name: product.name,
      price: hasDiscount ? discountedPrice : finalDisplayPrice,
      originalPrice: finalDisplayPrice,
      isDiscounted: hasDiscount,
      currency: shopDetails.currency || 'EUR',
      media_url: product.media_url,
      media_type: product.media_type,
      slug: shopDetails.slug,
      selectedOptions: Object.keys(optionsForCart).length > 0 ? optionsForCart : undefined,
      pricing_type: product.pricing_type,
      product_type: product.product_type,
      billing_interval: product.billing_interval,
      quantity: quantity, // Use current quantity for Buy Now
    };

    setBuyNowProduct(itemToBuy);
    setIsBuyNowDrawerOpen(true);
  };

  const allDetails = Object.entries(product.details || {}).filter(([key, value]) => key !== 'type' && key !== 'options' && key !== 'variants' && value && (!Array.isArray(value) || value.length > 0));
  const specifications = allDetails;

  const primaryColorClass = hasDiscount ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-700 hover:bg-red-800 text-white";

  return (
    <>
      {buyNowProduct && (
        <InstagramCartDrawer
          isOpen={isBuyNowDrawerOpen}
          onClose={() => setIsBuyNowDrawerOpen(false)}
          initialCartItems={[buyNowProduct]}
          onOrderPlaced={() => onClose()} // Close modal after order is placed
        />
      )}
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
                          <MediaItem src={url} alt={`${product.name} - image ${index + 1}`} type={product.media_type} className={cn(isProductOutOfStock && "grayscale")} />
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
                  {isProductOutOfStock && (
                    <Badge variant="secondary" className="text-sm bg-amber-500 text-white flex-shrink-0">
                      Coming Soon
                    </Badge>
                  )}
                  {activePromotions.length > 0 && !isProductOutOfStock && (
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
                  {hasDiscount && finalDisplayPrice !== null ? (
                    <>
                      <p className="text-base text-gray-500 line-through">
                        {formatCurrency(originalDisplayPrice, shopDetails?.currency)}
                      </p>
                      <p className={cn("text-2xl font-bold", isProductOutOfStock ? "text-gray-500" : "text-green-600")}>
                        {formatCurrency(discountedPrice, shopDetails?.currency)}
                        {product.pricing_type === 'subscription' && (
                            <span className="text-base font-light text-gray-500">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-gray-800">
                      {finalDisplayPrice != null ? formatCurrency(finalDisplayPrice, shopDetails?.currency) : 'N/A'}
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
              {hasVariants && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  {productOptions.map((option: any) => (
                    <div key={option.id} className="space-y-2">
                      <Label className="text-sm text-gray-700 capitalize">{option.name}</Label>
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((value: string) => (
                          <Button
                            key={value}
                            variant={selectedOptions[option.name] === value ? "default" : "outline"}
                            onClick={() => setSelectedOptions(prev => ({ ...prev, [option.name]: value }))}
                            className={cn(
                              "capitalize text-sm h-9 px-4",
                              selectedOptions[option.name] === value ? "bg-red-500 text-white border-red-500 hover:bg-red-600" : "bg-gray-50 text-gray-800 border-gray-300 hover:bg-gray-100"
                            )}
                          >
                            {value}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {selectedVariant && (
                      <div className="pt-2 text-xs text-gray-500">
                          SKU: <span className="font-mono text-xs">{selectedVariant.sku}</span>
                          {selectedVariant.disabled && <Badge variant="destructive" className="ml-2">Unavailable</Badge>}
                      </div>
                  )}
                </div>
              )}

              {/* Specifications */}
              {specifications.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <Label className="text-sm font-semibold text-gray-800">Specifications</Label>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {specifications.map(field => {
                      const Icon = getAttributeIcon(field.name);
                      return (
                        <DetailDisplayRow key={field.name} label={field.name.replace(/_/g, ' ')} icon={Icon}>
                          <p className="font-medium text-sm text-gray-800 pt-1">{Array.isArray(field.value) ? field.value.join(', ') : String(field.value)}</p>
                        </DetailDisplayRow>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity & Add to Cart / Buy Now */}
              {product.pricing_type === 'one_time' && (
                <div className="flex items-stretch gap-3 pt-3 border-t border-gray-100">
                  {/* Quantity Counter */}
                  <div className="flex flex-col border border-gray-300 rounded-md overflow-hidden flex-shrink-0 w-16">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(prev => Math.min(finalInventory || 1, prev + 1))}
                      disabled={quantity >= (finalInventory || 1)}
                      className="h-full w-full text-gray-800 hover:bg-gray-100"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(finalInventory || 1, parseInt(e.target.value) || 1)))}
                      className="w-full text-center border-y border-gray-300 border-x-0 focus-visible:ring-0 text-base bg-white h-full p-0"
                      min={1}
                      max={finalInventory || 1}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      disabled={quantity <= 1}
                      className="h-full w-full text-gray-800 hover:bg-gray-100"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 flex-1 w-full">
                    {/* Buy Now Button */}
                    <Button
                      size="lg"
                      className={cn(
                        "w-full text-base rounded-md h-12",
                        primaryColorClass
                      )}
                      onClick={handleBuyNow}
                      disabled={isProductOutOfStock}
                    >
                      <CreditCard className="mr-2 h-6 w-6" /> Buy
                    </Button>

                    {/* Add to Cart Button */}
                    <Button
                      size="lg"
                      className={cn(
                        "w-full text-base rounded-md border h-12",
                        primaryColorClass.includes('bg-red') ? "border-red-700 text-red-700 hover:bg-red-100 hover:text-red-800 hover:border-red-800" : "border-green-600 text-green-600 hover:bg-green-100 hover:border-green-800 hover:text-green-800"
                      )}
                      variant="outline"
                      onClick={handleAddToCart}
                      disabled={isProductOutOfStock}
                    >
                      <ShoppingBag className="mr-2 h-6 w-6" />
                      Add to cart
                    </Button>
                  </div>
                </div>
              )}
              {product.pricing_type === 'subscription' && (
                  <div className="flex flex-col gap-2 flex-1 w-full pt-3 border-t border-gray-100">
                    {/* Buy Now Button */}
                    <Button size="lg" className="w-full text-base bg-red-500 hover:bg-red-600 text-white rounded-md" onClick={handleBuyNow} disabled={isProductOutOfStock}>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Subscribe Now
                  </Button>

                    {/* Add to Cart Button */}
                    <Button
                      size="lg"
                      className={cn(
                        "w-full text-base rounded-md border h-12",
                        primaryColorClass.includes('bg-red') ? "border-red-700 text-red-700 hover:bg-red-100 hover:text-red-800 hover:border-red-800" : "border-green-600 text-green-600 hover:bg-green-100 hover:border-green-800 hover:text-green-800"
                      )}
                      variant="outline"
                      onClick={handleAddToCart}
                      disabled={isProductOutOfStock}
                    >
                      <ShoppingBag className="mr-2 h-6 w-6" />
                      Add to cart
                    </Button>
                  </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};