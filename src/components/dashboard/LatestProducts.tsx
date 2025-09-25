import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { useSync } from "@/contexts/SyncContext";
import { useIntegration } from "@/contexts/IntegrationContext";
import { toast } from "sonner";
import { showError } from "@/utils/toast";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";

interface Product {
  id: string;
  name: string;
  media_url: string;
  price: number | null;
}

export const LatestProducts = () => {
  const { shopDetails } = useShop();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isSyncing, startNewSync } = useSync();
  const { runWithIntegrationCheck } = useIntegration();

  useEffect(() => {
    const fetchLatest = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, name, media_url, price')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) {
        console.error("Failed to fetch latest products");
      } else {
        setProducts(data);
      }
      setIsLoading(false);
    };
    fetchLatest();
  }, []);

  const handleQuickSync = () => {
    runWithIntegrationCheck(async () => {
      toast.loading("Initiating quick sync...", { id: 'sync-initiating' });
      try {
        const { data, error } = await supabase.functions.invoke('background-sync', {
          body: { syncType: 'quick' },
        });
        toast.dismiss('sync-initiating');
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        if (data.jobId) {
          await startNewSync(data.jobId);
        }
      } catch (err: any) {
        toast.dismiss('sync-initiating');
        showError(err.message || `Failed to start quick sync.`);
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Latest Products</CardTitle>
        <Button variant="outline" size="sm" onClick={handleQuickSync} disabled={isSyncing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          Quick Sync
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : products.length > 0 ? (
          products.map(product => (
            <div key={product.id} className="flex items-center gap-4">
              <img src={product.media_url} alt={product.name} className="h-12 w-12 rounded-md object-cover bg-muted" />
              <div className="flex-1">
                <p className="font-medium truncate">{product.name}</p>
              </div>
              <p className="font-semibold">{formatCurrency(product.price, shopDetails?.currency)}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No products yet.</p>
        )}
      </CardContent>
    </Card>
  );
};