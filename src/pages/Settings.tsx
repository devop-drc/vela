import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Instagram, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";

const Settings = () => {
  const [integrationStatus, setIntegrationStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');

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
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const jwt = session.access_token;
      const origin = window.location.origin;
      window.location.href = `https://ixiafbgaqszlokmzjjio.supabase.co/functions/v1/instagram-auth?jwt=${jwt}&origin=${encodeURIComponent(origin)}`;
    } else {
      showError("You must be logged in to connect your Instagram account.");
    }
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
      <h1 className="text-3xl font-bold">Settings</h1>
      <Tabs defaultValue="account" className="w-full">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="shop">Shop Details</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Manage your account settings and set your e-mail preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" defaultValue="Shadcn" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="shadcn@example.com" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Shop Details</CardTitle>
              <CardDescription>
                Manage your shop's public information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Shop settings will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;