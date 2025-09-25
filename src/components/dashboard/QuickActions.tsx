import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Archive, ShoppingBag, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSync } from "@/contexts/SyncContext";
import { useIntegration } from "@/contexts/IntegrationContext";
import { toast } from "sonner";
import { showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

export const QuickActions = () => {
  const navigate = useNavigate();
  const { isSyncing, startNewSync } = useSync();
  const { runWithIntegrationCheck } = useIntegration();

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
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Button variant="outline" onClick={handleQuickSync} disabled={isSyncing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          Quick Sync
        </Button>
        <Button variant="outline" onClick={() => navigate('/out-of-stock')}>
          <Archive className="mr-2 h-4 w-4" />
          Restock
        </Button>
        <Button variant="outline" onClick={() => navigate('/orders')}>
          <ShoppingBag className="mr-2 h-4 w-4" />
          Check Orders
        </Button>
        <Button variant="outline" onClick={() => navigate('/settings')}>
          <Palette className="mr-2 h-4 w-4" />
          Customize
        </Button>
      </CardContent>
    </Card>
  );
};