import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface WelcomeHeaderProps {
  pendingOrders: number;
  activeProducts: number;
  isLoading?: boolean;
}

export const WelcomeHeader = ({ pendingOrders, activeProducts, isLoading }: WelcomeHeaderProps) => {
  const [firstName, setFirstName] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setProfileLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();

      setFirstName(profile?.first_name || user.user_metadata?.first_name || null);
      setProfileLoading(false);
    };
    fetchProfile();
  }, []);

  const todayLabel = format(new Date(), "EEEE, MMMM d, yyyy");

  if (profileLoading || isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Welcome back{firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        {todayLabel}
        {" · "}
        <span>
          {pendingOrders === 0
            ? "No pending orders"
            : pendingOrders === 1
            ? "1 pending order"
            : `${pendingOrders} pending orders`}
        </span>
        {" and "}
        <span>
          {activeProducts === 1
            ? "1 active product"
            : `${activeProducts} active products`}
        </span>
      </p>
    </div>
  );
};
