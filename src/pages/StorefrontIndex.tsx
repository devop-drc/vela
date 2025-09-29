import { useStorefront } from "@/contexts/StorefrontContext";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";

const StorefrontIndex = () => {
  const { shopDetails, products, isLoading, error } = useStorefront();

  if (isLoading) {
    return <div className="container py-8">Loading products...</div>; // Skeleton handled by layout
  }

  if (error) {
    return <div className="container py-8 text-destructive">{error}</div>;
  }

  if (!shopDetails) {
    return <div className="container py-8 text-center text-muted-foreground">Shop details not found.</div>;
  }

  return (
    <div className="container py-8">
      <h1 className="text-4xl font-bold mb-2">{shopDetails.headline || shopDetails.shop_name}</h1>
      {shopDetails.about && <p className="text-muted-foreground mb-8 max-w-2xl">{shopDetails.about}</p>}

      <h2 className="text-2xl font-semibold mb-6">Our Products</h2>
      
      {products.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
          <h3 className="text-lg font-semibold">No Products Available</h3>
          <p className="text-sm mt-1">Check back later for new arrivals!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <Link to={`/shop/${shopDetails.id}/product/${product.id}`} key={product.id}>
              <Card className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="aspect-square w-full overflow-hidden bg-muted">
                    <MediaItem src={product.media_url} alt={product.name} type={product.media_type} className="object-cover" />
                  </div>
                </CardContent>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-lg leading-tight mb-1">{product.name}</h3>
                    {product.category && <Badge variant="secondary" className="mb-2">{product.category}</Badge>}
                    <p className="text-sm text-muted-foreground line-clamp-2">{product.caption}</p>
                  </div>
                  <div className="mt-4">
                    <p className="text-xl font-bold">
                      {formatCurrency(product.price, product.currency || shopDetails.currency)}
                      {product.pricing_type === 'subscription' && (
                        <span className="text-sm font-light text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default StorefrontIndex;