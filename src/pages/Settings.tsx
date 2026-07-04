import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { showError, showSuccess } from "@/utils/toast";
import { StorefrontStudio } from "@/components/settings/studio/StorefrontStudio";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { ShopSettings } from "@/components/settings/ShopSettings";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { User, Store, Palette } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const tabs = [
  { id: "account", labelKey: "settings.account", icon: User, color: "text-blue-600" },
  { id: "shop", labelKey: "settings.shop", icon: Store, color: "text-emerald-600" },
  { id: "appearance", labelKey: "settings.appearance", icon: Palette, color: "text-violet-600" },
] as const;

export default function Settings() {
  const { setTitle } = usePageTitle();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "account";
  const { t } = useTranslation();

  useEffect(() => { setTitle(t("nav.settings")); }, [setTitle, t]);

  useEffect(() => {
    const err = searchParams.get("integration_error");
    if (err) { showError(`Integration failed: ${err}`); searchParams.delete("integration_error"); setSearchParams(searchParams, { replace: true }); }
    const ok = searchParams.get("integration_success");
    if (ok) { showSuccess("Instagram connected!"); searchParams.delete("integration_success"); setSearchParams(searchParams, { replace: true }); }
  }, [searchParams, setSearchParams]);

  return (
    <div className="mx-auto w-full max-w-[1800px]">
      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}>
        {/* Tab bar */}
        <TabsList className="w-full grid grid-cols-3 h-12 mb-6" data-tour="settings-tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 data-[state=active]:shadow-sm h-10"
              >
                <Icon className={cn("h-4 w-4", isActive ? tab.color : "text-muted-foreground")} />
                <span className="hidden sm:inline">{t(tab.labelKey)}</span>
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

        <TabsContent value="appearance" className="mt-0">
          <StorefrontStudio />
        </TabsContent>
      </Tabs>
    </div>
  );
}
