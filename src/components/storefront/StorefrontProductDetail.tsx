import { useParams, Link } from "react-router-dom";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Loader2, ShoppingCart, Minus, Plus, Home, ArrowLeft, Star, Truck, Sparkles, User, Mail, MapPin, City, Globe, StickyNote, Calendar, Lock, CreditCard, DollarSign } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { getAttributeIcon } from "@/lib/attributeIcons"; // Import attribute icons
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard"; // Import StorefrontProductCard
import { StorefrontBreadcrumb } from "@/components/storefront/StorefrontBreadcrumb"; // Import StorefrontBreadcrumb
import { useRecentlyViewed } from "@/contexts/RecentlyViewedContext"; // Import useRecentlyViewed

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
  const [selectedColor, setSelectedColor] = useState<string | null>(null); // Placeholder for variant selection
  const [selectedSize, setSelectedSize] = useState<string | null>(null); // Placeholder for variant selection

  useEffect(() => {
    // Scroll to top when component mounts or productId changes
    window.scrollTo(0, 0);
  }, [productId]);

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

  const product = products.find(p => p.id === productId);

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

  // Convert product price to shop's display currency
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
    return true; // Applies to all products if target_products is empty
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

  const getPromotionBadge = (promo: Promotion) => {
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
    // In a real app, you'd pass selected variants here
    addToCart({
      productId: product.id,
      name: product.name + (selectedColor ? ` (${selectedColor})` : '') + (selectedSize ? ` (${selectedSize})` : ''),
      // Pass the converted price and shop's currency to cart
      price: hasDiscount ? discountedPrice : originalDisplayPrice, // Use discounted price if applicable
      currency: shopDetails.currency || 'USD',
      media_url: product.media_url,
      media_type: product.media_type,
      slug: shopDetails.slug,
    }, quantity);
  };

  const allDetails = Object.entries(product.details || {}).filter(([key, value]) => key !== 'type' && value && (!Array.isArray(value) || value.length > 0));
  const colors = allDetails.find(([key]) => key === 'color')?.[1] as string[] || [];
  const sizes = allDetails.find(([key]) => key === 'size')?.[1] as string[] || [];
  const otherOptions = allDetails.filter(([key]) => ['material'].includes(key)); // Example other options
  const specifications = allDetails.filter(([key]) => !['color', 'size', 'material', 'type'].includes(key)); // Example specs

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
          <Carousel className="w-full rounded-lg overflow-hidden border shadow-md">
            <CarouselContent>
              {mediaItems.map((url: string, index: number) => (
                <CarouselItem key={index}>
                  <div className="relative aspect-square w-full bg-muted flex items-center justify-center">
                    <MediaItem src={url} alt={`${product.name} - image ${index + 1}`} className={cn(isOutOfStock && "grayscale")} /> {/* Apply grayscale here */}
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
        </div>

        {/* Product Details */}
        <div className="space-y-4 md:space-y-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              <span>{product.category || 'Uncategorized'}</span>
              {product.details?.type && <span> &middot; {product.details.type}</span>}
            </p>
            <h1 className="text-3xl md:text-5xl font-bold font-heading mb-2 md:mb-3 leading-tight flex items-center gap-2">
              {product.name}
              {isOutOfStock && (
                <Badge variant="secondary" className="text-sm md:text-base bg-amber-500 text-white">
                  Coming Soon
                </Badge>
              )}
              {activePromotions.length > 0 && !isOutOfStock && (
                <div className="flex gap-1">
                  {activePromotions.map(promo => (
                    <Badge key={promo.id} className="bg-emerald-500 text-white text-sm md:text-base">
                      {getPromotionBadge(promo)}
                    </Badge>
                  ))}
                </div>
              )}
            </h1>
            <div className="flex items-center gap-3 mb-3">
                {hasDiscount && originalDisplayPrice !== null ? (
                  <div className="flex items-baseline gap-2">
                    <p className="text-base text-muted-foreground line-through">
                      {formatCurrency(originalDisplayPrice, shopDetails?.currency)}
                    </p>
                    <p className="text-2xl md:text-3xl font-bold text-primary">
                      {formatCurrency(discountedPrice, shopDetails?.currency)}
                      {product.pricing_type === 'subscription' && (
                          <span className="text-base md:text-lg font-light text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-2xl md:text-3xl font-bold text-primary">
                    {originalDisplayPrice != null ? formatCurrency(originalDisplayPrice, shopDetails?.currency) : 'N/A'}
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

          {/* Variant Selection (Placeholder) */}
          {(colors.length > 0 || sizes.length > 0 || otherOptions.length > 0) && (
            <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card", "shadow-md")}>
              <CardHeader><CardTitle className="text-lg md:text-xl">Options</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-4">
                {colors.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {colors.map(color => (
                        <Button
                          key={color}
                          variant={selectedColor === color ? "default" : "outline"}
                          onClick={() => setSelectedColor(color)}
                          className={cn("capitalize text-sm md:text-base", selectedColor === color && "ring-2 ring-primary ring-offset-2")}
                        >
                          {color}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {sizes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Size</Label>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map(size => (
                        <Button
                          key={size}
                          variant={selectedSize === size ? "default" : "outline"}
                          onClick={() => setSelectedSize(size)}
                          className={cn("text-sm md:text-base", selectedSize === size && "ring-2 ring-primary ring-offset-2")}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {otherOptions.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 md:gap-x-6 gap-y-3 md:gap-y-4">
                    {otherOptions.map(([key, value]) => {
                      const Icon = getAttributeIcon(key);
                      return (
                        <DetailDisplayRow key={key} label={key.replace(/_/g, ' ')} icon={Icon}>
                          {Array.isArray(value) ? (
                            value.map(item => <Badge key={item} variant="outline" className="text-xs md:text-sm bg-primary/10 text-primary border-primary/30">{item}</Badge>)
                          ) : (
                            <p className="text-sm md:text-base">{String(value)}</p>
                          )}
                        </DetailDisplayRow>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Specifications */}
          {specifications.length > 0 && (
            <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card", "shadow-md")}>
              <CardHeader><CardTitle className="text-lg md:text-xl">Specifications</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 md:gap-x-6 gap-y-3 md:gap-y-4">
                  {specifications.map(([key, value]) => {
                    const Icon = getAttributeIcon(key);
                    return (
                      <DetailDisplayRow key={key} label={key.replace(/_/g, ' ')} icon={Icon}>
                          <p className="text-sm md:text-base">{Array.isArray(value) ? value.join(', ') : String(value)}</p>
                      </DetailDisplayRow>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inventory & Add to Cart */}
          {product.pricing_type === 'one_time' && product.inventory !== null && product.inventory > 0 && (
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
                  onChange={(e) => setQuantity(Math.max(1, Math.min(product.inventory || 1, parseInt(e.target.value) || 1)))}
                  className="w-14 md:w-16 text-center border-y-0 border-x rounded-none focus-visible:ring-0 text-sm md:text-base"
                  min={1}
                  max={product.inventory || 1}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(prev => Math.min(product.inventory || 1, prev + 1))}
                  disabled={quantity >= (product.inventory || 1)}
                  className="h-8 w-8 md:h-9 md:w-9"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button size="lg" className="flex-1 text-base md:text-lg" onClick={handleAddToCart} disabled={isOutOfStock}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
            </div>
          )}
          {product.pricing_type === 'one_time' && (product.inventory === null || product.inventory <= 0) && (
            <Button size="lg" className="w-full text-base md:text-lg" disabled>
              Out of Stock
            </Button>
          )}
          {product.pricing_type === 'subscription' && (
            <Button size="lg" className="w-full text-base md:text-lg" onClick={handleAddToCart} disabled={isOutOfStock}>
              <ShoppingCart className="mr-2 h-5 w-5" />
              Subscribe Now
            </Button>
          )}

          {/* Shipping & Returns (Placeholder) */}
          <Card className={cn("shadow-md", blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card")}>
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
      <Card className={cn("mt-8 md:mt-12 shadow-md", blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card")}>
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