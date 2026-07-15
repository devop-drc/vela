import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";

interface WelcomeHeaderProps {
  pendingOrders: number;
  activeProducts: number;
  totalOrders?: number;
  isLoading?: boolean;
}

export const WelcomeHeader = ({ pendingOrders, activeProducts, totalOrders = 0, isLoading }: WelcomeHeaderProps) => {
  const { t } = useTranslation();
  // Name resolves instantly from the cached session (no getUser round-trip, no
  // extra profiles query) — AuthContext already has the user.
  const { user } = useAuth();
  const firstName = (user?.user_metadata?.first_name as string | undefined) || null;

  const todayLabel = format(new Date(), "EEEE, MMMM d, yyyy");

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
    );
  }

  const activeOrderCount = pendingOrders + totalOrders;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight leading-tight">
        {t("dashboard.welcome")}{firstName ? `, ${firstName}` : ""} 👋
      </h1>
      <p className="text-xs text-muted-foreground mt-0.5">
        {todayLabel}
        {" · "}
        <span className="font-medium text-foreground">{activeOrderCount !== 1 ? t("dashboard.active_orders_plural", { count: activeOrderCount }) : t("dashboard.active_orders", { count: activeOrderCount })}</span>
        {" " + t("dashboard.and") + " "}
        <span className="font-medium text-foreground">{activeProducts !== 1 ? t("dashboard.products_count_plural", { count: activeProducts }) : t("dashboard.products_count", { count: activeProducts })}</span>
      </p>
    </div>
  );
};
