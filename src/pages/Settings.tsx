import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showError, showSuccess } from "@/utils/toast";
import { AppearancePanel } from "@/components/settings/AppearancePanel";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { ShopSettings } from "@/components/settings/ShopSettings";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

const Settings = () => {
  const { setTitle } = usePageTitle();
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
      searchParams.delete('integration_success');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="shop">Shop</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
              <AccountSettings />
            </div>
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Billing</CardTitle>
                  <CardDescription>Manage your subscription.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-accent/50">
                    <div><h4 className="font-semibold">Pro Plan</h4><p className="text-sm text-muted-foreground">$25.00 per month</p></div>
                    <Button variant="outline" size="sm">Manage</Button>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Payment Method</h4>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <CreditCard className="h-6 w-6" />
                      <div><p className="font-medium">Visa ending in 1234</p><p className="text-sm text-muted-foreground">Expires 06/2025</p></div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="link" className="p-0 h-auto">View Billing History</Button>
                </CardFooter>
              </Card>
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="destructive" className="w-full">Delete Account</Button>
                  <p className="text-xs text-muted-foreground mt-2">This action is permanent and cannot be undone.</p>
                </CardContent>
              </Card>
            </div>
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