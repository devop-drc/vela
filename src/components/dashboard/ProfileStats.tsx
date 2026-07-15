import { useShop } from "@/contexts/ShopContext";
import { useAuth } from "@/contexts/AuthContext";
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
  tintClass?: string;
  iconColor?: string;
}

const StatPill = ({ icon, label, value, tintClass = 'bg-muted', iconColor = 'text-muted-foreground' }: StatPillProps) => (
  <div className={cn('flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 min-w-[60px]', tintClass)}>
    <div className={iconColor}>{icon}</div>
    <span className="text-sm font-bold tabular-nums leading-none">{value}</span>
    <span className="text-[10px] text-muted-foreground leading-none mt-0.5">{label}</span>
  </div>
);

export const ProfileStats = () => {
  const { t } = useTranslation();
  const { shopDetails, isLoading, fetchShopDetails } = useShop();
  // Name comes instantly from the cached session — no separate profiles read.
  const { user } = useAuth();
  const [productCount, setProductCount] = useState<number | null>(null);
  const userMeta = user?.user_metadata as { first_name?: string; last_name?: string } | undefined;
  const fallbackName = [userMeta?.first_name, userMeta?.last_name].filter(Boolean).join(' ').trim();

  useEffect(() => {
    if (!shopDetails?.userId) return;
    const userId = shopDetails.userId;
    const fetchProductCount = async () => {
      const countRes = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      setProductCount(countRes.count ?? null);
    };
    fetchProductCount();
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
            ) : fallbackName && (
              <p className="text-xs text-muted-foreground truncate">
                {fallbackName}
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
            tintClass="bg-info/10 flex-1"
            iconColor="text-info"
          />
          <StatPill
            icon={<ImageIcon className="h-3 w-3" />}
            label={t("dashboard.posts")}
            value={posts}
            tintClass="bg-primary/10 flex-1"
            iconColor="text-primary"
          />
          <StatPill
            icon={<Package className="h-3 w-3" />}
            label={t("nav.products")}
            value={products}
            tintClass="bg-success/10 flex-1"
            iconColor="text-success"
          />
        </div>
      </CardContent>
    </Card>
  );
};
