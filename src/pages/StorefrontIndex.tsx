import { useStorefront } from "@/contexts/StorefrontContext";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { Search, ListFilter, ArrowUpNarrowWide, Tag, XCircle, Filter, ArrowRight, ChevronRight, Sparkles, Gift, Truck, RefreshCw, Crown, Info } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { getCategoryColor } from "@/lib/colorUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import { StorefrontFilterSidebar } from "@/components/storefront/StorefrontFilterSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { curatedImages } from "@/contexts/AppearanceContext"; // Import curated images
import { Marquee } from "@/components/ui/marquee"; // Import Marquee component

interface Product {
  id: string;
  name: string;
  category: string;
  tags: string[];
  price: number | null;
  currency: string | null;
  inventory: number;
  media_url: string;
  media_gallery: string[] | null;
  media_type: string | null;
  thumbnail_url?: string;
  caption: string;
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  details: { [key: string]: any };
  created_at: string;
}

interface FilterState {
  categories: string[];
  tags: string[];
  priceRange: string;
  [key: string]: string[] | string; // For dynamic attributes
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const StorefrontIndex = () => {
  const { shopDetails, products: allProducts, isLoading, error, appearanceSettings, bestSellers, recommendedProducts } = useStorefront();
  const isMobile = useIsMobile();
  const { onToggleFilterSidebar, isFilterSidebarOpen, setIsFilterSidebarOpen } = useOutletContext<{ onToggleFilterSidebar: () => void; isFilterSidebarOpen: boolean; setIsFilterSidebarOpen: (open: boolean) => void }>();
  const [searchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "");
  const [sortOption, setSortOption] = useState("newest");
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    tags: [],
    priceRange: "all",
  });
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(false); // Desktop sidebar starts hidden

  const blurEnabled = appearanceSettings?.blurEnabled;
  const productsSectionRef = useRef<HTMLDivElement>(null); // Ref for the products section

  useEffect(() => {
    // Update local searchTerm if URL search param changes
    const urlSearchTerm = searchParams.get('search');
    if (urlSearchTerm && urlSearchTerm !== searchTerm) {
      setSearchTerm(urlSearchTerm);
    } else if (!urlSearchTerm && searchTerm) {
      setSearchTerm(""); // Clear search term if param is removed
    }
  }, [searchParams]);

  const handleShopNowClick = () => {
    productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    allProducts.forEach(p => {
      if (p.category) categories.add(p.category);
    });
    return Array.from(categories).sort();
  }, [allProducts]);

  const heroBackgroundImage = useMemo(() => {
    if (appearanceSettings?.backgroundImageUrl) {
      return appearanceSettings.backgroundImageUrl;
    }
    // Fallback to a random curated image if no custom background is set
    const randomIndex = Math.floor(Math.random() * curatedImages.length);
    return curatedImages[randomIndex].src;
  }, [appearanceSettings?.backgroundImageUrl]);

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-96 w-full mb-12" />
        <Skeleton className="h-16 w-full mb-12" />
        <Skeleton className="h-10 w-1/3 mx-auto mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="container py-8 text-destructive">{error}</div>;
  }

  if (!shopDetails) {
    return <div className="container py-8 text-center text-muted-foreground">Shop details not found.</div>;
  }

  return (
    <div className="flex">
      <div className="flex-1">
        <div className="container py-8">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={cn(
              "relative mb-16 p-8 md:p-16 rounded-xl text-center overflow-hidden min-h-[400px] flex items-center justify-center",
              blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card",
              "shadow-lg"
            )}
            style={{
              backgroundImage: `url(${heroBackgroundImage})`,
              backgroundSize: appearanceSettings?.backgroundSize || 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: appearanceSettings?.backgroundRepeat || 'no-repeat',
              filter: `
                brightness(${appearanceSettings?.backgroundBrightness || 100}%)
                contrast(${appearanceSettings?.backgroundContrast || 100}%)
                saturate(${appearanceSettings?.backgroundSaturation || 100}%)
                hue-rotate(${appearanceSettings?.backgroundHue || 0}deg)
              `,
            }}
          >
            <div className="absolute inset-0 bg-black/50" /> {/* Darker overlay for text readability */}
            <div className="relative z-10 text-primary-foreground max-w-4xl mx-auto"> {/* Ensure text is above overlay */}
              {shopDetails.logo_url && (
                <Avatar className="h-28 w-28 mx-auto mb-6 border-4 border-primary-foreground shadow-md">
                  <AvatarImage src={shopDetails.logo_url} alt={shopDetails.shop_name} />
                  <AvatarFallback className="text-5xl font-bold bg-primary-foreground text-primary">{shopDetails.shop_name?.[0]}</AvatarFallback>
                </Avatar>
              )}
              <h1 className="text-5xl md:text-6xl font-bold font-heading mb-4 leading-tight drop-shadow-lg">
                {shopDetails.shop_name}
              </h1>
              {shopDetails.headline && (
                <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-8 drop-shadow-md">
                  {shopDetails.headline}
                </p>
              )}
              <Button size="lg" onClick={handleShopNowClick} className="text-lg px-8 py-6 shadow-xl hover:scale-105 transition-transform">
                Shop Now <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </div>
          </motion.div>

          {/* About Us Section */}
          {shopDetails.about && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className={cn(
                "mb-16 p-8 rounded-xl shadow-lg text-center max-w-4xl mx-auto",
                blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
              )}
            >
              <h2 className="text-3xl font-bold font-heading mb-4 flex items-center justify-center gap-3">
                <Info className="h-7 w-7 text-blue-500" />
                About {shopDetails.shop_name}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {shopDetails.about}
              </p>
            </motion.div>
          )}

          {/* Promotional Marquee */}
          <div className="my-16">
            <Marquee pauseOnHover className="py-4 border-y">
              <div className="flex items-center gap-8 text-lg font-semibold text-primary">
                <Sparkles className="h-6 w-6 text-amber-500" />
                <span>FLASH SALE: Up to 50% OFF on selected items!</span>
                <Gift className="h-6 w-6 text-rose-500" />
                <span>FREE SHIPPING on all orders over {formatCurrency(50, shopDetails.currency)}!</span>
                <RefreshCw className="h-6 w-6 text-blue-500" />
                <span>New Arrivals Every Week!</span>
                <Tag className="h-6 w-6 text-emerald-500" />
                <span>Don't miss out on our exclusive bundles!</span>
              </div>
            </Marquee>
          </div>

          {/* Product Category Cards */}
          {uniqueCategories.length > 0 && (
            <div className="mb-16">
              <h2 className="text-4xl font-bold font-heading mb-10 text-center flex items-center justify-center gap-3">
                <Filter className="h-8 w-8 text-blue-400" />
                Shop by Category
              </h2>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
              >
                {uniqueCategories.map(category => {
                  const categoryProduct = allProducts.find(p => p.category === category);
                  const categoryColor = getCategoryColor(category);
                  return (
                    <motion.div key={category} variants={containerVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
                      <Link to={`/shop/${shopDetails.slug}/products?category=${encodeURIComponent(category)}`}>
                        <Card className={cn(
                          "group h-full flex flex-col overflow-hidden transition-shadow hover:shadow-xl",
                          blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
                        )}>
                          <CardContent className="p-0">
                            <div className="aspect-square w-full overflow-hidden bg-muted">
                              {categoryProduct?.media_url ? (
                                <MediaItem
                                  src={categoryProduct.media_url}
                                  alt={category}
                                  type={categoryProduct.media_type}
                                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                  <Tag className="h-12 w-12" />
                                </div>
                              )}
                            </div>
                          </CardContent>
                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <h3 className="font-semibold text-lg leading-tight mb-1 line-clamp-2">{category}</h3>
                            <Badge
                              variant="outline"
                              className={cn("mb-2", categoryColor.bg, categoryColor.text, categoryColor.border)}
                            >
                              {allProducts.filter(p => p.category === category).length} Products
                            </Badge>
                          </div>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          )}

          {/* Best Sellers Section */}
          {bestSellers.length > 0 && (
            <div className="mb-16">
              <h2 className="text-4xl font-bold font-heading mb-10 text-center flex items-center justify-center gap-3">
                <Crown className="h-8 w-8 text-amber-400" />
                Best Sellers
              </h2>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
              >
                {bestSellers.map((product) => (
                  <StorefrontProductCard key={product.product_id} product={product as Product} shopSlug={shopDetails.slug} />
                ))}
              </motion.div>
            </div>
          )}

          {/* Recommended Products Section */}
          {recommendedProducts.length > 0 && (
            <div className="mb-16">
              <h2 className="text-4xl font-bold font-heading mb-10 text-center flex items-center justify-center gap-3">
                <Sparkles className="h-8 w-8 text-purple-400" />
                Recommended For You
              </h2>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
              >
                {recommendedProducts.map((product) => (
                  <StorefrontProductCard key={product.id} product={product} shopSlug={shopDetails.slug} />
                ))}
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StorefrontIndex;