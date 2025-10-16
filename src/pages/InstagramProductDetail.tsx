"use client";

import { useParams, Link, useNavigate } from "react-router-dom";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Loader2, ShoppingCart, Minus, Plus, Home, ArrowLeft, Star, Heart, MessageCircle, Send, Bookmark, DollarSign } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { getAttributeIcon } from "@/lib/attributeIcons";
import { type CarouselApi } from "@/components/ui/carousel";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { InstagramBreadcrumb } from "@/components/storefront/InstagramBreadcrumb"; // Import InstagramBreadcrumb

const DetailDisplayRow = ({ label, icon: Icon, children }: { label: string, icon: React.ElementType, children: React.ReactNode }) => (
    <div className="flex flex-col">
        <Label className="text-xs md:text-sm text-gray-500 flex items-center gap-1">
          <Icon className="h-3 w-3 md:h-3.5 md:w-3.5 text-gray-800" />
          {label}
        </Label>
        <div className="font-medium flex flex-wrap items-center gap-1 text-sm md:text-base pt-1">
            {children}
        </div>
    </div>
);

const InstagramProductDetail = () => {
  const { shopSlug, productId } = useParams<{ shopSlug: string; productId: string }>();
  const { shopDetails, products, isLoading, error, convertCurrency, promotions } = useStorefront();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
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
      <div className="container py-8 text-center text-red-600">
        <h1 className="text-xl md:text-2xl font-bold">Error Loading Product</h1>
        <p className="mt-2 text-sm md:text-base">{error}</p>
        <Button asChild className="mt-4 text-sm md:text-base">
          <Link to={`/instagramShop/${shopSlug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Link>
        </Button>
      </div>
    );
  }

  const product = products.find(p => p.id === productId);

  if (!product) {
    return (
      <div className="container py-8 text-center text-gray-600">
        <h1 className="text-xl md:text-2xl font-bold">Product Not Found</h1>
        <p className="mt-2 text-sm md:text-base">The product you are looking for does not exist or is no longer available.</p>
        <Button asChild className="mt-4 text-sm md:text-base">
          <Link to={`/instagramShop/${shopDetails?.slug}`}>
            <Home className="mr-2 h-4 w-4" />
            Back to Profile
          </Link>
        </Button>
      </div>
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

  const allDetails = Object.entries(product.details || {}).filter(([key, value]) => key !== 'type' && value && (!Array.isArray(value) || value.length > 0));
  const colors = allDetails.find(([key]) => key === 'color')?.[1] as string[] || [];
  const sizes = allDetails.find(([key]) => key === 'size')?.[1] as string[] || [];
  const otherOptions = allDetails.filter(([key]) => ['material'].includes(key));
  const specifications = allDetails.filter(([key]) => !['color', 'size', 'material', 'type'].includes(key));

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <main className="flex-1">
        <InstagramBreadcrumb />
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
            <ScrollArea className="mt-2 pb-2 px-4">
              <div className="flex gap-2">
                {mediaItems.map((url: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => api?.scrollTo(index)}
                    className={cn(
                      "h-16 w-16 rounded-md overflow-hidden border-2 transition-all flex-shrink-0",
                      index === currentSlide ? "border-red-500" : "border-gray-300 hover:border-gray-400" // Changed hover color
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

        {/* Engagement Icons */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-gray-800 hover:bg-gray-100"><Heart className="h-6 w-6" /></Button>
            <Button variant="ghost" size="icon" className="text-gray-800 hover:bg-gray-100"><MessageCircle className="h-6 w-6" /></Button>
            <Button variant="ghost" size="icon" className="text-gray-800 hover:bg-gray-100"><Send className="h-6 w-6" /></Button>
          </div>
          <Button variant="ghost" size="icon" className="text-gray-800 hover:bg-gray-100"><Bookmark className="h-6 w-6" /></Button>
        </div>

        {/* Product Details */}
        <div className="p-4 space-y-4">
          {/* Price and Discount */}
          <div className="flex items-baseline gap-3">
            {hasDiscount && originalDisplayPrice !== null ? (
              <>
                <p className="text-base text-gray-500 line-through">
                  {formatCurrency(originalDisplayPrice, shopDetails?.currency)}
                </p>
                <p className="text-2xl md:text-3xl font-bold text-green-600">
                  {formatCurrency(discountedPrice, shopDetails?.currency)}
                  {product.pricing_type === 'subscription' && (
                      <span className="text-base md:text-lg font-light text-gray-500">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                  )}
                </p>
                <Badge className="bg-green-500 text-white text-sm font-semibold px-2 py-1 rounded-md">
                  -{(100 - (discountedPrice / originalDisplayPrice) * 100).toFixed(0)}% Off
                </Badge>
              </>
            ) : (
              <p className="text-2xl md:text-3xl font-bold text-gray-800">
                {originalDisplayPrice != null ? formatCurrency(originalDisplayPrice, shopDetails?.currency) : 'N/A'}
                {product.pricing_type === 'subscription' && (
                    <span className="text-base md:text-lg font-light text-gray-500">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                )}
              </p>
            )}
          </div>

          {/* Caption */}
          <p className="text-sm md:text-base text-gray-800 leading-relaxed">
            <span className="font-semibold">{shopDetails?.username || shopDetails?.shop_name}</span>{" "}
            {product.caption || "No description provided."}
          </p>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag: string) => <Badge key={tag} variant="outline" className="text-xs md:text-sm bg-gray-100 text-gray-700 border-gray-300">{tag}</Badge>)}
            </div>
          )}

          {/* Options & Specifications */}
          {(colors.length > 0 || sizes.length > 0 || otherOptions.length > 0 || specifications.length > 0) && (
            <Card className="shadow-none bg-white border-none">
              <CardHeader className="px-0 pt-0 pb-2"><CardTitle className="text-lg md:text-xl text-gray-800">Options</CardTitle></CardHeader>
              <CardContent className="p-0 space-y-4">
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
                            "capitalize text-sm md:text-base h-9 w-9 rounded-full p-0 border-2",
                            selectedColor === color ? "border-red-500" : "border-gray-300", // Changed selected border to red
                            "hover:border-red-500" // Changed hover border to red
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
                            "text-sm md:text-base border-gray-300 bg-gray-50 text-gray-800 hover:bg-gray-100",
                            selectedSize === size && "bg-red-500 text-white hover:bg-red-600 border-red-500" // Changed selected to red
                          )}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {(otherOptions.length > 0 || specifications.length > 0) && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 md:gap-x-6 gap-y-3 md:gap-y-4">
                    {[...otherOptions, ...specifications].map(([key, value]) => {
                      const Icon = getAttributeIcon(key);
                      return (
                        <DetailDisplayRow key={key} label={key.replace(/_/g, ' ')} icon={Icon}>
                          {Array.isArray(value) ? (
                            value.map(item => <Badge key={item} variant="outline" className="text-xs md:text-sm bg-gray-100 text-gray-700 border-gray-300">{item}</Badge>)
                          ) : (
                            <p className="text-sm md:text-base text-gray-800">{String(value)}</p>
                          )}
                        </DetailDisplayRow>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="sticky bottom-0 left-0 right-0 z-30 p-4 border-t border-gray-200 bg-white shadow-lg flex items-center gap-4">
        {product.pricing_type === 'one_time' && product.inventory !== null && product.inventory > 0 && (
          <div className="flex items-center border border-gray-300 rounded-md">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
              disabled={quantity <= 1}
              className="h-8 w-8 text-gray-800 hover:bg-gray-100"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(product.inventory || 1, parseInt(e.target.value) || 1)))}
              className="w-14 text-center border-y-0 border-x border-gray-300 focus-visible:ring-0 text-sm bg-white"
              min={1}
              max={product.inventory || 1}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQuantity(prev => Math.min(product.inventory || 1, prev + 1))}
              disabled={quantity >= (product.inventory || 1)}
              className="h-8 w-8 text-gray-800 hover:bg-gray-100"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Button size="lg" className="flex-1 text-base md:text-lg bg-red-500 hover:bg-red-600 text-white rounded-md" onClick={handleAddToCart} disabled={isOutOfStock}>
          <ShoppingCart className="mr-2 h-5 w-5" />
          {isOutOfStock ? "Out of Stock" : (product.pricing_type === 'subscription' ? "Subscribe Now" : "Add to cart")}
        </Button>
        {/* Removed Buy Now button */}
      </div>
    </div>
  );
};

export default InstagramProductDetail;