import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { ScrollArea } from "../ui/scroll-area";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency, formatLargeNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { ImageOff, Package } from "lucide-react";
import { EmptyState } from "@/components/ui-app";

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

// Token-based rank badges (dark-safe). #1 reads as a subtle "gold" via the
// warning tone; the rest stay neutral. Only the badge is tinted — rows stay
// clean instead of the whole list carrying colour.
const RANK_CONFIG = [
  { label: '#1', badge: 'bg-warning/10 text-warning ring-warning/20' },
  { label: '#2', badge: 'bg-muted text-muted-foreground ring-border' },
  { label: '#3', badge: 'bg-muted text-muted-foreground ring-border' },
];

// Product thumbnail that falls back to the ImageOff icon on load error —
// React-driven, no imperative innerHTML/createElement.
const ProductThumb = ({ src, alt }: { src: string | null | undefined; alt: string }) => {
  const [errored, setErrored] = useState(false);
  return (
    <div className="h-11 w-11 flex-shrink-0 rounded-lg overflow-hidden bg-muted border border-border/40 flex items-center justify-center">
      {src && !errored ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setErrored(true)}
        />
      ) : (
        <ImageOff className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
};

export const TopProducts = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { shopDetails, convertCurrency } = useShop();

  useEffect(() => {
    if (!shopDetails?.id) return;
    const businessId = shopDetails.id;
    const fetchTopProducts = async () => {
      setIsLoading(true);

      const { data, error } = await supabase.rpc('get_top_products', { p_business_id: businessId });

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
  }, [shopDetails?.id]);

  if (!shopDetails) return <Skeleton className="h-full w-full" />;

  return (
    <Card className="shadow-sm border border-border/60 h-full flex flex-col">
      <CardContent className="pt-3 px-3 pb-3 flex-1 min-h-0">
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
          <EmptyState compact icon={Package} title={t("dashboard.no_sales_data")} />
        ) : (
          <ScrollArea className="h-full pr-2">
          <ol className="space-y-2">
            {products.map((product, index) => {
              const rank = RANK_CONFIG[index] ?? {
                label: `#${index + 1}`,
                badge: 'bg-muted text-muted-foreground ring-border',
              };

              const revenueDisplay = formatCurrency(
                convertCurrency(product.total_revenue, product.currency, shopDetails.currency),
                shopDetails.currency
              );

              return (
                <li
                  key={product.product_id}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  {/* Rank badge (only the badge is tinted) */}
                  <span className={cn('grid h-7 w-7 flex-shrink-0 place-items-center rounded-md text-xs font-bold tabular-nums ring-1 ring-inset', rank.badge)}>
                    {rank.label}
                  </span>

                  {/* Thumbnail */}
                  <ProductThumb src={product.media_url} alt={product.name} />

                  {/* Name + category */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {product.category ?? t("dashboard.uncategorized")}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    <p className="text-sm font-semibold tabular-nums">{revenueDisplay}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatLargeNumber(product.total_sold)} {t("dashboard.sold")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
