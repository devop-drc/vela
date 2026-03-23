import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

interface WelcomeHeaderProps {
  pendingOrders: number;
  activeProducts: number;
  totalOrders?: number;
  isLoading?: boolean;
}

export const WelcomeHeader = ({ pendingOrders, activeProducts, totalOrders = 0, isLoading }: WelcomeHeaderProps) => {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setProfileLoading(false); return; }
      const { data: profile } = await supabase.from("profiles").select("first_name").eq("id", user.id).single();
      setFirstName(profile?.first_name || user.user_metadata?.first_name || null);
      setProfileLoading(false);
    };
    fetchProfile();
  }, []);

  const todayLabel = format(new Date(), "EEEE, MMMM d, yyyy");

  if (profileLoading || isLoading) {
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
      <h1 className="text-3xl font-bold tracking-tight">
        {t("dashboard.welcome")}{firstName ? `, ${firstName}` : ""} 👋
      </h1>
      <p className="text-muted-foreground mt-1">
        {todayLabel}
        {" · "}
        <span className="font-medium text-foreground">{activeOrderCount !== 1 ? t("dashboard.active_orders_plural", { count: activeOrderCount }) : t("dashboard.active_orders", { count: activeOrderCount })}</span>
        {" " + t("dashboard.and") + " "}
        <span className="font-medium text-foreground">{activeProducts !== 1 ? t("dashboard.products_count_plural", { count: activeProducts }) : t("dashboard.products_count", { count: activeProducts })}</span>
      </p>
    </div>
  );
};
