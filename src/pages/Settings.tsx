import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Instagram, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AppearancePanel } from "@/components/settings/AppearancePanel";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { ShopSettings } from "@/components/settings/ShopSettings";
import { usePageTitle } from "@/contexts/PageTitleContext";

const Settings = () => {
  const { setTitle } = usePageTitle();
  const [integrationStatus, setIntegrationStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    setTitle("Settings");
  }, [setTitle]);

  useEffect(() => {
    const integrationError = searchParams.get('integration_error');
    if (integrationError) {
      showError(`Integration failed: ${integrationError}`);
      searchParams.delete('integration_error');
      setSearchParams(searchParams, { replace: true });
    }
    const integrationSuccess = searchParams.get('integration_success');
    if (integrationSuccess) {
      showSuccess("Successfully connected your Instagram account!");
      setIntegrationStatus('connected');
      searchParams.delete('integration_success');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const checkIntegration = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('integrations').select('id').eq('user_id', user.id).eq('provider', 'facebook').maybeSingle();
        setIntegrationStatus(data ? 'connected' : 'disconnected');
      } else {
        setIntegrationStatus('disconnected');
      }
    };
    checkIntegration();
  }, []);

  const handleConnectInstagram = () => {
    const origin = `${window.location.origin}/settings`;
    window.location.href = `https://ixiafbgaqszlokmzjjio.supabase.co/functions/v1/instagram-auth?origin=${encodeURIComponent(origin)}`;
  };

  const handleDisconnectInstagram = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('integrations').delete().eq('user_id', user.id).eq('provider', 'facebook');
      if (error) { showError("Failed to disconnect."); } 
      else { showSuccess("Successfully disconnected."); setIntegrationStatus('disconnected'); }
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="shop">Shop</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <div className="space-y-4">
            <AccountSettings />
            <Card>
              <CardHeader><CardTitle>Integrations</CardTitle><CardDescription>Connect your Instagram account to import posts.</CardDescription></CardHeader>
              <CardContent>
                {integrationStatus === 'loading' && <Skeleton className="h-10 w-48" />}
                {integrationStatus === 'disconnected' && <Button onClick={handleConnectInstagram}><Instagram className="mr-2 h-4 w-4" />Connect with Facebook</Button>}
                {integrationStatus === 'connected' && (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-green-600"><CheckCircle className="mr-2 h-5 w-5" /><span className="font-medium">Connected to Facebook</span></div>
                    <Button variant="destructive" onClick={handleDisconnectInstagram}>Disconnect</Button>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Billing</CardTitle><CardDescription>Manage your billing information and view your invoices.</CardDescription></CardHeader>
              <CardContent><p className="text-muted-foreground">Billing details will be displayed here.</p></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="shop">
          <ShopSettings />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearancePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;