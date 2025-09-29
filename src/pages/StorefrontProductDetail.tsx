import { useParams, Link } from "react-router-dom";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Loader2, ShoppingCart } from "lucide-react";

const StorefrontProductDetail = () => {
  const { shopSlug, productId } = useParams<{ shopSlug: string; productId: string }>(); // Changed to shopSlug
  const { shopDetails, products, isLoading, error } = useStorefront();

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
          <Link to={`/shop/${shopSlug}`}>Back to Shop</Link> {/* Use shopSlug */}
        </Button>
      </div>
    );
  }

  const mediaItems = product.media_gallery?.length ? product.media_gallery : (product.media_url ? [product.media_url] : []);

  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <Carousel className="w-full rounded-lg overflow-hidden">
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
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
            {product.category && <Badge variant="secondary" className="mb-4">{product.category}</Badge>}
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(product.price, product.currency || shopDetails?.currency)}
              {product.pricing_type === 'subscription' && (
                <span className="text-lg font-light text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
              )}
            </p>
          </div>

          <p className="text-muted-foreground leading-relaxed">{product.caption || "No description provided."}</p>

          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag: string) => <Badge key={tag} variant="outline">{tag}</Badge>)}
            </div>
          )}

          <Card>
            <CardHeader><CardTitle className="text-lg">Product Details</CardTitle></CardHeader>
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

          <Button size="lg" className="w-full">
            <ShoppingCart className="mr-2 h-5 w-5" />
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StorefrontProductDetail;