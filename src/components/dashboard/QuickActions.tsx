import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Archive, ShoppingBag, Palette, TestTube2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSync } from "@/contexts/SyncContext";
import { useIntegration } from "@/contexts/IntegrationContext";
import { toast } from "sonner";
import { showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export const QuickActions = () => {
  const navigate = useNavigate();
  const { isSyncing, startNewSync } = useSync();
  const { runWithIntegrationCheck } = useIntegration();
  const [isSeeding, setIsSeeding] = useState(false);

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

  const handleSeedData = async () => {
    setIsSeeding(true);
    const toastId = toast.loading("Generating mock sales data...");
    try {
      const { data, error } = await supabase.functions.invoke('seed-mock-data');
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      toast.success(data.message || "Mock data generated successfully! Refreshing...", { id: toastId });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate mock data.", { id: toastId });
      setIsSeeding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
        <Button variant="outline" onClick={handleSeedData} disabled={isSeeding} className="hover:border-rose-400 hover:bg-rose-50">
          <TestTube2 className={`mr-2 h-4 w-4 ${isSeeding ? 'animate-spin' : ''}`} />
          Add Mock Data
        </Button>
      </CardContent>
    </Card>
  );
};