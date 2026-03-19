import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useSync } from "@/hooks/useSync";
import { useIntegration } from "@/contexts/IntegrationContext";
import { showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import {
  RefreshCw,
  Archive,
  ShoppingBag,
  Palette,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useShop } from "@/contexts/ShopContext";
import { motion } from "framer-motion";

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
    ? `${window.location.origin}/shop/${shopDetails.slug}`
    : null;

  const actions = [
    {
      icon: (
        <RefreshCw
          className={cn("h-4 w-4 text-blue-600", isSyncing && "animate-spin")}
        />
      ),
      title: isSyncing ? "Syncing…" : "Quick Sync",
      description: "Pull latest products & prices from Instagram",
      onClick: handleQuickSync,
      disabled: isSyncing,
      colorClass: "bg-blue-50 text-blue-600",
    },
    {
      icon: <Archive className="h-4 w-4 text-amber-600" />,
      title: "Restock",
      description: "Review and restock out-of-stock products",
      onClick: () => navigate("/out-of-stock"),
      disabled: false,
      colorClass: "bg-amber-50 text-amber-600",
    },
    {
      icon: <ShoppingBag className="h-4 w-4 text-emerald-600" />,
      title: "Check Orders",
      description: "View and manage pending customer orders",
      onClick: () => navigate("/orders"),
      disabled: false,
      colorClass: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: <Palette className="h-4 w-4 text-violet-600" />,
      title: "Customize",
      description: "Edit your storefront appearance & branding",
      onClick: () => navigate("/settings?tab=appearance"),
      disabled: false,
      colorClass: "bg-violet-50 text-violet-600",
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-semibold">Quick Actions</h2>
        {storefrontUrl && (
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Storefront
          </a>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((action) => (
          <QuickActionCard key={action.title} {...action} />
        ))}
      </div>
    </div>
  );
};
