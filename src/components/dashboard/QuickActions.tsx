import { getStorefrontUrl } from "@/lib/storefront";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSync } from "@/hooks/useSync";
import { useIntegration } from "@/contexts/IntegrationContext";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import {
  RefreshCw,
  Archive,
  ShoppingBag,
  Palette,
  ExternalLink,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useShop } from "@/contexts/ShopContext";
import { useTranslation } from "react-i18next";

export const QuickActions = () => {
  const navigate = useNavigate();
  const { isSyncing, startNewSync } = useSync();
  const { runWithIntegrationCheck } = useIntegration();
  const { shopDetails } = useShop();
  const { t } = useTranslation();
  const [isRefreshingImages, setIsRefreshingImages] = useState(false);

  const handleRefreshImages = () => {
    runWithIntegrationCheck(async () => {
      setIsRefreshingImages(true);
      try {
        const { data, error } = await supabase.functions.invoke("refresh-product-media", { body: {} });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const refreshed = data?.refreshed ?? 0;
        const failed = data?.failed ?? 0;
        if (refreshed > 0) {
          showSuccess(failed
            ? t("dashboard.images_refreshed_failed", { defaultValue: "Refreshed {{count}} image(s) ({{failed}} failed).", count: refreshed, failed })
            : t("dashboard.images_refreshed", { defaultValue: "Refreshed {{count}} image(s).", count: refreshed }));
          setTimeout(() => window.location.reload(), 600);
        } else {
          showSuccess(data?.message || t("dashboard.images_up_to_date", "All images are up to date."));
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : t("dashboard.images_refresh_failed", "Failed to refresh images."));
      } finally {
        setIsRefreshingImages(false);
      }
    });
  };

  const handleQuickSync = () => {
    runWithIntegrationCheck(async () => {
      startNewSync("pending");
      try {
        const { data, error } = await supabase.functions.invoke(
          "background-sync",
          { body: { syncType: "quick" } }
        );
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (data?.jobId) startNewSync(data.jobId);
      } catch (err) {
        showError(
          err instanceof Error ? err.message : t("dashboard.quick_sync_failed", "Failed to start quick sync.")
        );
      }
    });
  };

  const storefrontUrl = shopDetails?.slug
    ? getStorefrontUrl(shopDetails.slug, shopDetails.storefront_type)
    : null;

  const actions = [
    {
      icon: (
        <RefreshCw
          className={cn("h-4 w-4 text-info", isSyncing && "animate-spin")}
        />
      ),
      title: isSyncing ? t("dashboard.syncing") : t("dashboard.quick_sync"),
      description: t("dashboard.quick_sync_desc"),
      onClick: handleQuickSync,
      disabled: isSyncing,
    },
    {
      icon: <Archive className="h-4 w-4 text-warning" />,
      title: t("dashboard.restock"),
      description: t("dashboard.restock_desc"),
      onClick: () => navigate("/out-of-stock"),
      disabled: false,
    },
    {
      icon: <ShoppingBag className="h-4 w-4 text-success" />,
      title: t("dashboard.check_orders"),
      description: t("dashboard.check_orders_desc"),
      onClick: () => navigate("/orders"),
      disabled: false,
    },
    {
      icon: <ImageIcon className={cn("h-4 w-4 text-primary", isRefreshingImages && "animate-pulse")} />,
      title: isRefreshingImages ? t("dashboard.refreshing", "Refreshing…") : t("dashboard.fix_images", "Fix Images"),
      description: t("dashboard.fix_images_desc", "Re-upload broken product images"),
      onClick: handleRefreshImages,
      disabled: isRefreshingImages,
    },
    {
      icon: <Palette className="h-4 w-4 text-primary" />,
      title: t("dashboard.customize"),
      description: t("dashboard.customize_desc"),
      onClick: () => navigate("/storefront-studio"),
      disabled: false,
    },
  ];

  return (
    <div className="flex flex-col items-end gap-2">
      {storefrontUrl && (
        <a
          href={storefrontUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t("dashboard.view_storefront")}
        </a>
      )}
      <div className="flex flex-wrap gap-1.5 justify-end">
        {actions.map((action) => (
          <button
            key={action.title}
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium shadow-sm transition-all duration-200",
              "hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent hover:text-accent-foreground hover:shadow-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              action.disabled && "opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-sm"
            )}
          >
            {action.icon}
            {action.title}
          </button>
        ))}
      </div>
    </div>
  );
};
