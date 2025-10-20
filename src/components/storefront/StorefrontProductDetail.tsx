import { useParams, Link } from "react-router-dom";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Loader2, ShoppingCart, Minus, Plus, Home, ArrowLeft, Star, Truck, Sparkles, User, Mail, MapPin, City, Globe, StickyNote, Calendar, Lock, CreditCard, DollarSign } from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { getAttributeIcon } from "@/lib/attributeIcons"; // Import attribute icons
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard"; // Import StorefrontProductCard
import { StorefrontBreadcrumb } from "@/components/storefront/StorefrontBreadcrumb"; // Import StorefrontBreadcrumb
import { useRecentlyViewed } from "@/contexts/RecentlyViewedContext"; // Import useRecentlyViewed
import { type CarouselApi } from "@/components/ui/carousel"; // Import CarouselApi type
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // Import ScrollArea and ScrollBar

const DetailDisplayRow = ({ label, icon: Icon, children }: { label: string, icon: React.ElementType, children: React.ReactNode }) => (
    <div className="flex flex-col">
        <Label className="text-xs md:text-sm text-muted-foreground flex items-center gap-1">
          <Icon className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" /> {/* Changed to text-primary */}
          {label}
        </Label>
        <div className="font-medium flex flex-wrap items-center gap-1 text-sm md:text-base pt-1">
            {children}
        </div>
    </div>
);

const StorefrontProductDetail = () => {
  const { shopSlug, productId } = useParams<{ shopSlug: string; productId: string }>();
  const { shopDetails, products, isLoading, error, appearanceSettings, convertCurrency, promotions } = useStorefront();
  const { addToCart } = useCart();
  const { addRecentlyViewed } = useRecentlyViewed(); // Use the new hook
  const [quantity, setQuantity] = useState(1);

  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  const product = products.find(p => p.id === productId);
  const productOptions = product?.details?.options || [];
  const hasOptions = productOptions.length > 0;

  // State for selected option values (e.g., { Color: 'Red', Size: 'M' })
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string | null }>(() => {
    const initial: { [key: string]: string | null } = {};
    productOptions.forEach((opt: any) => {
      initial[opt.name] = opt.values[0]?.value || null; // Default to first value
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
          initial[opt.name] = opt.values[0]?.value || null;
        });
        return initial;
      });
    }
  }, [product, productOptions]);

  useEffect(() => {
    // Scroll to top when component mounts or productId changes
    window.scrollTo(0, 0);
  }, [productId]);

  useEffect(() => {
    if (!api) return;
    setCurrentSlide(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrentSlide(api.selectedScrollSnap());
    });
  }, [api]);

  if (isLoading) {
    return <div className="container py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="container py-8 text-center text-destructive">
        <h1 className="text-xl md:text-2xl font-bold">Error Loading Product</h1>
        <p className="mt-2 text-sm md:text-base">{error}</p>
        <Button asChild className="mt-4 text-sm md:text-base">
          <Link to={`/shop/${shopSlug}/products`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
      </div>
    );
  }

  useEffect(() => {
    if (product && shopDetails?.slug) {
      addRecentlyViewed({
        id: product.id,
        name: product.name,
        media_url: product.media_url,
        price: product.price || 0,
        currency: product.currency || shopDetails.currency || 'USD',
        shopSlug: shopDetails.slug,
      });
    }
  }, [product, shopDetails?.slug, addRecentlyViewed]);

  if (!product) {
    return (
      <div className="container py-8 text-center text-muted-foreground">
        <h1 className="text-xl md:text-2xl font-bold">Product Not Found</h1>
        <p className="mt-2 text-sm md:text-base">The product you are looking for does not exist or is no longer available.</p>
        <Button asChild className="mt-4 text-sm md:text-base">
          <Link to={`/shop/${shopDetails.slug}/products`}>
            <Home className="mr-2 h-4 w-4" />
            Back to Shop
          </Link>
        </Button>
      </div>
    );
  }

  const mediaItems = product.media_gallery?.length ? product.media_gallery : (product.media_url ? [product.media_url] : []);
  const blurEnabled = appearanceSettings?.blurEnabled;

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
  
  // --- Promotion Logic ---
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
    return true; // Applies to all products if target_products is empty
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
    if (hasOptions) {
        Object.entries(selectedOptions).forEach(([key, value]) => {
            if (value) optionsForCart[key] = value;
        });
    }

    addToCart({
      productId: product.id,
      name: product.name,
      price: hasDiscount ? discountedPrice : finalDisplayPrice, // Use final calculated price
      originalPrice: finalDisplayPrice, // Pass final price as original price for discount calculation
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

  // Filter out options and variants from general details to get specifications
  const specifications = useMemo(() => {
    const reservedKeys = new Set(['type', 'options', 'variants']);
    return Object.entries(product.details || {})
        .filter(([key]) => !reservedKeys.has(key))
        .map(([key, value]) => ({ name: key, value }));
  }, [product.details]);

  const relatedProducts = useMemo(() => {
    // Filter out the current product and take up to 4 other products
    return products.filter(p => p.id !== product.id).slice(0, 4);
  }, [products, product.id]);

  return (
    <div className="container py-6 md:py-8">
      <StorefrontBreadcrumb />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Media */}
        <div>
          <Carousel setApi={setApi} className="w-full rounded-lg overflow-hidden border shadow-md">
            <CarouselContent>
              {mediaItems.map((url: string, index: number) => (
                <CarouselItem key={index}>
                  <div className="relative aspect-square w-full bg-muted flex items-center justify-center">
                    <MediaItem src={url} alt={`${product.name} - image ${index + 1}`} type={product.media_type} className={cn(isProductOutOfStock && "grayscale")} /> {/* Apply grayscale here */}
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
            <ScrollArea className="mt-4 pb-2">
              <div className="flex gap-2">
                {mediaItems.map((url: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => api?.scrollTo(index)}
                    className={cn(
                      "h-20 w-20 rounded-md overflow-hidden border-2 transition-all flex-shrink-0",
                      index === currentSlide ? "border-primary" : "border-transparent hover:border-muted-foreground"
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

        {/* Product Details */}
        <div className="space-y-4 md:space-y-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              <span>{product.category || 'Uncategorized'}</span>
              {product.details?.type && <span> &middot; {product.details.type}</span>}
            </p>
            <h1 className="text-3xl md:text-5xl font-bold font-heading mb-2 md:mb-3 leading-tight flex flex-wrap items-center gap-2"> {/* Added flex-wrap */}
              {product.name}
              {isProductOutOfStock && (
                <Badge variant="secondary" className="text-sm md:text-base bg-amber-500 text-white flex-shrink-0"> {/* Added flex-shrink-0 */}
                  Coming Soon
                </Badge>
              )}
              {activePromotions.length > 0 && !isProductOutOfStock && (
                <div className="flex gap-1 flex-shrink-0"> {/* Added flex-shrink-0 */}
                  {activePromotions.map(promo => (
                    <Badge key={promo.id} className="bg-emerald-500 text-white text-sm md:text-base">
                      {getPromotionBadge(promo)}
                    </Badge>
                  ))}
                </div>
              )}
            </h1>
            <div className="flex items-center gap-3 mb-3">
                {hasDiscount && finalDisplayPrice !== null ? (
                  <div className="flex items-baseline gap-2">
                    <p className="text-base text-muted-foreground line-through">
                      {formatCurrency(basePriceInDisplay, shopDetails?.currency)}
                    </p>
                    <p className="text-2xl md:text-3xl font-bold text-emerald-600"> {/* Made discounted price green */}
                      {formatCurrency(discountedPrice, shopDetails?.currency)}
                      {product.pricing_type === 'subscription' && (
                          <span className="text-base md:text-lg font-light text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-2xl md:text-3xl font-bold text-primary">
                    {finalDisplayPrice != null ? formatCurrency(finalDisplayPrice, shopDetails?.currency) : 'N/A'}
                    {product.pricing_type === 'subscription' && (
                        <span className="text-base md:text-lg font-light text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                    )}
                  </p>
                )}
                {/* Placeholder for star ratings */}
                <div className="flex items-center text-amber-500">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn("h-4 w-4 md:h-5 md:w-5", i < 4 ? "fill-amber-500" : "fill-muted stroke-muted-foreground")} />
                    ))}
                    <span className="ml-1 md:ml-2 text-sm text-muted-foreground">(4.0 / 5.0)</span>
                </div>
            </div>
          </div>

          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{product.caption || "No description provided."}</p>

          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag: string) => <Badge key={tag} variant="outline" className="text-xs md:text-sm bg-primary/10 text-primary border-primary/30">{tag}</Badge>)}
            </div>
          )}

          {/* Variant Selection */}
          {hasOptions && (
            <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card", "shadow-md")}>
              <CardHeader><CardTitle className="text-lg md:text-xl">Options</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-4">
                {productOptions.map((option: any) => (
                  <div key={option.id} className="space-y-2">
                    <Label className="text-sm capitalize">{option.name}</Label>
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((value: any) => (
                        <Button
                          key={value.value}
                          variant={selectedOptions[option.name] === value.value ? "default" : "outline"}
                          onClick={() => setSelectedOptions(prev => ({ ...prev, [option.name]: value.value }))}
                          className={cn("capitalize text-sm md:text-base", selectedOptions[option.name] === value.value && "ring-2 ring-primary ring-offset-2")}
                        >
                          {value.value}
                          {value.priceDifference !== 0 && (
                              <span className={cn("ml-1 font-mono text-xs", value.priceDifference > 0 ? "text-emerald-600" : "text-destructive")}>
                                  ({formatCurrency(value.priceDifference, shopDetails?.currency, 'en-US', true)})
                              </span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Specifications */}
          {specifications.length > 0 && (
            <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card", "shadow-md")}>
              <CardHeader><CardTitle className="text-lg md:text-xl">Specifications</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 md:gap-x-6 gap-y-3 md:gap-y-4">
                  {specifications.map(field => {
                    const Icon = getAttributeIcon(field.name);
                    return (
                      <DetailDisplayRow key={field.name} label={field.name.replace(/_/g, ' ')} icon={Icon}>
                          <p className="text-sm md:text-base">{Array.isArray(field.value) ? field.value.join(', ') : String(field.value)}</p>
                      </DetailDisplayRow>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inventory & Add to Cart */}
          {product.pricing_type === 'one_time' && (
            <div className="space-y-4">
                {finalInventory !== null && (
                    <p className="text-sm font-medium text-muted-foreground">
                        {finalInventory > 0 ? (
                            <span className="text-emerald-600">{finalInventory} in stock</span>
                        ) : (
                            <span className="text-destructive">Out of Stock</span>
                        )}
                    </p>
                )}
                <div className="flex items-center gap-4">
                    <div className="flex items-center border rounded-md">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                            disabled={quantity <= 1}
                            className="h-8 w-8 md:h-9 md:w-9"
                        >
                            <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, Math.min(finalInventory || 1, parseInt(e.target.value) || 1)))}
                            className="w-14 md:w-16 text-center border-y-0 border-x rounded-none focus-visible:ring-0 text-sm md:text-base"
                            min={1}
                            max={finalInventory || 1}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setQuantity(prev => Math.min(finalInventory || 1, prev + 1))}
                            disabled={quantity >= (finalInventory || 1)}
                            className="h-8 w-8 md:h-9 md:w-9"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button size="lg" className="flex-1 text-base md:text-lg" onClick={handleAddToCart} disabled={isProductOutOfStock}>
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        Add to Cart
                    </Button>
                </div>
            </div>
          )}
          {product.pricing_type === 'subscription' && (
            <Button size="lg" className="w-full text-base md:text-lg" onClick={handleAddToCart} disabled={isProductOutOfStock}>
              <ShoppingCart className="mr-2 h-5 w-5" />
              Subscribe Now
            </Button>
          )}

          {/* Shipping & Returns (Placeholder) */}
          <Card className={cn("shadow-md", blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card")}>
            <CardContent className="p-4 flex items-center gap-4">
              <Truck className="h-6 w-6 text-primary flex-shrink-0" />
              <div>
                <p className="font-semibold text-base">Free Shipping & Easy Returns</p>
                <p className="text-sm text-muted-foreground">
                  Enjoy free standard shipping on all orders over {formatCurrency(50, shopDetails?.currency)}.
                  <br />
                  Not satisfied? Return within 30 days for a full refund. <Link to="#" className="text-primary hover:underline">Learn more</Link>.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer Reviews Section (Placeholder) */}
      <Card className={cn("mt-8 md:mt-12 shadow-md", blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card")}>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-500" />
            Customer Reviews (12)
          </CardTitle>
          <p className="text-sm md:text-base text-muted-foreground">What our customers are saying about this product.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center text-amber-500 text-2xl md:text-3xl font-bold">
              4.0
              <span className="ml-2 flex">
                {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn("h-6 w-6 md:h-7 md:w-7", i < 4 ? "fill-amber-500" : "fill-muted stroke-muted-foreground")} />
                ))}
              </span>
            </div>
            <Button variant="outline" className="text-sm md:text-base">Write a Review</Button>
          </div>
          <div className="space-y-4">
            {/* Example Review 1 */}
            <div className="border-b pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn("h-4 w-4", i < 5 ? "fill-amber-500" : "fill-muted stroke-muted-foreground")} />
                  ))}
                </div>
                <p className="font-semibold text-sm md:text-base">Amazing product!</p>
              </div>
              <p className="text-sm text-muted-foreground mb-2">"I absolutely love this product. The quality is fantastic and it arrived so quickly. Highly recommend!"</p>
              <p className="text-xs text-muted-foreground">— Jane Doe, 2 days ago</p>
            </div>
            {/* Example Review 2 */}
            <div className="border-b pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn("h-4 w-4", i < 4 ? "fill-amber-500" : "fill-muted stroke-muted-foreground")} />
                  ))}
                </div>
                <p className="font-semibold text-sm md:text-base">Good value for money</p>
              </div>
              <p className="text-sm text-muted-foreground mb-2">"It's a solid product for the price. Met my expectations. Would buy again."</p>
              <p className="text-xs text-muted-foreground">— John Smith, 1 week ago</p>
            </div>
            <Button variant="link" className="px-0 text-sm md:text-base">Read all 12 reviews</Button>
          </div>
        </CardContent>
      </Card>

      {/* You might also like section */}
      {relatedProducts.length > 0 && (
        <div className="mt-8 md:mt-12">
          <h2 className="text-2xl md:text-3xl font-bold font-heading mb-6 md:mb-8 text-center">You might also like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {relatedProducts.map(p => (
              <StorefrontProductCard key={p.id} product={p} shopSlug={shopDetails.slug} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StorefrontProductDetail;