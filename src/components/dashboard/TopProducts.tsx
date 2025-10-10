import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { Crown } from "lucide-react";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency, formatLargeNumber } from "@/lib/formatters";

interface TopProduct {
  product_id: string;
  name: string;
  media_url: string;
  total_sold: number;
  price: number | null;
  currency: string | null;
}

export const TopProducts = () => {
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { shopDetails, convertCurrency } = useShop();

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

  if (!shopDetails) return <Skeleton className="h-full w-full" />; // Show skeleton if shopDetails not ready

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
                <img src={product.media_url} alt={product.name} className="h-12 w-12 rounded-md object-cover bg-muted" />
                <div className="flex-1">
                  <p className="font-medium truncate">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {/* Convert product.price from its stored currency (product.currency) to shopDetails.currency */}
                    {formatCurrency(convertCurrency(product.price, product.currency, shopDetails.currency), shopDetails.currency)} &middot; {formatLargeNumber(product.total_sold)} sold
                  </p>
                </div>
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