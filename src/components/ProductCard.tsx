import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Checkbox } from "./ui/checkbox";
import { AlertTriangle, Palette, Ruler, Tag, Frame, ScanText, Package, Layers, Star } from "lucide-react"; // Import Package & Layers icons
import { StatusDot } from "@/components/ui-app";
import { useProductRating } from "@/hooks/useProductRating";

import { ProductStatusDropdown } from "./ProductStatusDropdown";
import { Badge } from "./ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import { MediaItem } from "./MediaItem";
import { getStockStatus } from "@/lib/stock";

type ProductStatus = 'Active' | 'Draft' | 'Out of Stock';
type GridSizeType = 'sm' | 'md' | 'lg';

interface Product {
  id: string;
  name: string;
  status: ProductStatus;
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
  details: {
    [key: string]: any;
  };
}

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  isSelectionModeActive: boolean;
  gridSize: GridSizeType;
  onSelect: (productId: string) => void;
  onEdit: (product: Product) => void;
  onStatusChange: (productId: string, newStatus: ProductStatus) => void;
}

const DetailRow = ({ icon: Icon, children }: { icon: React.ElementType, children: React.ReactNode }) => (
  <div className="flex items-start gap-2 text-xs text-muted-foreground">
    <Icon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
    <div className="flex flex-wrap items-center gap-1.5">{children}</div>
  </div>
);

export const ProductCard = ({ product, isSelected, isSelectionModeActive, gridSize, onSelect, onEdit, onStatusChange }: ProductCardProps) => {
  const { shopDetails, convertCurrency } = useShop();
  const rating = useProductRating(product.id);

  const handleCardClick = () => {
    if (isSelectionModeActive) {
      onSelect(product.id);
    } else {
      onEdit(product);
    }
  };

  const { details, caption, currency } = product;
  
  // Convert price to display currency
  let displayPrice = product.price;
  if (product.price != null && shopDetails?.currency) {
    displayPrice = convertCurrency(product.price, product.currency, shopDetails.currency);
  }

  // Format the original price (which is now always ALL) with its currency for comparison if needed
  const originalPriceFormatted = product.price != null && product.currency 
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(product.price)
    : '';

  const mediaItems = product.media_gallery?.length ? product.media_gallery : (product.media_url ? [product.media_url] : []);
  

  // Stock chip — tokenised (dark-safe) via the shared StatusDot tones so the
  // card matches the table + filter rail. "in" → success, low/critical →
  // warning, out → danger, subscription → success, unknown → neutral.
  const getStockDot = (inventory: number | null) => {
    if (product.pricing_type === 'subscription') {
      return <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success"><StatusDot tone="success" />Sub</span>;
    }
    if (inventory === null) {
      return <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground"><StatusDot tone="neutral" />N/A</span>;
    }
    const status = getStockStatus(inventory);
    if (status === "in") {
      return <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success"><StatusDot tone="success" />{inventory}</span>;
    }
    if (status === "low" || status === "critical") {
      return <span className="inline-flex items-center gap-1 text-[10px] font-medium text-warning"><StatusDot tone="warning" />{inventory} left</span>;
    }
    return <span className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive"><StatusDot tone="danger" />Out</span>;
  };

  return (
    <div className="relative h-full overflow-visible transition-transform duration-200 hover:-translate-y-1">
      <Card
        className={cn(
          "group w-full overflow-hidden rounded-lg transition-all duration-300 flex flex-col cursor-pointer h-full shadow-sm hover:shadow-md",
          isSelectionModeActive && "ring-2 ring-border/60 shadow-md",
          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md"
        )}
      >
        <Carousel 
          className="w-full group/carousel"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <CarouselContent onClick={handleCardClick}>
            {mediaItems.map((url, index) => (
              <CarouselItem key={index}>
                <div className="aspect-square overflow-hidden bg-muted">
                  <MediaItem 
                    src={url} 
                    alt={`${product.name} media ${index + 1}`} 
                    type={index === 0 ? product.media_type : null}
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {mediaItems.length > 1 && <>
            <CarouselPrevious onClick={(e) => e.stopPropagation()} className="left-2 opacity-0 group-hover/carousel:opacity-100" />
            <CarouselNext onClick={(e) => e.stopPropagation()} className="right-2 opacity-0 group-hover/carousel:opacity-100" />
          </>}
        </Carousel>

        <div className="bg-card p-3 flex-1 flex flex-col justify-between space-y-2.5" onClick={handleCardClick}>
          <div className="space-y-1.5">
            {/* Category · Type on one line */}
            <p className="text-[10px] text-muted-foreground truncate">
              {product.category || 'Uncategorized'}
              {product.details?.type && (
                <span> · {product.details.type}</span>
              )}
            </p>

            <div className="flex items-start gap-1.5">
              {product.details?.multi_product && <Layers className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />}
              <h3 className="font-semibold tracking-tight leading-snug">{product.name}</h3>
            </div>

            {rating && rating.count > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                {rating.avg.toFixed(1)} <span className="text-muted-foreground/70">({rating.count})</span>
              </span>
            )}

            {caption && (
              <p className="text-xs text-muted-foreground line-clamp-2">{caption}</p>
            )}
            
            {(gridSize === 'md' || gridSize === 'lg') && product.tags && product.tags.length > 0 && (
              <div className="pt-1">
                <DetailRow icon={Tag}>
                  {(gridSize === 'lg' ? product.tags : product.tags.slice(0, 4)).map(tag => <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-xs">{tag}</Badge>)}
                </DetailRow>
              </div>
            )}

            {/* Spec/option indicators */}
            {gridSize !== 'sm' && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {Object.keys(details || {}).filter(k => !['type', 'options', 'multi_product', 'Brand'].includes(k)).length > 0 && (
                  <span>{Object.keys(details || {}).filter(k => !['type', 'options', 'multi_product', 'Brand'].includes(k)).length} specs</span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-1">
            {product.details?.multi_product ? (
              <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                <Layers className="h-4 w-4" />
                Multi-Product
              </div>
            ) : (
              <div className="flex flex-col min-w-0">
                {product.price != null && shopDetails ? (
                  <>
                    <p className="font-bold text-xl leading-tight whitespace-nowrap">
                      {displayPrice != null ? (
                        <>
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: shopDetails.currency
                          }).format(displayPrice)}
                          {product.pricing_type === 'subscription' && (
                            <span className="text-xs font-normal text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                          )}
                        </>
                      ) : 'N/A'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {product.currency && product.currency !== shopDetails.currency && (
                        <span className="text-[10px] text-muted-foreground">{originalPriceFormatted}</span>
                      )}
                      {getStockDot(product.inventory)}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    Set Price
                  </div>
                )}
              </div>
            )}
            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <ProductStatusDropdown
                currentStatus={product.status}
                onStatusChange={(newStatus) => onStatusChange(product.id, newStatus)}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};