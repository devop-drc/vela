import { getStorefrontUrl } from "@/lib/storefront";
import { ReactNode, useState } from "react";
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
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface QuickActionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  colorClass: string;
}

const QuickActionCard = ({
  icon,
  title,
  description,
  onClick,
  disabled,
  colorClass,
}: QuickActionCardProps) => (
  <motion.button
    whileHover={{ y: -3, transition: { duration: 0.15 } }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-full text-left rounded-xl border bg-card p-4 shadow-sm transition-colors",
      "hover:border-primary/40 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      disabled && "opacity-60 cursor-not-allowed pointer-events-none"
    )}
  >
    <div
      className={cn(
        "mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg",
        colorClass
      )}
    >
      {icon}
    </div>
    <p className="font-semibold text-sm">{title}</p>
    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
      {description}
    </p>
  </motion.button>
);

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
          showSuccess(`Refreshed ${refreshed} image${refreshed === 1 ? "" : "s"}${failed ? ` (${failed} failed)` : ""}.`);
          setTimeout(() => window.location.reload(), 600);
        } else {
          showSuccess(data?.message || "All images are up to date.");
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : "Failed to refresh images.");
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
          err instanceof Error ? err.message : "Failed to start quick sync."
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
          className={cn("h-4 w-4 text-blue-600", isSyncing && "animate-spin")}
        />
      ),
      title: isSyncing ? t("dashboard.syncing") : t("dashboard.quick_sync"),
      description: t("dashboard.quick_sync_desc"),
      onClick: handleQuickSync,
      disabled: isSyncing,
      colorClass: "bg-blue-50 text-blue-600",
    },
    {
      icon: <Archive className="h-4 w-4 text-amber-600" />,
      title: t("dashboard.restock"),
      description: t("dashboard.restock_desc"),
      onClick: () => navigate("/out-of-stock"),
      disabled: false,
      colorClass: "bg-amber-50 text-amber-600",
    },
    {
      icon: <ShoppingBag className="h-4 w-4 text-emerald-600" />,
      title: t("dashboard.check_orders"),
      description: t("dashboard.check_orders_desc"),
      onClick: () => navigate("/orders"),
      disabled: false,
      colorClass: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: <ImageIcon className={cn("h-4 w-4 text-pink-600", isRefreshingImages && "animate-pulse")} />,
      title: isRefreshingImages ? "Refreshing…" : "Fix Images",
      description: "Re-upload broken product images",
      onClick: handleRefreshImages,
      disabled: isRefreshingImages,
      colorClass: "bg-pink-50 text-pink-600",
    },
    {
      icon: <Palette className="h-4 w-4 text-violet-600" />,
      title: t("dashboard.customize"),
      description: t("dashboard.customize_desc"),
      onClick: () => navigate("/settings?tab=appearance"),
      disabled: false,
      colorClass: "bg-violet-50 text-violet-600",
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
              "inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium transition-colors shadow-sm",
              "hover:bg-accent hover:text-accent-foreground",
              action.disabled && "opacity-50 cursor-not-allowed"
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
