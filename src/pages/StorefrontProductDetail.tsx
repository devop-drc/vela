import { useParams, Link } from "react-router-dom";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Loader2, ShoppingCart, Minus, Plus, Home, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { getAttributeIcon } from "@/lib/attributeIcons"; // Import attribute icons

const DetailDisplayRow = ({ label, icon: Icon, children }: { label: string, icon: React.ElementType, children: React.ReactNode }) => (
    <div className="flex flex-col">
        <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Label>
        <div className="font-medium flex flex-wrap items-center gap-1.5 text-base pt-1">
            {children}
        </div>
    </div>
);

const StorefrontProductDetail = () => {
  const { shopSlug, productId } = useParams<{ shopSlug: string; productId: string }>();
  const { shopDetails, products, isLoading, error, appearanceSettings } = useStorefront();
  const { addToCart } = useCart();
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
          <Link to={`/shop/${shopSlug}`}>
            <Home className="mr-2 h-4 w-4" />
            Back to Shop
          </Link>
        </Button>
      </div>
    );
  }

  const mediaItems = product.media_gallery?.length ? product.media_gallery : (product.media_url ? [product.media_url] : []);
  const blurEnabled = appearanceSettings?.blurEnabled;

  const handleAddToCart = () => {
    if (!shopDetails?.slug) {
      toast.error("Shop details not available.");
      return;
    }
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price || 0,
      currency: product.currency || shopDetails.currency || 'USD',
      media_url: product.media_url,
      media_type: product.media_type,
      slug: shopDetails.slug,
    }, quantity);
  };

  const allDetails = Object.entries(product.details || {}).filter(([key, value]) => key !== 'type' && value && (!Array.isArray(value) || value.length > 0));
  const options = allDetails.filter(([key]) => ['color', 'size', 'material'].includes(key)); // Example options
  const specifications = allDetails.filter(([key]) => !['color', 'size', 'material'].includes(key)); // Example specs

  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-6">
        <Link to={`/shop/${shopSlug}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Link>
      </Button>
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

          {(options.length > 0 || specifications.length > 0) && (
            <Card className={cn(blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card")}>
              <CardHeader><CardTitle className="text-xl">Product Details</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-4">
                {options.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold mb-3">Options & Variants</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                      {options.map(([key, value]) => {
                        const Icon = getAttributeIcon(key);
                        return (
                          <DetailDisplayRow key={key} label={key.replace(/_/g, ' ')} icon={Icon}>
                            {Array.isArray(value) ? (
                              value.map(item => <Badge key={item} variant="outline">{item}</Badge>)
                            ) : (
                              <p className="text-base">{String(value)}</p>
                            )}
                          </DetailDisplayRow>
                        );
                      })}
                    </div>
                  </div>
                )}
                {options.length > 0 && specifications.length > 0 && <hr className="my-4" />}
                {specifications.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold mb-3">Specifications</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                      {specifications.map(([key, value]) => {
                        const Icon = getAttributeIcon(key);
                        return (
                          <DetailDisplayRow key={key} label={key.replace(/_/g, ' ')} icon={Icon}>
                              <p className="text-base">{Array.isArray(value) ? value.join(', ') : String(value)}</p>
                          </DetailDisplayRow>
                        );
                      })}
                    </div>
                  </div>
                )}
                {product.pricing_type === 'one_time' && (
                  <DetailDisplayRow label="Inventory" icon={Home}> {/* Using Home icon as a placeholder for inventory */}
                    <p className="text-base">{product.inventory || 0}</p>
                  </DetailDisplayRow>
                )}
              </CardContent>
            </Card>
          )}

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