import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { Crown } from "lucide-react";
import { StorefrontProductCard } from "../storefront/StorefrontProductCard";
import { useShop } from "@/contexts/ShopContext";

interface TopProduct {
  product_id: string;
  name: string;
  media_url: string;
  total_sold: number;
  price: number | null;
  currency: string | null;
  media_type: string | null;
  thumbnail_url?: string;
  caption: string;
  category: string;
  tags: string[];
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  details: any;
  status: 'Active' | 'Draft' | 'Out of Stock';
  inventory: number;
}

export const TopProducts = () => {
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { shopDetails } = useShop();

  useEffect(() => {
    const fetchTopProducts = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: business } = await supabase.from('businesses').select('id').eq('user_id', user.id).single();
      if (!business) { setIsLoading(false); return; }

      const { data, error } = await supabase.rpc('get_top_products', { p_business_id: business.id });
      
      if (error) {
        console.error("Failed to fetch top products:", error);
      } else {
        setProducts(data);
      }
      setIsLoading(false);
    };
    fetchTopProducts();
  }, []);

  if (!shopDetails) return null; // Ensure shopDetails are loaded for slug

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Sellers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {products.map((product, index) => (
              <div key={product.product_id} className="flex items-center gap-4">
                {index === 0 && <Crown className="h-6 w-6 text-amber-400" />}
                {index === 1 && <div className="h-6 w-6 text-slate-400 font-bold text-center">2</div>}
                {index === 2 && <div className="h-6 w-6 text-orange-400 font-bold text-center">3</div>}
                <StorefrontProductCard 
                  product={{
                    id: product.product_id,
                    name: product.name,
                    media_url: product.media_url,
                    price: product.price,
                    currency: product.currency,
                    media_type: product.media_type,
                    thumbnail_url: product.thumbnail_url,
                    caption: product.caption,
                    category: product.category,
                    tags: product.tags,
                    pricing_type: product.pricing_type,
                    billing_interval: product.billing_interval,
                    details: product.details,
                    status: product.status,
                    inventory: product.inventory,
                  }}
                  shopSlug={shopDetails.slug}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No sales data yet.</p>
        )}
      </CardContent>
    </Card>
  );
};