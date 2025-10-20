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
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const isMobile = useIsMobile();

    const [api, setApi] = useState<CarouselApi>();
    const [currentSlide, setCurrentSlide] = useState(0);

    // State for Buy Now drawer
    const [isBuyNowDrawerOpen, setIsBuyNowDrawerOpen] = useState(false);
    const [buyNowProduct, setBuyNowProduct] = useState<CartItem | null>(null);

    // NEW: Read structured options (additive model)
    const productOptions = product.details?.options || [];
    const hasOptions = productOptions.length > 0;

    // NEW: State for selected option values (e.g., { Color: 'Red', Size: 'M' })
    const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string | null }>(() => {
        const initial: { [key: string]: string | null } = {};
        productOptions.forEach((opt: any) => {
            initial[opt.name] = opt.values[0]?.value || null; // Default to first value
        });
        return initial;
    });

    // Reset quantity and options when product changes
    useEffect(() => {
      setQuantity(1);
      setSelectedOptions(() => {
          const initial: { [key: string]: string | null } = {};
          productOptions.forEach((opt: any) => {
              initial[opt.name] = opt.values[0]?.value || null;
          });
          return initial;
      });
    }, [product.id, productOptions]);


    useEffect(() => {
      if (!api) return;
      setCurrentSlide(api.selectedScrollSnap());
      api.on("select", () => {
        setCurrentSlide(api.selectedScrollSnap());
      });
    }, [api]);

    const mediaItems = product.media_gallery?.length ? product.media_gallery : (product.media_url ? [product.media_url] : []);

    // The base price is the lowest final price stored in the main product record (in ALL)
    const lowestFinalPriceInDisplay = convertCurrency(product.price, product.currency);

    // --- Price and Inventory Logic (Additive Model) ---
    const { finalDisplayPrice, finalInventory, basePriceInDisplay } = useMemo(() => {
        const basePrice = lowestFinalPriceInDisplay;
        let priceAdjustment = 0;
        let inventory = product.inventory; // Inventory is now stored at the product level

        // Calculate price adjustment based on selected options
        productOptions.forEach((option: any) => {
            const selectedValue = selectedOptions[option.name];
            const optionValue = option.values.find((v: any) => v.value === selectedValue);
            priceAdjustment += optionValue?.priceDifference || 0;
        });

        return {
            finalDisplayPrice: basePrice + priceAdjustment,
            finalInventory: inventory,
            basePriceInDisplay: basePrice,
        };
    }, [product.inventory, productOptions, selectedOptions, lowestFinalPriceInDisplay]);

    // Use the main product status if no variants, otherwise rely on variant stock/disabled status
    const isProductOutOfStock = product.status === 'Out of Stock' || (product.pricing_type === 'one_time' && finalInventory <= 0);


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
      if (hasOptions) {
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
      if (hasOptions) {
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

    // Filter out options and variants from general details to get specifications
    const specifications = Object.entries(product.details || {}).filter(([key, value]) => key !== 'type' && key !== 'options' && key !== 'variants' && value && (!Array.isArray(value) || value.length > 0));

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
            <MediaItem src={shopDetails?.logo_url || undefined} alt={shopDetails?.shop_name || "Shop"} className={cn("object-cover", isProductOutOfStock && "grayscale")} />
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
            {hasDiscount && finalDisplayPrice !== null ? (
              <>
                <p className="text-base text-gray-500 line-through">
                  {formatCurrency(basePriceInDisplay, shopDetails?.currency)}
                </p>
                <p className={cn("text-2xl font-bold", isProductOutOfStock && "text-gray-500")}>
                  <span className={cn("text-green-600", isProductOutOfStock && "text-gray-500")}>{formatCurrency(discountedPrice, shopDetails?.currency)}</span>
                  {product.pricing_type === 'subscription' && (
                      <span className="text-base font-light text-green-600">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                  )}
                </p>
                  <Badge className={cn("bg-green-600 text-white text-sm font-semibold px-2 py-1 rounded-md", isProductOutOfStock && "bg-gray-500")}>
                    {getPromotionBadge(activePromotions[0])}
                  </Badge>
                {product.pricing_type === 'one_time' && isProductOutOfStock && (
                  <Badge className="bg-gray-500 text-white text-sm font-semibold px-2 py-1 rounded-md">
                    Out of Stock
                  </Badge>
                )}
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
          {hasOptions && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              {productOptions.map((option: any) => (
                <div key={option.id} className="space-y-2">
                  <Label className="text-sm text-gray-700 capitalize">{option.name}</Label>
                  <div className="flex flex-wrap gap-2">
                    {option.values.map((value: any) => (
                      <Button
                        key={value.value}
                        variant={selectedOptions[option.name] === value.value ? "default" : "outline"}
                        onClick={() => setSelectedOptions(prev => ({ ...prev, [option.name]: value.value }))}
                        className={cn(
                          "capitalize text-sm h-9 px-4",
                          selectedOptions[option.name] === value.value ? "bg-red-500 text-white border-red-500 hover:bg-red-600" : "bg-gray-50 text-gray-800 border-gray-300 hover:bg-gray-100"
                        )}
                      >
                        {value.value}
                        {value.priceDifference !== 0 && (
                            <span className={cn("ml-1 font-mono text-xs", value.priceDifference > 0 ? "text-green-600" : "text-red-500")}>
                                ({formatCurrency(value.priceDifference, shopDetails?.currency, 'en-US', true)})
                            </span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
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
                    <div key={field.name} className="flex flex-col">
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <Icon className="h-3 w-3 text-gray-800" />
                        {field.name.replace(/_/g, ' ')}
                      </Label>
                      <p className="font-medium text-sm text-gray-800 pt-1">{Array.isArray(field.value) ? field.value.join(', ') : String(field.value)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity & Add to Cart / Buy Now - Responsive */}
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
                    outlineColorClass
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
                    outlineColorClass
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