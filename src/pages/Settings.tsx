import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { showError, showSuccess } from "@/utils/toast";
import { AppearancePanel } from "@/components/settings/AppearancePanel";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { ShopSettings } from "@/components/settings/ShopSettings";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { cn } from "@/lib/utils";
import { User, Store, Palette } from "lucide-react";

const tabs = [
  { id: "account", label: "Account", icon: User, description: "Profile & integrations" },
  { id: "shop", label: "Shop", icon: Store, description: "Store details & branding" },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Themes, fonts & layout" },
];

const Settings = () => {
  const { setTitle } = usePageTitle();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "account";

  useEffect(() => {
    setTitle("Settings");
  }, [setTitle]);

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

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  const activeTabMeta = tabs.find((t) => t.id === activeTab);

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start min-h-full">
      {/* Sidebar nav */}
      <nav className="w-full lg:w-56 flex-shrink-0">
        <div className="rounded-xl border bg-card p-2 space-y-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <div className="min-w-0">
                  <p className={cn("text-sm font-medium leading-none", isActive ? "text-primary-foreground" : "text-foreground")}>
                    {tab.label}
                  </p>
                  <p className={cn("text-xs mt-0.5 truncate", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {tab.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">{activeTabMeta?.label}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{activeTabMeta?.description}</p>
        </div>

        {activeTab === "account" && <AccountSettings />}
        {activeTab === "shop" && <ShopSettings />}
        {activeTab === "appearance" && <AppearancePanel />}
      </div>
    </div>
  );
};

export default Settings;
