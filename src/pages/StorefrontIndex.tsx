import { useStorefront } from "@/contexts/StorefrontContext";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowRight, Sparkles, Gift, RefreshCw, Crown, Info, Package } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react"; // Added useEffect
import { getCategoryColor } from "@/lib/colorUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { curatedImages } from "@/contexts/AppearanceContext";
import { Marquee } from "@/components/ui/marquee";
import { getCategoryIcon } from "@/lib/categoryIcons"; // Import category icons
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // Import ScrollArea and ScrollBar
import { supabase } from "@/integrations/supabase/client"; // Import supabase

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

interface Promotion {
  id: string;
  name: string;
  type: 'marquee_text' | 'discount' | 'offer';
  value: any;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  target_products: string[] | null;
}

const sectionVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      staggerChildren: 0.1,
      when: "beforeChildren",
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const StorefrontIndex = () => {
  const { shopDetails, products: allProducts, isLoading, error, appearanceSettings, bestSellers, recommendedProducts } = useStorefront();
  const productsSectionRef = useRef<HTMLDivElement>(null);
  const [marqueePromotions, setMarqueePromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    const fetchMarqueePromotions = async () => {
      if (!shopDetails?.id) return;

      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('user_id', shopDetails.id) // Assuming user_id in promotions table is business.user_id
        .eq('type', 'marquee_text')
        .eq('is_active', true)
        .or(`end_date.gte.${new Date().toISOString()},end_date.is.null`)
        .or(`start_date.lte.${new Date().toISOString()},start_date.is.null`);

      if (error) {
        console.error("Error fetching marquee promotions:", error);
      } else {
        setMarqueePromotions(data || []);
      }
    };

    if (shopDetails) {
      fetchMarqueePromotions();
    }
  }, [shopDetails]);

  const newArrivals = useMemo(() => {
    return allProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10); // Limit to 10
  }, [allProducts]);

  const uniqueCategoriesWithCount = useMemo(() => {
    const categoriesMap = new Map<string, number>();
    allProducts.forEach(p => {
      const category = p.category || 'Uncategorized';
      categoriesMap.set(category, (categoriesMap.get(category) || 0) + 1);
    });
    return Array.from(categoriesMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allProducts]);

  const heroBackgroundStyle = useMemo(() => {
    const style: React.CSSProperties = {
      borderRadius: appearanceSettings?.['--radius'] || '1.5rem',
      filter: `
        brightness(${appearanceSettings?.backgroundBrightness || 100}%)
        contrast(${appearanceSettings?.backgroundContrast || 100}%)
        saturate(${appearanceSettings?.backgroundSaturation || 100}%)
        hue-rotate(${appearanceSettings?.backgroundHue || 0}deg)
      `,
    };

    if (appearanceSettings?.backgroundImageUrl) {
      style.backgroundImage = `url(${appearanceSettings.backgroundImageUrl})`;
      style.backgroundSize = appearanceSettings.backgroundSize || 'cover';
      style.backgroundPosition = 'center';
      style.backgroundRepeat = appearanceSettings.backgroundRepeat || 'no-repeat';
      style.backgroundColor = 'transparent'; // Ensure solid color is not applied if image is present
    } else if (appearanceSettings?.solidBackgroundColor) {
      style.backgroundImage = 'none';
      style.backgroundColor = `hsl(${appearanceSettings.solidBackgroundColor})`;
    } else {
      // Fallback to transparent if no specific background is set
      style.backgroundImage = 'none';
      style.backgroundColor = 'transparent';
    }
    return style;
  }, [appearanceSettings]);

  const blurEnabled = appearanceSettings?.blurEnabled;

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
    return <div className="container py-8 text-destructive text-base md:text-lg">{error}</div>;
  }

  if (!shopDetails) {
    return <div className="container py-8 text-center text-muted-foreground text-base md:text-lg">Shop details not found.</div>;
  }

  return (
    <div className="flex-1">
      <div className="container py-8">
        {/* Hero Section - Redesigned */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          className={cn(
            "relative mb-16 p-0 rounded-xl text-center overflow-hidden min-h-[450px] flex items-center justify-center",
            "shadow-lg hero-blob-background"
          )}
          style={heroBackgroundStyle}
        >
          {/* Overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
          
          {/* Content Wrapper */}
          <div 
            className={cn(
              "relative z-10 text-primary-foreground max-w-4xl mx-auto p-8 md:p-16 h-full w-full flex flex-col items-center justify-center",
            )}
          >
            {shopDetails.logo_url && (
              <motion.div variants={itemVariants}>
                <Avatar className="h-24 w-24 md:h-28 md:w-28 mx-auto mb-4 md:mb-6 border-4 border-primary-foreground shadow-md">
                  <AvatarImage src={shopDetails.logo_url} alt={shopDetails.shop_name} />
                  <AvatarFallback className="text-4xl md:text-5xl font-bold bg-primary-foreground text-primary">{shopDetails.shop_name?.[0]}</AvatarFallback>
                </Avatar>
              </motion.div>
            )}
            <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl font-bold font-heading mb-3 md:mb-4 leading-tight drop-shadow-lg">
              {shopDetails.shop_name}
            </motion.h1>
            {shopDetails.headline && (
              <motion.p variants={itemVariants} className="text-lg md:text-2xl max-w-3xl mx-auto mb-3 md:mb-4 drop-shadow-md">
                {shopDetails.headline}
              </motion.p>
            )}
            {shopDetails.about && (
              <motion.p variants={itemVariants} className="text-base md:text-lg max-w-3xl mx-auto mb-6 md:mb-8 drop-shadow-md">
                {shopDetails.about}
              </motion.p>
            )}
            <motion.div variants={itemVariants}>
              <Link to={`/shop/${shopDetails.slug}/products`} className={cn(buttonVariants({ size: "lg" }), "text-base md:text-lg px-6 py-4 md:px-8 md:py-6 shadow-xl hover:scale-105 transition-transform")}>
                Shop Now <ArrowRight className="ml-2 md:ml-3 h-4 w-4 md:h-5 md:w-5" />
              </Link>
            </motion.div>
          </div>
        </motion.section>

        {/* Promotional Marquee */}
        {marqueePromotions.length > 0 && (
          <motion.section
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
            className="my-12 md:my-16"
          >
            <Marquee pauseOnHover className="py-3 md:py-4 border-y-2 border-primary/20 bg-primary/10">
              {marqueePromotions.map(promo => (
                <div key={promo.id} className="flex items-center gap-6 md:gap-8 text-base md:text-lg font-semibold text-primary">
                  <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-amber-500" />
                  <span>{promo.value.message}</span>
                </div>
              ))}
            </Marquee>
          </motion.section>
        )}

        {/* Featured Categories */}
        {uniqueCategoriesWithCount.length > 0 && (
          <motion.section
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
            className="mb-12 md:mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold font-heading mb-8 md:mb-10 text-center flex items-center justify-center gap-2 md:gap-3">
              <Package className="h-7 w-7 md:h-8 md:w-8 text-blue-400" />
              Shop by Category
            </h2>
            <motion.div
              variants={sectionVariants}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8"
            >
              {uniqueCategoriesWithCount.map(([category, count]) => {
                const CategoryIcon = getCategoryIcon(category);
                const categoryColor = getCategoryColor(category);
                return (
                  <motion.div key={category} variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
                    <Link to={`/shop/${shopDetails.slug}/products?category=${encodeURIComponent(category)}`}>
                      <Card className={cn(
                        "group h-full flex flex-col items-center justify-center p-5 md:p-6 text-center transition-shadow hover:shadow-xl",
                        blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card",
                        "shadow-md"
                      )}>
                        <CategoryIcon className={cn("h-14 w-14 md:h-16 md:w-16 mb-3 md:mb-4", categoryColor.text)} />
                        <h3 className="font-semibold text-base md:text-lg leading-tight mb-1 line-clamp-2">{category}</h3>
                        <Badge
                          variant="outline"
                          className={cn("text-xs md:text-sm mb-2", categoryColor.bg, categoryColor.text, categoryColor.border)}
                        >
                          {count} Products
                        </Badge>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.section>
        )}

        {/* Best Sellers Section */}
        {bestSellers.length > 0 && (
          <motion.section
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
            className="mb-12 md:mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold font-heading mb-8 md:mb-10 text-center flex items-center justify-center gap-2 md:gap-3">
              <Crown className="h-7 w-7 md:h-8 md:w-8 text-amber-400" />
              Our Best Sellers
            </h2>
            <ScrollArea className="w-full whitespace-nowrap pb-4">
              <div className="flex w-max space-x-6 md:space-x-8 p-4">
                {bestSellers.map((product) => (
                  <StorefrontProductCard key={product.product_id} product={product as Product} shopSlug={shopDetails.slug} className="w-[240px] md:w-[280px] flex-shrink-0" />
                ))}
                {bestSellers.length >= 10 && (
                  <div className="flex-shrink-0 w-[240px] md:w-[280px] flex items-center justify-center">
                    <Link to={`/shop/${shopDetails.slug}/products?sort=best-sellers`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "text-base md:text-lg px-6 py-4 md:px-8 md:py-6")}>
                      View All <ArrowRight className="ml-2 md:ml-3 h-4 w-4 md:h-5 md:w-5" />
                    </Link>
                  </div>
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </motion.section>
        )}

        {/* New Arrivals Section */}
        {newArrivals.length > 0 && (
          <motion.section
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
            className="mb-12 md:mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold font-heading mb-8 md:mb-10 text-center flex items-center justify-center gap-2 md:gap-3">
              <Sparkles className="h-7 w-7 md:h-8 md:w-8 text-purple-400" />
              New Arrivals
            </h2>
            <ScrollArea className="w-full whitespace-nowrap pb-4">
              <div className="flex w-max space-x-6 md:space-x-8 p-4">
                {newArrivals.map((product) => (
                  <StorefrontProductCard key={product.id} product={product} shopSlug={shopDetails.slug} className="w-[240px] md:w-[280px] flex-shrink-0" />
                ))}
                {newArrivals.length >= 10 && (
                  <div className="flex-shrink-0 w-[240px] md:w-[280px] flex items-center justify-center">
                    <Link to={`/shop/${shopDetails.slug}/products?sort=newest`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "text-base md:text-lg px-6 py-4 md:px-8 md:py-6")}>
                      View All <ArrowRight className="ml-2 md:ml-3 h-4 w-4 md:h-5 md:w-5" />
                    </Link>
                  </div>
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </motion.section>
        )}

        {/* Recommended Products Section */}
        {recommendedProducts.length > 0 && (
          <motion.section
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
            className="mb-12 md:mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold font-heading mb-8 md:mb-10 text-center flex items-center justify-center gap-2 md:gap-3">
              <Gift className="h-7 w-7 md:h-8 md:w-8 text-rose-400" />
              Recommended For You
            </h2>
            <ScrollArea className="w-full whitespace-nowrap pb-4">
              <div className="flex w-max space-x-6 md:space-x-8 p-4">
                {recommendedProducts.map((product) => (
                  <StorefrontProductCard key={product.id} product={product} shopSlug={shopDetails.slug} className="w-[240px] md:w-[280px] flex-shrink-0" />
                ))}
                {recommendedProducts.length >= 10 && (
                  <div className="flex-shrink-0 w-[240px] md:w-[280px] flex items-center justify-center">
                    <Link to={`/shop/${shopDetails.slug}/products?sort=recommended`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "text-base md:text-lg px-6 py-4 md:px-8 md:py-6")}>
                      View All <ArrowRight className="ml-2 md:ml-3 h-4 w-4 md:h-5 md:w-5" />
                    </Link>
                  </div>
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </motion.section>
        )}

        {/* View All Products Button */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          className="text-center mt-12 md:mt-16"
          ref={productsSectionRef}
        >
          <Link 
            to={`/shop/${shopDetails.slug}/products`} 
            onClick={() => window.scrollTo(0, 0)}
            className={cn(buttonVariants({ size: "lg" }), "text-base md:text-lg px-6 py-4 md:px-8 md:py-6 shadow-xl hover:scale-105 transition-transform")}
          >
            View All Products <ArrowRight className="ml-2 md:ml-3 h-4 w-4 md:h-5 md:w-5" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default StorefrontIndex;