import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Checkbox } from "./ui/checkbox";
import { AlertTriangle, Palette, Ruler, Tag, Frame, ScanText, Cog, Package } from "lucide-react"; // Import Package icon
import { ProductStatusDropdown } from "./ProductStatusDropdown";
import { Badge } from "./ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import { MediaItem } from "./MediaItem";

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
  
  const detailsToDisplay = Object.entries(details || {}).filter(([key, value]) => key !== 'type' && value && (!Array.isArray(value) || value.length > 0));

  const getStockBadge = (inventory: number | null) => {
    if (product.pricing_type === 'subscription') {
      return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">Subscription</Badge>;
    }
    if (inventory === null) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">N/A</Badge>;
    }
    if (inventory > 10) {
      return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">In Stock</Badge>;
    }
    if (inventory > 0 && inventory <= 10) {
      return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Low Stock</Badge>;
    }
    return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">Out of Stock</Badge>;
  };

  return (
    <motion.div layout whileHover={{ y: -5, transition: { duration: 0.2 } }} className="relative h-full overflow-visible">
      <Card 
        className={cn(
          "group w-full overflow-hidden rounded-lg transition-all duration-300 flex flex-col cursor-pointer h-full shadow-sm",
          isSelectionModeActive && "ring-2 ring-gray-400 shadow-md",
          isSelected && "ring-primary ring-offset-2 shadow-2xl"
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

        <div className="bg-card p-3 flex-1 flex flex-col justify-between space-y-3" onClick={handleCardClick}>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">
              <span>{product.category || 'Uncategorized'}</span>
              {product.details?.type && <span> &middot; {product.details.type}</span>}
            </div>

            <h3 className="font-semibold tracking-tight leading-snug flex items-center gap-2">
              {product.name}
              {getStockBadge(product.inventory)}
            </h3>

            {(gridSize === 'md' || gridSize === 'lg') && caption && (
              <p className="text-xs text-muted-foreground line-clamp-2">{caption}</p>
            )}
            
            {(gridSize === 'md' || gridSize === 'lg') && product.tags && product.tags.length > 0 && (
              <div className="pt-1">
                <DetailRow icon={Tag}>
                  {(gridSize === 'lg' ? product.tags : product.tags.slice(0, 4)).map(tag => <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-xs">{tag}</Badge>)}
                </DetailRow>
              </div>
            )}

            {gridSize === 'lg' && detailsToDisplay.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {detailsToDisplay.slice(0, 2).map(([key, value]) => (
                  <DetailRow key={key} icon={Cog}>
                    <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                    <span className="truncate">{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                  </DetailRow>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-end justify-between pt-2">
            {product.price != null && shopDetails ? ( // Ensure shopDetails is available
              <div className="flex flex-col">
                <p className="font-semibold text-lg">
                  {displayPrice != null ? (
                    <>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: shopDetails.currency
                      }).format(displayPrice)}
                      {product.pricing_type === 'subscription' && (
                        <span className="text-sm font-light text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                      )}
                    </>
                  ) : 'N/A'}
                </p>
                {product.currency && product.currency !== shopDetails.currency && (
                  <span className="text-xs text-muted-foreground">
                    {originalPriceFormatted}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                Set Price
              </div>
            )}
            <ProductStatusDropdown 
              currentStatus={product.status} 
              onStatusChange={(newStatus) => onStatusChange(product.id, newStatus)} 
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
};