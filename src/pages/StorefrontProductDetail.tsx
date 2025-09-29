import { useParams, Link } from "react-router-dom";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Loader2, ShoppingCart, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils"; // Import cn for conditional class names
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner"; // Import sonner for notifications

const StorefrontProductDetail = () => {
  const { shopSlug, productId } = useParams<{ shopSlug: string; productId: string }>();
  const { shopDetails, products, isLoading, error, appearanceSettings } = useStorefront();
  const [quantity, setQuantity] = useState(1);

  if (isLoading) {
    return <div className="container py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return <div className="container py-8 text-destructive">{error}</div>;
  }

  const product = products.find(p => p.id === productId);

  if (!product) {
    return (
      <div className="container py-8 text-center text-muted-foreground">
        <h1 className="text-2xl font-bold">Product Not Found</h1>
        <p className="mt-2">The product you are looking for does not exist or is no longer available.</p>
        <Button asChild className="mt-4">
          <Link to={`/shop/${shopSlug}`}>Back to Shop</Link>
        </Button>
      </div>
    );
  }

  const mediaItems = product.media_gallery?.length ? product.media_gallery : (product.media_url ? [product.media_url] : []);
  const blurEnabled = appearanceSettings?.blurEnabled;

  const handleAddToCart = () => {
    // Placeholder for actual add to cart logic
    toast.success(`${quantity} x "${product.name}" added to cart!`);
    console.log(`Added ${quantity} of ${product.name} to cart.`);
  };

  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Media */}
        <div>
          <Carousel className="w-full rounded-lg overflow-hidden border">
            <CarouselContent>
              {mediaItems.map((url: string, index: number) => (
                <CarouselItem key={index}>
                  <div className="relative aspect-square w-full bg-muted flex items-center justify-center">
                    <MediaItem src={url} alt={`${product.name} - image ${index + 1}`} />
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
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              <span>{product.category || 'Uncategorized'}</span>
              {product.details?.type && <span> &middot; {product.details.type}</span>}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold font-heading mb-3 leading-tight">{product.name}</h1>
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(product.price, product.currency || shopDetails?.currency)}
              {product.pricing_type === 'subscription' && (
                <span className="text-lg font-light text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
              )}
            </p>
          </div>

          <p className="text-muted-foreground leading-relaxed text-base">{product.caption || "No description provided."}</p>

          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag: string) => <Badge key={tag} variant="outline">{tag}</Badge>)}
            </div>
          )}

          <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card")}>
            <CardHeader><CardTitle className="text-xl">Product Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {Object.entries(product.details || {}).map(([key, value]) => {
                if (key === 'type') return null;
                const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                return (
                  <div key={key}>
                    <p className="font-medium capitalize">{key.replace(/_/g, ' ')}:</p>
                    <p className="text-muted-foreground">{displayValue}</p>
                  </div>
                );
              })}
              {product.pricing_type === 'one_time' && (
                <div>
                  <p className="font-medium">Inventory:</p>
                  <p className="text-muted-foreground">{product.inventory || 0}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {product.pricing_type === 'one_time' && product.inventory !== null && product.inventory > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(product.inventory || 1, parseInt(e.target.value) || 1)))}
                  className="w-16 text-center border-y-0 border-x rounded-none focus-visible:ring-0"
                  min={1}
                  max={product.inventory || 1}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(prev => Math.min(product.inventory || 1, prev + 1))}
                  disabled={quantity >= (product.inventory || 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button size="lg" className="flex-1" onClick={handleAddToCart}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
            </div>
          )}
          {product.pricing_type === 'one_time' && (product.inventory === null || product.inventory <= 0) && (
            <Button size="lg" className="w-full" disabled>
              Out of Stock
            </Button>
          )}
          {product.pricing_type === 'subscription' && (
            <Button size="lg" className="w-full" onClick={handleAddToCart}>
              <ShoppingCart className="mr-2 h-5 w-5" />
              Subscribe Now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StorefrontProductDetail;