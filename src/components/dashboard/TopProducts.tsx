import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { ScrollArea } from "../ui/scroll-area";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency, formatLargeNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { ImageOff } from "lucide-react";

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
      <CardHeader className="pb-2 flex-shrink-0">
        <CardDescription className="text-sm">{t("dashboard.best_selling")}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3 flex-1 min-h-0">
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
          <p className="text-sm text-muted-foreground text-center py-6">{t("dashboard.no_sales_data")}</p>
        ) : (
          <ScrollArea className="h-full pr-2">
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
                  <div className="h-11 w-11 flex-shrink-0 rounded-lg overflow-hidden bg-muted border border-border/40 flex items-center justify-center">
                    {product.media_url ? (
                      <img
                        src={product.media_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={(e) => {
                          const img = e.currentTarget;
                          img.style.display = 'none';
                          const parent = img.parentElement;
                          if (parent && !parent.querySelector('[data-fallback]')) {
                            const fb = document.createElement('div');
                            fb.setAttribute('data-fallback', 'true');
                            fb.className = 'h-full w-full flex items-center justify-center text-muted-foreground';
                            fb.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/><line x1="13.5" y1="13.5" x2="6" y2="21"/><line x1="18" y1="12" x2="21" y2="15"/><path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59"/><path d="M21 15V5a2 2 0 0 0-2-2H9"/></svg>';
                            parent.appendChild(fb);
                          }
                        }}
                      />
                    ) : (
                      <ImageOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

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
