import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Archive, ShoppingBag, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSync } from "@/hooks/useSync";
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
      } catch (err) {
        toast.dismiss('sync-initiating');
        const errorMessage = err instanceof Error ? err.message : 'Failed to start quick sync.';
        showError(errorMessage);
      }
    });
  };

  // Removed: Add Mock Data quick action

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Button variant="outline" onClick={handleQuickSync} disabled={isSyncing} className="hover:border-blue-400 hover:bg-blue-50">
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          Quick Sync
        </Button>
        <Button variant="outline" onClick={() => navigate('/out-of-stock')} className="hover:border-amber-400 hover:bg-amber-50">
          <Archive className="mr-2 h-4 w-4" />
          Restock
        </Button>
        <Button variant="outline" onClick={() => navigate('/orders')} className="hover:border-emerald-400 hover:bg-emerald-50">
          <ShoppingBag className="mr-2 h-4 w-4" />
          Check Orders
        </Button>
        <Button variant="outline" onClick={() => navigate('/settings?tab=appearance')} className="hover:border-purple-400 hover:bg-purple-50">
          <Palette className="mr-2 h-4 w-4" />
          Customize
        </Button>
      </CardContent>
    </Card>
  );
};