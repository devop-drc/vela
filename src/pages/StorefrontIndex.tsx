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
import { useMemo, useRef } from "react";
import { getCategoryColor } from "@/lib/colorUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { curatedImages } from "@/contexts/AppearanceContext";
import { Marquee } from "@/components/ui/marquee";
import { getCategoryIcon } from "@/lib/categoryIcons"; // Import category icons

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
  const { shopDetails, products: allProducts, isLoading, error, appearanceSettings, bestSellers, recommendedProducts } = useStorefront();
  const productsSectionRef = useRef<HTMLDivElement>(null);

  const newArrivals = useMemo(() => {
    return allProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);
  }, [allProducts]);

  const uniqueCategoriesWithCount = useMemo(() => {
    const categoriesMap = new Map<string, number>();
    allProducts.forEach(p => {
      const category = p.category || 'Uncategorized';
      categoriesMap.set(category, (categoriesMap.get(category) || 0) + 1);
    });
    return Array.from(categoriesMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allProducts]);

  const heroBackgroundImage = useMemo(() => {
    if (appearanceSettings?.backgroundImageUrl) {
      return appearanceSettings.backgroundImageUrl;
    }
    const randomIndex = Math.floor(Math.random() * curatedImages.length);
    return curatedImages[randomIndex].src;
  }, [appearanceSettings?.backgroundImageUrl]);

  const blurEnabled = appearanceSettings?.blurEnabled; // Correctly destructure blurEnabled here

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
    <div className="flex-1">
      <div className="container py-8">
        {/* Hero Section */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          className={cn(
            "relative mb-16 p-8 md:p-16 rounded-xl text-center overflow-hidden min-h-[450px] flex items-center justify-center",
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
            borderRadius: appearanceSettings?.['--radius'] || '1.5rem', // Apply border-radius
          }}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 text-primary-foreground max-w-4xl mx-auto">
            {shopDetails.logo_url && (
              <motion.div variants={itemVariants}>
                <Avatar className="h-28 w-28 mx-auto mb-6 border-4 border-primary-foreground shadow-md">
                  <AvatarImage src={shopDetails.logo_url} alt={shopDetails.shop_name} />
                  <AvatarFallback className="text-5xl font-bold bg-primary-foreground text-primary">{shopDetails.shop_name?.[0]}</AvatarFallback>
                </Avatar>
              </motion.div>
            )}
            <motion.h1 variants={itemVariants} className="text-5xl md:text-6xl font-bold font-heading mb-4 leading-tight drop-shadow-lg">
              {shopDetails.shop_name}
            </motion.h1>
            {shopDetails.headline && (
              <motion.p variants={itemVariants} className="text-xl md:text-2xl max-w-3xl mx-auto mb-4 drop-shadow-md">
                {shopDetails.headline}
              </motion.p>
            )}
            {shopDetails.about && ( // Add about text here
              <motion.p variants={itemVariants} className="text-base md:text-lg max-w-3xl mx-auto mb-8 drop-shadow-md">
                {shopDetails.about}
              </motion.p>
            )}
            <motion.div variants={itemVariants}>
              <Link to={`/shop/${shopDetails.slug}/products`} className={cn(buttonVariants({ size: "lg" }), "text-lg px-8 py-6 shadow-xl hover:scale-105 transition-transform")}>
                Shop Now <ArrowRight className="ml-3 h-5 w-5" />
              </Link>
            </motion.div>
          </div>
        </motion.section>

        {/* Promotional Marquee */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          className="my-16"
        >
          <Marquee pauseOnHover className="py-4 border-y">
            <div className="flex items-center gap-8 text-lg font-semibold text-primary">
              <Sparkles className="h-6 w-6 text-amber-500" />
              <span>FLASH SALE: Up to 50% OFF on selected items!</span>
              <Gift className="h-6 w-6 text-rose-500" />
              <span>FREE SHIPPING on all orders over {formatCurrency(50, shopDetails.currency)}!</span>
              <RefreshCw className="h-6 w-6 text-blue-500" />
              <span>New Arrivals Every Week!</span>
              <Package className="h-6 w-6 text-emerald-500" />
              <span>Discover unique handcrafted goods!</span>
            </div>
          </Marquee>
        </motion.section>

        {/* Featured Categories */}
        {uniqueCategoriesWithCount.length > 0 && (
          <motion.section
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
            className="mb-16"
          >
            <h2 className="text-4xl font-bold font-heading mb-10 text-center flex items-center justify-center gap-3">
              <Package className="h-8 w-8 text-blue-400" />
              Shop by Category
            </h2>
            <motion.div
              variants={sectionVariants}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
            >
              {uniqueCategoriesWithCount.map(([category, count]) => {
                const CategoryIcon = getCategoryIcon(category);
                const categoryColor = getCategoryColor(category);
                return (
                  <motion.div key={category} variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
                    <Link to={`/shop/${shopDetails.slug}/products?category=${encodeURIComponent(category)}`}>
                      <Card className={cn(
                        "group h-full flex flex-col items-center justify-center p-6 text-center transition-shadow hover:shadow-xl",
                        blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card",
                        "shadow-md"
                      )}>
                        <CategoryIcon className={cn("h-16 w-16 mb-4", categoryColor.text)} />
                        <h3 className="font-semibold text-lg leading-tight mb-1 line-clamp-2">{category}</h3>
                        <Badge
                          variant="outline"
                          className={cn("mb-2", categoryColor.bg, categoryColor.text, categoryColor.border)}
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
            className="mb-16"
          >
            <h2 className="text-4xl font-bold font-heading mb-10 text-center flex items-center justify-center gap-3">
              <Crown className="h-8 w-8 text-amber-400" />
              Our Best Sellers
            </h2>
            <motion.div
              variants={sectionVariants}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
            >
              {bestSellers.map((product) => (
                <StorefrontProductCard key={product.product_id} product={product as Product} shopSlug={shopDetails.slug} />
              ))}
            </motion.div>
          </motion.section>
        )}

        {/* New Arrivals Section */}
        {newArrivals.length > 0 && (
          <motion.section
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
            className="mb-16"
          >
            <h2 className="text-4xl font-bold font-heading mb-10 text-center flex items-center justify-center gap-3">
              <Sparkles className="h-8 w-8 text-purple-400" />
              New Arrivals
            </h2>
            <motion.div
              variants={sectionVariants}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
            >
              {newArrivals.map((product) => (
                <StorefrontProductCard key={product.id} product={product} shopSlug={shopDetails.slug} />
              ))}
            </motion.div>
          </motion.section>
        )}

        {/* Recommended Products Section */}
        {recommendedProducts.length > 0 && (
          <motion.section
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
            className="mb-16"
          >
            <h2 className="text-4xl font-bold font-heading mb-10 text-center flex items-center justify-center gap-3">
              <Gift className="h-8 w-8 text-rose-400" />
              Recommended For You
            </h2>
            <motion.div
              variants={sectionVariants}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
            >
              {recommendedProducts.map((product) => (
                <StorefrontProductCard key={product.id} product={product} shopSlug={shopDetails.slug} />
              ))}
            </motion.div>
          </motion.section>
        )}

        {/* View All Products Button */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          className="text-center mt-16"
          ref={productsSectionRef}
        >
          <Link to={`/shop/${shopDetails.slug}/products`} className={cn(buttonVariants({ size: "lg" }), "text-lg px-8 py-6 shadow-xl hover:scale-105 transition-transform")}>
            View All Products <ArrowRight className="ml-3 h-5 w-5" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default StorefrontIndex;