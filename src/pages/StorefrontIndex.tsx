import { useStorefront } from "@/contexts/StorefrontContext";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowRight, Sparkles, Gift, RefreshCw, Crown, Info, Package, Wrench, Mail } from "lucide-react"; // Added Wrench and Mail icons
import { useState, useMemo, useRef, useEffect } from "react";
import { getCategoryColor } from "@/lib/colorUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { curatedImages } from "@/contexts/AppearanceContext";
import { Marquee } from "@/components/ui/marquee";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import * as LucideIcons from 'lucide-react'; // Import all Lucide icons
import { StorefrontAnnouncement } from "@/types/storefront"; // Import new type
import { useDragToScroll } from "@/hooks/use-drag-to-scroll"; // Import useDragToScroll hook

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
  const { shopDetails, products: allProducts, isLoading, error, appearanceSettings, bestSellers, recommendedProducts, marqueeElements, promotions } = useStorefront();
  const productsSectionRef = useRef<HTMLDivElement>(null);

  // Drag-to-scroll refs
  const bestSellersScrollRef = useDragToScroll<HTMLDivElement>();
  const newArrivalsScrollRef = useDragToScroll<HTMLDivElement>();
  const recommendedProductsScrollRef = useDragToScroll<HTMLDivElement>();

  useEffect(() => {
    console.log("StorefrontIndex: Marquee Elements received from context:", marqueeElements); // NEW LOG
  }, [marqueeElements]);

  const newArrivals = useMemo(() => {
    return allProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
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

    if (appearanceSettings?.heroBackgroundMediaUrl) {
      style.backgroundImage = `url(${appearanceSettings.heroBackgroundMediaUrl})`;
      style.backgroundSize = 'cover'; // Always cover for hero background media
      style.backgroundPosition = 'center';
      style.backgroundRepeat = 'no-repeat';
      style.backgroundColor = 'transparent';
    } else {
      // Fallback to primary color if no specific hero background is set
      style.backgroundImage = 'none';
      style.backgroundColor = `hsl(${appearanceSettings?.primary || '220 10% 15%'})`;
    }
    return style;
  }, [appearanceSettings]);

  const blurEnabled = appearanceSettings?.blurEnabled;

  const getIconComponent = (iconName: keyof typeof LucideIcons) => { // Use keyof typeof LucideIcons
    const Icon = LucideIcons[iconName]; // Access directly
    return Icon ? <Icon className="h-5 w-5 md:h-6 md:w-6 text-primary" /> : <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary" />;
  };

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

  // New condition for "under construction"
  if (allProducts.length === 0 && !isLoading && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center text-muted-foreground p-8">
        <Wrench className="h-24 w-24 md:h-32 md:w-32 text-primary mx-auto mb-8 md:mb-10" />
        <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4">Store Under Construction</h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8">
          We're busy curating amazing products for you! Our shop will be available soon.
        </p>
        {shopDetails.contact_email && (
          <Button asChild variant="outline" size="lg" className="text-base md:text-lg">
            <a href={`mailto:${shopDetails.contact_email}`} className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> Contact Us
            </a>
          </Button>
        )}
      </div>
    );
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
            "shadow-lg",
            appearanceSettings?.showHeroBlobAnimation && "hero-blob-background show-blob"
          )}
          style={heroBackgroundStyle}
        >
          {appearanceSettings?.heroBackgroundMediaUrl && appearanceSettings.heroBackgroundMediaType === 'video' && (
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover z-0"
              src={appearanceSettings.heroBackgroundMediaUrl}
            />
          )}
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

        {/* Storefront Announcements */}
        {marqueeElements.length > 0 && (
          <motion.section
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
            className="my-12 md:my-16"
          >
            <Marquee pauseOnHover className="py-3 md:py-4 border-y-2 border-primary/20 bg-primary/10">
              {marqueeElements.map(element => (
                <div key={element.id} className="flex items-center gap-4 md:gap-6 text-base md:text-lg font-semibold text-primary px-4"> {/* Adjusted gap and added horizontal padding */}
                  {getIconComponent(element.icon_name)}
                  <span>{element.message}</span>
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
              <Package className="h-7 w-7 md:h-8 md:w-8 text-primary" />
              Shop by Category
            </h2>
            <motion.div
              variants={sectionVariants}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8"
            >
              {uniqueCategoriesWithCount.map(([category, count]) => {
                const CategoryIcon = getCategoryIcon(category);
                return (
                  <motion.div key={category} variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
                    <Link to={`/shop/${shopDetails.slug}/products?category=${encodeURIComponent(category)}`}>
                      <Card className={cn(
                        "group h-full flex flex-col items-center justify-center p-5 md:p-6 text-center transition-shadow hover:shadow-xl",
                        blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card",
                        "shadow-md"
                      )}>
                        <CategoryIcon className={cn("h-14 w-14 md:h-16 md:w-16 mb-3 md:mb-4 text-primary")} />
                        <h3 className="font-semibold text-base md:text-lg leading-tight mb-1 line-clamp-2">{category}</h3>
                        <Badge
                          variant="outline"
                          className={cn("text-xs bg-primary/10 text-primary border-primary/30")}
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
              <Crown className="h-7 w-7 md:h-8 md:w-8 text-primary" />
              Our Best Sellers
            </h2>
            <ScrollArea className="w-full whitespace-nowrap pb-4">
              <div ref={bestSellersScrollRef} className="flex w-max space-x-6 md:space-x-8 p-4">
                {bestSellers.map((product) => {
                  // --- DEBUGGING BEST SELLERS ---
                  console.log(`Best Seller Product ID: ${product.product_id}`);
                  // --- END DEBUGGING ---
                  return (
                    <StorefrontProductCard 
                      key={product.product_id} 
                      product={{ ...product, id: product.product_id }} // Map product_id to id
                      shopSlug={shopDetails.slug} 
                      className="w-[240px] md:w-[280px] flex-shrink-0" 
                      externalShopDetails={shopDetails}
                      externalAppearanceSettings={appearanceSettings}
                      externalPromotions={promotions}
                    />
                  );
                })}
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
              <Sparkles className="h-7 w-7 md:h-8 md:w-8 text-primary" />
              New Arrivals
            </h2>
            <ScrollArea className="w-full whitespace-nowrap pb-4">
              <div ref={newArrivalsScrollRef} className="flex w-max space-x-6 md:space-x-8 p-4">
                {newArrivals.map((product) => (
                  <StorefrontProductCard 
                    key={product.id} 
                    product={product} 
                    shopSlug={shopDetails.slug} 
                    className="w-[240px] md:w-[280px] flex-shrink-0" 
                    externalShopDetails={shopDetails}
                    externalAppearanceSettings={appearanceSettings}
                    externalPromotions={promotions}
                  />
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
              <Gift className="h-7 w-7 md:h-8 md:w-8 text-primary" />
              Recommended For You
            </h2>
            <ScrollArea className="w-full whitespace-nowrap pb-4">
              <div ref={recommendedProductsScrollRef} className="flex w-max space-x-6 md:space-x-8 p-4">
                {recommendedProducts.map((product) => (
                  <StorefrontProductCard 
                    key={product.id} 
                    product={product} 
                    shopSlug={shopDetails.slug} 
                    className="w-[240px] md:w-[280px] flex-shrink-0" 
                    externalShopDetails={shopDetails}
                    externalAppearanceSettings={appearanceSettings}
                    externalPromotions={promotions}
                  />
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