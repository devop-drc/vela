import { useShop } from "@/contexts/ShopContext";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, Image as ImageIcon, Package, Instagram } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface StatPillProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  colorClass?: string;
}

const StatPill = ({ icon, label, value, colorClass = 'bg-muted' }: StatPillProps) => (
  <div className={cn('flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 min-w-[60px]', colorClass)}>
    <div className="text-muted-foreground">{icon}</div>
    <span className="text-sm font-bold tabular-nums leading-none">{value}</span>
    <span className="text-[10px] text-muted-foreground leading-none mt-0.5">{label}</span>
  </div>
);

export const ProfileStats = () => {
  const { t } = useTranslation();
  const { shopDetails, isLoading, fetchShopDetails } = useShop();
  const [productCount, setProductCount] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (!shopDetails?.userId) return;
    const userId = shopDetails.userId;
    const fetchProductCountAndProfile = async () => {
      const [countRes, profileRes] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('profiles').select('first_name, last_name').eq('id', userId).single(),
      ]);

      setProductCount(countRes.count ?? null);
      if (!profileRes.error) setUserProfile(profileRes.data);
    };
    fetchProductCountAndProfile();
  }, [shopDetails?.userId]);

  if (isLoading) {
    return <Skeleton className="h-28 w-full rounded-xl" />;
  }

  const followers = shopDetails?.followers_count != null
    ? shopDetails.followers_count >= 1000
      ? `${(shopDetails.followers_count / 1000).toFixed(1)}k`
      : String(shopDetails.followers_count)
    : 'N/A';

  const posts = shopDetails?.media_count?.toLocaleString() ?? 'N/A';
  const products = productCount?.toLocaleString() ?? 'N/A';

  return (
    <Card className="shadow-sm border border-border/60">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <Avatar className="h-11 w-11 ring-2 ring-border">
              <AvatarImage src={shopDetails?.logo_url} referrerPolicy="no-referrer" />
              <AvatarFallback className="text-base font-bold">
                {shopDetails?.shop_name?.[0] ?? '?'}
              </AvatarFallback>
            </Avatar>
            {/* Instagram badge */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 ring-2 ring-background">
              <Instagram className="h-2 w-2 text-white" />
            </span>
          </div>

          {/* Name + username */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{shopDetails?.shop_name ?? '—'}</p>
            {shopDetails?.instagram_url ? (
              <a
                href={shopDetails.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline truncate block"
              >
                @{shopDetails.username}
              </a>
            ) : userProfile && (
              <p className="text-xs text-muted-foreground truncate">
                {userProfile.first_name} {userProfile.last_name}
              </p>
            )}
          </div>

          {/* Refresh */}
          <Button variant="ghost" size="icon" className="flex-shrink-0 h-7 w-7" onClick={fetchShopDetails}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Stat pills */}
        <div className="flex gap-1.5 mt-2.5 justify-between">
          <StatPill
            icon={<Users className="h-3 w-3" />}
            label={t("dashboard.followers")}
            value={followers}
            colorClass="bg-blue-500/8 flex-1"
          />
          <StatPill
            icon={<ImageIcon className="h-3 w-3" />}
            label={t("dashboard.posts")}
            value={posts}
            colorClass="bg-violet-500/8 flex-1"
          />
          <StatPill
            icon={<Package className="h-3 w-3" />}
            label={t("nav.products")}
            value={products}
            colorClass="bg-emerald-500/8 flex-1"
          />
        </div>
      </CardContent>
    </Card>
  );
};
