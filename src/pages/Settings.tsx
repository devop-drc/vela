import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { showError, showSuccess } from "@/utils/toast";
import { AppearancePanel } from "@/components/settings/AppearancePanel";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { ShopSettings } from "@/components/settings/ShopSettings";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { User, Store, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Settings = () => {
  const { setTitle } = usePageTitle();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => { setTitle("Settings"); }, [setTitle]);

  useEffect(() => {
    const integrationError = searchParams.get("integration_error");
    if (integrationError) {
      showError(`Integration failed: ${integrationError}`);
      searchParams.delete("integration_error");
      setSearchParams(searchParams, { replace: true });
    }
    const integrationSuccess = searchParams.get("integration_success");
    if (integrationSuccess) {
      showSuccess("Successfully connected your Instagram account!");
      searchParams.delete("integration_success");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="space-y-6">
      {/* Top row: Account + Shop side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Account Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Account</CardTitle>
                <CardDescription className="text-xs">Profile, integrations & preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AccountSettings />
          </CardContent>
        </Card>

        {/* Shop Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <Store className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Shop</CardTitle>
                <CardDescription className="text-xs">Store details, currency & contact</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ShopSettings />
          </CardContent>
        </Card>
      </div>

      {/* Appearance — full width below */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-violet-500/10 flex items-center justify-center">
              <Palette className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription className="text-xs">Themes, fonts, colors & layout customization</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AppearancePanel />
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
