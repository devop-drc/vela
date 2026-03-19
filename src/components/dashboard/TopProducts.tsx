import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency, formatLargeNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface TopProduct {
  product_id: string;
  name: string;
  media_url: string;
  total_sold: number;
  total_revenue: number;
  price: number | null;
  currency: string | null;
  category?: string | null;
}

const RANK_CONFIG = [
  { label: '#1', bg: 'bg-amber-400/15', text: 'text-amber-500', border: 'border-amber-400/40', dot: 'bg-amber-400' },
  { label: '#2', bg: 'bg-slate-400/10', text: 'text-slate-500', border: 'border-slate-400/30', dot: 'bg-slate-400' },
  { label: '#3', bg: 'bg-orange-400/10', text: 'text-orange-500', border: 'border-orange-400/30', dot: 'bg-orange-400' },
];

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
        setIsLoading(false);
        return;
      }

      // Filter: only products with more than 1 unit sold, already ordered by total_sold DESC from RPC
      const qualified = (data as TopProduct[]).filter(p => p.total_sold > 1);

      if (qualified.length === 0) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      // Fetch actual revenue (sum of quantity × price_at_purchase) from order_items
      const productIds = qualified.map(p => p.product_id);
      const { data: salesSummary } = await supabase.rpc('get_products_sales_summary', {
        p_product_ids: productIds,
      });

      const revenueMap: Record<string, number> = {};
      if (salesSummary) {
        for (const row of salesSummary as { product_id: string; total_earned: number; total_sold: number }[]) {
          revenueMap[row.product_id] = row.total_earned;
        }
      }

      const enriched: TopProduct[] = qualified.map(p => ({
        ...p,
        total_revenue: revenueMap[p.product_id] ?? (p.price ?? 0) * p.total_sold,
      }));

      setProducts(enriched);
      setIsLoading(false);
    };
    fetchTopProducts();
  }, []);

  if (!shopDetails) return <Skeleton className="h-full w-full" />;

  return (
    <Card className="shadow-sm border border-border/60">
      <CardHeader className="pb-3">
        <CardDescription className="text-sm">Best-selling products by units sold.</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No sales data yet.</p>
        ) : (
          <ol className="space-y-2">
            {products.map((product, index) => {
              const rank = RANK_CONFIG[index] ?? {
                label: `#${index + 1}`,
                bg: 'bg-muted/50',
                text: 'text-muted-foreground',
                border: 'border-border/40',
                dot: 'bg-muted-foreground',
              };

              const revenueDisplay = formatCurrency(
                convertCurrency(product.total_revenue, product.currency, shopDetails.currency),
                shopDetails.currency
              );

              return (
                <li
                  key={product.product_id}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                    rank.bg,
                    rank.border
                  )}
                >
                  {/* Rank badge */}
                  <span className={cn('w-7 text-center text-xs font-bold tabular-nums flex-shrink-0', rank.text)}>
                    {rank.label}
                  </span>

                  {/* Thumbnail */}
                  <div className="h-11 w-11 flex-shrink-0 rounded-lg overflow-hidden bg-muted border border-border/40">
                    {product.media_url ? (
                      <img
                        src={product.media_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                        —
                      </div>
                    )}
                  </div>

                  {/* Name + category */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {product.category ?? 'Uncategorized'}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    <p className="text-sm font-semibold tabular-nums">{revenueDisplay}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatLargeNumber(product.total_sold)} sold
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};
