import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { showError, showSuccess } from "@/utils/toast";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { ShopSettings } from "@/components/settings/ShopSettings";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { User, Store } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

// App appearance is a fixed, standard Vela design — no per-user theme tab.
// (Merchant customisation lives in the Storefront Studio, not here.)
const tabs = [
  { id: "account", labelKey: "settings.account", icon: User },
  { id: "shop", labelKey: "settings.shop", icon: Store },
] as const;

export default function Settings() {
  const { setTitle } = usePageTitle();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "account";
  const { t } = useTranslation();

  useEffect(() => { setTitle(t("nav.settings")); }, [setTitle, t]);

  useEffect(() => {
    const err = searchParams.get("integration_error");
    if (err) { showError(t("settings.integration_failed", { error: err })); searchParams.delete("integration_error"); setSearchParams(searchParams, { replace: true }); }
    const ok = searchParams.get("integration_success");
    if (ok) { showSuccess(t("settings.connected_toast")); searchParams.delete("integration_success"); setSearchParams(searchParams, { replace: true }); }
  }, [searchParams, setSearchParams, t]);

  return (
    <div className="mx-auto w-full max-w-[1800px]">
      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}>
        {/* Tab bar */}
        <TabsList className="w-full grid grid-cols-2 h-12 mb-6" data-tour="settings-tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                aria-label={t(tab.labelKey)}
                className="flex items-center gap-2 data-[state=active]:shadow-sm h-10"
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                <span className="sr-only sm:not-sr-only">{t(tab.labelKey)}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Content */}
        <TabsContent value="account" className="mt-0">
          <AccountSettings />
        </TabsContent>

        <TabsContent value="shop" className="mt-0">
          <ShopSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
