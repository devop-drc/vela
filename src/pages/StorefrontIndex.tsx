import { useStorefront } from "@/contexts/StorefrontContext";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion"; // Import motion for animations
import { cn } from "@/lib/utils"; // Import cn for conditional class names

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const StorefrontIndex = () => {
  const { shopDetails, products, isLoading, error, appearanceSettings } = useStorefront();

  if (isLoading) {
    return <div className="container py-8">Loading products...</div>; // Skeleton handled by layout
  }

  if (error) {
    return <div className="container py-8 text-destructive">{error}</div>;
  }

  if (!shopDetails) {
    return <div className="container py-8 text-center text-muted-foreground">Shop details not found.</div>;
  }

  const blurEnabled = appearanceSettings?.blurEnabled;

  return (
    <div className="container py-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "mb-12 p-8 md:p-12 rounded-xl text-center",
          blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card",
          "shadow-lg"
        )}
      >
        <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4 leading-tight">
          {shopDetails.headline || `Welcome to ${shopDetails.shop_name}!`}
        </h1>
        {shopDetails.about && (
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            {shopDetails.about}
          </p>
        )}
      </motion.div>

      <h2 className="text-3xl font-bold font-heading mb-8 text-center">Our Products</h2>
      
      {products.length === 0 ? (
        <div className={cn(
          "text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg",
          blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
        )}>
          <h3 className="text-xl font-semibold">No Products Available</h3>
          <p className="text-base mt-2">Check back later for new arrivals!</p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          {products.map((product) => (
            <motion.div key={product.id} variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
              <Link to={`/shop/${shopDetails.slug}/product/${product.id}`}>
                <Card className={cn(
                  "h-full flex flex-col overflow-hidden transition-shadow hover:shadow-xl",
                  blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
                )}>
                  <CardContent className="p-0">
                    <div className="aspect-square w-full overflow-hidden bg-muted">
                      <MediaItem src={product.media_url} alt={product.name} type={product.media_type} className="object-cover transition-transform duration-300 group-hover:scale-105" />
                    </div>
                  </CardContent>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-lg leading-tight mb-1">{product.name}</h3>
                      {product.category && <Badge variant="secondary" className="mb-2">{product.category}</Badge>}
                      <p className="text-sm text-muted-foreground line-clamp-2">{product.caption}</p>
                    </div>
                    <div className="mt-4">
                      <p className="text-xl font-bold text-primary">
                        {formatCurrency(product.price, product.currency || shopDetails.currency)}
                        {product.pricing_type === 'subscription' && (
                          <span className="text-sm font-light text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default StorefrontIndex;