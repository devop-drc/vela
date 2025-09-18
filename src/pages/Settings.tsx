import { useEffect, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Instagram, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AppearancePanel } from "@/components/settings/AppearancePanel";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { ShopDetailsForm } from "@/components/settings/ShopDetailsForm";
import { usePageTitle } from "@/contexts/PageTitleContext";

const Settings = () => {
  const { setTitle } = usePageTitle();
  const [integrationStatus, setIntegrationStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const defaultTab = location.state?.focus === 'integrations' ? 'integrations' : 'account';

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
        const { data, error } = await supabase
          .from('integrations')
          .select('id')
          .eq('user_id', user.id)
          .eq('provider', 'facebook')
          .maybeSingle();

        if (error) {
          console.error("Error checking integration status:", error);
          setIntegrationStatus('disconnected');
        } else if (data) {
          setIntegrationStatus('connected');
        } else {
          setIntegrationStatus('disconnected');
        }
      } else {
        setIntegrationStatus('disconnected');
      }
    };

    checkIntegration();
  }, []);

  const handleConnectInstagram = async () => {
    const origin = `${window.location.origin}/settings`;
    window.location.href = `https://ixiafbgaqszlokmzjjio.supabase.co/functions/v1/instagram-auth?origin=${encodeURIComponent(origin)}`;
  };

  const handleDisconnectInstagram = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { error } = await supabase
            .from('integrations')
            .delete()
            .eq('user_id', user.id)
            .eq('provider', 'facebook');

        if (error) {
            showError("Failed to disconnect. Please try again.");
            console.error("Error disconnecting:", error);
        } else {
            showSuccess("Successfully disconnected your account.");
            setIntegrationStatus('disconnected');
        }
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="shop">Shop Details</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <AccountSettings />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearancePanel />
        </TabsContent>
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>
                Manage your billing information and view your invoices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Billing details will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Connect your Instagram account to import posts. Note: An Instagram Business or Creator account is required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {integrationStatus === 'loading' && <Skeleton className="h-10 w-48" />}
              {integrationStatus === 'disconnected' && (
                <Button onClick={handleConnectInstagram}>
                  <Instagram className="mr-2 h-4 w-4" />
                  Connect with Facebook
                </Button>
              )}
              {integrationStatus === 'connected' && (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    <span className="font-medium">Connected to Facebook</span>
                  </div>
                  <Button variant="destructive" onClick={handleDisconnectInstagram}>
                    Disconnect
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="shop">
          <ShopDetailsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;