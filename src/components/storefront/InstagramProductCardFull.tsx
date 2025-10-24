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
import { supabase } from "@/integrations/supabase/client";

import { useIsMobile } from "@/hooks/use-mobile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"; // Import DropdownMenu components
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

// Helper to safely extract array values from product details
const getDetailArray = (details: any, key: string): string[] => {
  const value = details?.[key];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value) return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

export const InstagramProductCardFull = forwardRef<HTMLDivElement, InstagramProductCardFullProps>(
  ({ product, shopDetails, convertCurrency, promotions }, ref) => {
    const { addToCart } = useCart();
    const { shopSlug } = useParams<{ shopSlug: string }>();
    const [quantity, setQuantity] = useState(1);
    // New: options fetched from DB
    const [options, setOptions] = useState<Array<{ id: string; name: string; values: Array<{ id: string; value: string; price_difference: number; inventory: number; is_active: boolean; is_default: boolean }> }>>([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);
    const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});

    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const isMobile = useIsMobile(); // Use the mobile hook

    const [api, setApi] = useState<CarouselApi>();
    const [currentSlide, setCurrentSlide] = useState(0);

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

    // Fetch options/values from DB for this product
    useEffect(() => {
      const loadOptions = async () => {
        if (!product?.id) return;
        setIsLoadingOptions(true);
        const { data, error } = await supabase
          .from('product_options')
          .select(`
            id,
            name,
            display_order,
            option_values (
              id,
              value,
              price_difference,
              inventory,
              is_active,
              is_default
            )
          `)
          .eq('product_id', product.id)
          .order('display_order')
          .order('created_at', { foreignTable: 'option_values', ascending: true });

        if (error) {
          console.error('Failed to load product options for storefront:', error);
          setOptions([]);
        } else {
          const mapped = (data || []).map((opt: any) => ({
            id: opt.id,
            name: opt.name,
            values: (opt.option_values || []).map((v: any) => ({
              id: v.id,
              value: v.value,
              // price_difference stored in ALL; convert on the fly for display math
              price_difference: convertCurrency(v.price_difference, 'ALL'),
              inventory: v.inventory,
              is_active: v.is_active,
              is_default: v.is_default,
            })),
          }));
          setOptions(mapped);
          // Initialize defaults
          const defaults: Record<string, string> = {};
          mapped.forEach(opt => {
            const def = opt.values.find(v => v.is_default && v.is_active && v.inventory > 0) || opt.values.find(v => v.is_active && v.inventory > 0) || opt.values[0];
            if (def) defaults[opt.name] = def.value;
          });
          setSelectedValues(defaults);
        }
        setIsLoadingOptions(false);
      };
      loadOptions();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product?.id]);

    const baseDisplayPrice = convertCurrency(product.price, product.currency);
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
    const originalDisplayPrice = baseDisplayPrice != null ? (baseDisplayPrice + optionsPriceDelta) : null;

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

      const selectedOptions: { [key: string]: string | string[] } = { ...selectedValues };

      const mediaType: 'image' | 'video' | undefined = product.media_type === 'video' ? 'video' : (product.media_type === 'image' ? 'image' : undefined);
      addToCart({
        productId: product.id,
        name: product.name,
        price: hasDiscount ? discountedPrice : originalDisplayPrice,
        originalPrice: originalDisplayPrice,
        currency: shopDetails.currency || 'USD',
        media_url: product.media_url,
        media_type: mediaType,
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

      const selectedOptions: { [key: string]: string | string[] } = { ...selectedValues };

      const mediaType: 'image' | 'video' | undefined = product.media_type === 'video' ? 'video' : (product.media_type === 'image' ? 'image' : undefined);
      const itemToBuy: CartItem = {
        productId: product.id,
        name: product.name,
        price: hasDiscount ? discountedPrice : originalDisplayPrice,
        originalPrice: originalDisplayPrice,
        isDiscounted: hasDiscount,
        currency: shopDetails.currency || 'EUR',
        media_url: product.media_url,
        media_type: mediaType,
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

    // Legacy details-derived options (kept as specs only). Real options now come from DB.
    const otherOptions = allDetails.filter(([key]) => key !== 'type');

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
    const outlineColorClass = hasDiscount ? "border-green-600 text-green-600 hover:bg-green-100 hover:border-green-800 hover:text-green-800" : "border-red-700 text-red-700 hover:bg-red-100 hover:text-red-800 hover:border-red-800";

    return (
      <div ref={ref} id={`product-${product.id}`} className="bg-white text-black border-b border-gray-200 pb-4 mb-4">
        {/* Product Header */}
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
            <MediaItem src={shopDetails?.logo_url || undefined} alt={shopDetails?.shop_name || "Shop"} className={cn("object-cover", isOutOfStock && "grayscale")} />
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
                <p className={cn("text-2xl font-bold", isOutOfStock && "text-gray-500")}>
                  <span className={cn("text-green-600", isOutOfStock && "text-gray-500")}>{formatCurrency(discountedPrice, shopDetails?.currency)}</span>
                  {product.pricing_type === 'subscription' && (
                      <span className="text-base font-light text-green-600">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                  )}
                </p>
                  <Badge className={cn("bg-green-600 text-white text-sm font-semibold px-2 py-1 rounded-md", isOutOfStock && "bg-gray-500")}>
                    {getPromotionBadge(activePromotions[0])}
                  </Badge>
                {product.pricing_type === 'one_time' && (product.inventory === null || product.inventory <= 0) && (
                  <Badge className="bg-gray-500 text-white text-sm font-semibold px-2 py-1 rounded-md">
                    Out of Stock
                  </Badge>
                )}
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
          {(options.length > 0 || otherOptions.length > 0) && (
            <div className="space-y-4 pt-2">
              {options.length > 0 && options.map((opt) => (
                <div key={opt.id} className="space-y-2">
                  <Label className="text-sm text-gray-700 capitalize">{opt.name}</Label>
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
                            isSelected ? "bg-red-500 text-white border-red-500 hover:bg-red-600" : "bg-gray-50 text-gray-800 border-gray-300 hover:bg-gray-100",
                            isOOS && "opacity-60 cursor-not-allowed"
                          )}
                          title={isOOS ? "Out of stock" : undefined}
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
                  onClick={() => setQuantity(prev => Math.min(product.inventory || 1, prev + 1))}
                  disabled={quantity >= (product.inventory || 1)}
                  className="h-full w-full text-gray-800 hover:bg-gray-100"
                >
                  <Plus className="h-4 w-4" />
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
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  disabled={quantity <= 1}
                  className="h-full w-full text-gray-800 hover:bg-gray-100"
                >
                  <Minus className="h-4 w-4" />
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
                  <CreditCard className="mr-2 h-6 w-6" /> Buy
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
                  <ShoppingBag className="mr-2 h-6 w-6" />
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
              <div className="flex flex-col gap-2 flex-1 w-full">
                {/* Buy Now Button */}
                <Button size="lg" className="w-full text-base bg-red-500 hover:bg-red-600 text-white rounded-md" onClick={handleBuyNow} disabled={isOutOfStock}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                Subscribe Now
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
                  <ShoppingBag className="mr-2 h-6 w-6" />
                  Add to cart
                </Button>
              </div>
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