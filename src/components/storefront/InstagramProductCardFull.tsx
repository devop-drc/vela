"use client";

import React, { useState, useMemo, useEffect, forwardRef } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { ShoppingCart, Minus, Plus, Bookmark, XCircle, ArrowRight, ChevronDown, Banknote, ShoppingBag, CreditCard } from "lucide-react"; // Added CreditCard
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCart, CartItem } from "@/contexts/CartContext"; // Import CartItem type
import { getAttributeIcon } from "@/lib/attributeIcons";
import { ShopDetails as StorefrontShopDetails, Promotion as StorefrontPromotion } from "@/contexts/StorefrontContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InstagramCartDrawer } from "./InstagramCartDrawer"; // Import the drawer

interface Product {
  id: string;
  name: string;
  status: 'Active' | 'Draft' | 'Out of Stock';
  price: number | null;
  currency: string | null;
  inventory: number;
  media_url: string;
  media_gallery: string[] | null;
  media_type: string | null;
  thumbnail_url?: string;
  caption: string;
  category: string;
  tags: string[];
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  details: { [key: string]: any };
  product_type: 'physical' | 'digital';
}

interface InstagramProductCardFullProps {
  product: Product;
  shopDetails: StorefrontShopDetails | null;
  convertCurrency: (amount: number | null | undefined, fromCurrency?: string) => number;
  promotions: StorefrontPromotion[];
}

export const InstagramProductCardFull = forwardRef<HTMLDivElement, InstagramProductCardFullProps>(
  ({ product, shopDetails, convertCurrency, promotions }, ref) => {
    const { addToCart } = useCart();
    const { shopSlug } = useParams<{ shopSlug: string }>();
    const [quantity, setQuantity] = useState(1);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const isMobile = useIsMobile(); // Use the mobile hook

    const [api, setApi] = useState<CarouselApi>();
    const [currentSlide, setCurrentSlide] = useState(0);

    // State for Buy Now drawer
    const [isBuyNowDrawerOpen, setIsBuyNowDrawerOpen] = useState(false);
    const [buyNowProduct, setBuyNowProduct] = useState<CartItem | null>(null);

    useEffect(() => {
      if (!api) return;
      setCurrentSlide(api.selectedScrollSnap());
      api.on("select", () => {
        setCurrentSlide(api.selectedScrollSnap());
      });
    }, [api]);

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
    };

    const handleBuyNow = () => {
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

      const itemToBuy: CartItem = {
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
        quantity: quantity, // Use current quantity for Buy Now
      };

      setBuyNowProduct(itemToBuy);
      setIsBuyNowDrawerOpen(true);
    };

    const allDetails = Object.entries(product.details || {}).filter(([key, value]) => key !== 'type' && value && (!Array.isArray(value) || value.length > 0));
    const colors = allDetails.find(([key]) => key === 'color')?.[1] as string[] || [];
    const sizes = allDetails.find(([key]) => key === 'size')?.[1] as string[] || [];
    const otherOptions = allDetails.filter(([key]) => !['color', 'size', 'type'].includes(key)); // All other details are specs

    const getPromotionBadge = (promo: StorefrontPromotion) => {
      switch (promo.type) {
        case 'discount':
          if (promo.value?.discountType === 'percentage') return `${promo.value.discountValue}% Off`;
          if (promo.value?.discountType === 'flat') return `-${formatCurrency(promo.value.discountValue, shopDetails?.currency)} Off`;
          return 'Discount';
        case 'offer':
          if (promo.value?.offerType === 'free_shipping') return 'Free Shipping';
          return 'Offer';
        default: return null;
      }
    };

    const primaryColorClass = hasDiscount ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-700 hover:bg-red-800 text-white";
    const outlineColorClass = hasDiscount ? "border-green-600 text-green-600 hover:bg-green-50" : "border-red-700 text-red-700 hover:bg-red-50";

    return (
      <div ref={ref} id={`product-${product.id}`} className="bg-white text-black border-b border-gray-200 pb-4 mb-4">
        {/* Product Header */}
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
            <MediaItem src={shopDetails?.logo_url || undefined} alt={shopDetails?.shop_name || "Shop"} className="object-cover" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-800 leading-tight">{product.name}</p> {/* Product Name */}
            <p className="text-xs text-gray-500 leading-tight">
              {product.category || 'Uncategorized'}
              {product.details?.type && ` · ${product.details.type}`}
            </p> {/* Category - Type */}
          </div>
        </div>

        {/* Product Media */}
        <div>
          <Carousel setApi={setApi} className="w-full">
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
            <div className="flex justify-center gap-1 mt-2">
              {mediaItems.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    index === currentSlide ? "bg-red-500" : "bg-gray-300"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Actions */}
        <div className="p-4 space-y-3">
          {/* Price and Discount */}
          <div className="flex items-baseline gap-3">
            {hasDiscount && originalDisplayPrice !== null ? (
              <>
                <p className="text-base text-gray-500 line-through">
                  {formatCurrency(originalDisplayPrice, shopDetails?.currency)}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(discountedPrice, shopDetails?.currency)}
                  {product.pricing_type === 'subscription' && (
                      <span className="text-base font-light text-gray-500">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                  )}
                </p>
                <Badge className="bg-green-500 text-white text-sm font-semibold px-2 py-1 rounded-md">
                  {getPromotionBadge(activePromotions[0])}
                </Badge>
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

          {/* Description with Read More */}
          <div className="text-sm text-gray-800 leading-relaxed">
            <span className="font-semibold">{shopDetails?.username || shopDetails?.shop_name}</span>{" "}
            <span className={cn(!isDescriptionExpanded && "line-clamp-2")}>
              {product.caption || "No description provided."}
            </span>
            {product.caption && product.caption.length > 100 && ( // Adjust character limit as needed
              <button
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="text-blue-600 hover:underline ml-1"
              >
                {isDescriptionExpanded ? "Read Less" : "Read More"}
              </button>
            )}
          </div>

          {/* Tags */}
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
                      <div key={key} className="flex flex-col">
                        <Label className="text-xs text-gray-500 flex items-center gap-1">
                          <Icon className="h-3 w-3 text-gray-800" />
                          {key.replace(/_/g, ' ')}
                        </Label>
                        <p className="font-medium text-sm text-gray-800 pt-1">{Array.isArray(value) ? value.join(', ') : String(value)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Quantity & Add to Cart / Buy Now - Responsive */}
          {product.pricing_type === 'one_time' && product.inventory !== null && product.inventory > 0 && (
            <div className="flex items-stretch gap-3 pt-3"> {/* Changed to items-stretch for vertical alignment */}
              {/* Quantity Counter */}
              <div className="flex flex-col border border-gray-300 rounded-md overflow-hidden flex-shrink-0 w-16"> {/* Fixed width for counter */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  disabled={quantity <= 1}
                  className="h-full w-full rounded-none text-gray-800 hover:bg-gray-100"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(product.inventory || 1, parseInt(e.target.value) || 1)))}
                  className="w-full text-center border-y border-gray-300 border-x-0 focus-visible:ring-0 text-base bg-white h-full p-0"
                  min={1}
                  max={product.inventory || 1}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(prev => Math.min(product.inventory || 1, prev + 1))}
                  disabled={quantity >= (product.inventory || 1)}
                  className="h-full w-full rounded-none text-gray-800 hover:bg-gray-100"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 flex-1 w-full"> {/* Always stack vertically */}
                {/* Buy Now Button */}
                <Button
                  size="lg"
                  className={cn(
                    "w-full text-base rounded-md h-12", // Full width and fixed height
                    primaryColorClass
                  )}
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                >
                  Buy <CreditCard className="ml-2 h-4 w-4" />
                </Button>

                {/* Add to Cart Button */}
                <Button
                  size="lg"
                  className={cn(
                    "w-full text-base rounded-md border h-12", // Full width and fixed height
                    outlineColorClass
                  )}
                  variant="outline"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Add to cart
                </Button>
              </div>
            </div>
          )}
          {product.pricing_type === 'one_time' && (product.inventory === null || product.inventory <= 0) && (
            <Button size="lg" className="w-full text-base bg-gray-500 hover:bg-gray-600 text-white rounded-md" disabled>
              Out of Stock
            </Button>
          )}
          {product.pricing_type === 'subscription' && (
            <Button size="lg" className="w-full text-base bg-red-500 hover:bg-red-600 text-white rounded-md" onClick={handleBuyNow} disabled={isOutOfStock}>
              <ShoppingCart className="mr-2 h-5 w-5" />
              Subscribe Now
            </Button>
          )}
        </div>

        {/* Buy Now Drawer */}
        {buyNowProduct && (
          <InstagramCartDrawer
            isOpen={isBuyNowDrawerOpen}
            onClose={() => setIsBuyNowDrawerOpen(false)}
            initialCartItems={[buyNowProduct]}
            onOrderPlaced={() => setIsBuyNowDrawerOpen(false)}
          />
        )}
      </div>
    );
  }
);
InstagramProductCardFull.displayName = "InstagramProductCardFull";