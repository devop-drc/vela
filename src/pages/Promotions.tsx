import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readCache, writeCache } from "@/lib/pageCache";
import { isAnnouncementLiveNow, announcementStatus } from "@/lib/announcementSchedule";
type PromoSnapshot = { promotions: Promotion[]; announcements: StorefrontAnnouncement[] };
import { usePageTitle } from "@/contexts/PageTitleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2, PlusCircle, Percent, Gift, Edit, Trash2, CalendarIcon,
  Sparkles, Megaphone, Repeat2, LayoutGrid, Clock, CheckCircle2,
  XCircle, Tag, Package, Truck, TrendingDown, Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess, toFriendlyError } from "@/utils/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PromotionEditorModal } from "@/components/PromotionEditorModal";
import { StorefrontAnnouncementEditorModal } from "@/components/StorefrontAnnouncementEditorModal";
import { StorefrontAnnouncement } from "@/types/storefront";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { getIcon } from '@/lib/iconLibrary';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Marquee from "react-fast-marquee";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";

interface Promotion {
  id: string;
  name: string;
  type: 'discount' | 'offer';
  value: any;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  target_products: string[] | null;
  repeat_interval: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none' | null;
}

type FilterTab = 'all' | 'active' | 'scheduled' | 'expired';

// ─── helpers ────────────────────────────────────────────────────────────────

const getPromotionStatus = (promo: Promotion): 'active' | 'scheduled' | 'expired' | 'inactive' => {
  const now = new Date();
  if (promo.end_date && isBefore(parseISO(promo.end_date), now)) return 'expired';
  if (promo.start_date && isAfter(parseISO(promo.start_date), now)) return 'scheduled';
  if (promo.is_active) return 'active';
  return 'inactive';
};

const getPromotionDetails = (promotion: Promotion): string => {
  switch (promotion.type) {
    case 'discount':
      if (promotion.value?.discountType === 'percentage') return `${promotion.value.discountValue}% Off`;
      if (promotion.value?.discountType === 'flat') return `$${promotion.value.discountValue} Off`;
      return 'Discount';
    case 'offer':
      if (promotion.value?.offerType === 'free_shipping')
        return `Free Shipping${promotion.value.minOrderValue ? ` (Min $${promotion.value.minOrderValue})` : ''}`;
      return 'Offer';
    default:
      return '';
  }
};

const getTypeLabel = (promotion: Promotion): string => {
  if (promotion.type === 'discount') {
    if (promotion.value?.discountType === 'percentage') return 'Percentage Off';
    if (promotion.value?.discountType === 'flat') return 'Fixed Amount Off';
    return 'Discount';
  }
  if (promotion.type === 'offer') {
    if (promotion.value?.offerType === 'free_shipping') return 'Free Shipping';
    return 'Offer';
  }
  return promotion.type;
};

const getTypeIcon = (promotion: Promotion) => {
  if (promotion.type === 'discount') {
    if (promotion.value?.discountType === 'percentage') return <Percent className="h-4 w-4" />;
    if (promotion.value?.discountType === 'flat') return <TrendingDown className="h-4 w-4" />;
    return <Tag className="h-4 w-4" />;
  }
  if (promotion.type === 'offer') {
    if (promotion.value?.offerType === 'free_shipping') return <Truck className="h-4 w-4" />;
    return <Gift className="h-4 w-4" />;
  }
  return <Tag className="h-4 w-4" />;
};

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  colorClass: string;
}

const StatCard = ({ label, value, icon, colorClass }: StatCardProps) => (
  <Card className="flex-1 min-w-0">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={cn("flex items-center justify-center h-10 w-10 rounded-lg shrink-0", colorClass)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
      </div>
    </CardContent>
  </Card>
);

// ─── Promotion Card ───────────────────────────────────────────────────────────

interface PromotionCardProps {
  promo: Promotion;
  onEdit: (p: Promotion) => void;
  onDelete: (id: string) => void;
  onRerun: (p: Promotion) => void;
  onToggle: (id: string, current: boolean) => void;
}

const PromotionCard = ({ promo, onEdit, onDelete, onRerun, onToggle }: PromotionCardProps) => {
  const { t } = useTranslation();
  const status = getPromotionStatus(promo);
  const details = getPromotionDetails(promo);
  const typeLabel = getTypeLabel(promo);
  const typeIcon = getTypeIcon(promo);

  const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800' },
    scheduled: { label: 'Scheduled', className: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800' },
    expired: { label: 'Expired', className: 'bg-zinc-500/10 text-zinc-500 border-zinc-200 dark:border-zinc-700' },
    inactive: { label: 'Inactive', className: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800' },
  };

  const { label: statusLabel, className: statusClass } = statusConfig[status] ?? statusConfig.inactive;

  const hasDates = promo.start_date || promo.end_date;

  return (
    <Card className={cn(
      "flex flex-col transition-all duration-200 hover:shadow-md",
      status === 'expired' && "opacity-60"
    )}>
      <CardContent className="p-5 flex flex-col gap-4 h-full">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "flex items-center justify-center h-9 w-9 rounded-lg shrink-0",
              promo.type === 'discount'
                ? "bg-violet-500/10 text-violet-600"
                : "bg-cyan-500/10 text-cyan-600"
            )}>
              {typeIcon}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{promo.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn("shrink-0 text-xs", statusClass)}>
            {statusLabel}
          </Badge>
        </div>

        {/* Value pill */}
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
            promo.type === 'discount'
              ? "bg-violet-500/10 text-violet-700 dark:text-violet-400"
              : "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400"
          )}>
            {details}
          </span>
          {promo.target_products && promo.target_products.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="h-3 w-3" />
              {promo.target_products.length} product{promo.target_products.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Date timeline */}
        {hasDates ? (
          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs flex items-center gap-2 text-muted-foreground">
            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
            <span>
              {promo.start_date && promo.end_date
                ? `${format(parseISO(promo.start_date), 'MMM d')} – ${format(parseISO(promo.end_date), 'MMM d, yyyy')}`
                : promo.start_date
                  ? `Starts ${format(parseISO(promo.start_date), 'MMM d, yyyy')}`
                  : `Ends ${format(parseISO(promo.end_date!), 'MMM d, yyyy')}`}
            </span>
            {promo.repeat_interval && promo.repeat_interval !== 'none' && (
              <span className="ml-auto flex items-center gap-1 capitalize">
                <Repeat2 className="h-3 w-3" />
                {promo.repeat_interval}
              </span>
            )}
          </div>
        ) : (
          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs flex items-center gap-2 text-muted-foreground">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span>{t("promotions.always_on")}</span>
          </div>
        )}

        {/* Footer: toggle + actions */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t">
          <div className="flex items-center gap-2">
            <Switch
              checked={promo.is_active}
              onCheckedChange={() => onToggle(promo.id, promo.is_active)}
              aria-label={`Toggle ${promo.name} active status`}
              className="scale-90"
            />
            <span className="text-xs text-muted-foreground">{promo.is_active ? t('promotions.enabled') : t('promotions.disabled')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRerun(promo)} title={t("promotions.duplicate")}>
              <Repeat2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(promo)} title={t("common.edit")}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(promo.id)} title={t("common.delete")}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyPromotions = ({ onCreateClick }: { onCreateClick: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
        <Tag className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{t("promotions.no_promotions")}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        {t("promotions.no_promotions_desc")}
      </p>
      <Button onClick={onCreateClick}>
        <PlusCircle className="mr-2 h-4 w-4" />
        {t("promotions.create_first")}
      </Button>
    </div>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

const Promotions = () => {
  const { setTitle } = usePageTitle();
  const { t } = useTranslation();
  const [promotions, setPromotions] = useState<Promotion[]>(() => readCache<PromoSnapshot>("promotions")?.promotions ?? []);
  const [storefrontAnnouncements, setStorefrontAnnouncements] = useState<StorefrontAnnouncement[]>(() => readCache<PromoSnapshot>("promotions")?.announcements ?? []);
  const [isLoading, setIsLoading] = useState(() => !readCache("promotions"));
  const [isPromotionEditorOpen, setIsPromotionEditorOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [isAnnouncementEditorOpen, setIsAnnouncementEditorOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<StorefrontAnnouncement | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'promotion' | 'announcement' } | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');

  useEffect(() => { setTitle(t("nav.promotions")); }, [setTitle, t]);

  const fetchPromotionsAndAnnouncements = async () => {
    if (!readCache("promotions")) setIsLoading(true); // spinner only when nothing cached
    const [{ data: promotionsData, error: promotionsError }, { data: announcementsData, error: announcementsError }] = await Promise.all([
      supabase.from("promotions").select("*").order("created_at", { ascending: false }),
      supabase.from("marquee_elements").select("*").order("display_order", { ascending: true }),
    ]);

    const promos = (promotionsData as Promotion[]) ?? [];
    const announcements = (announcementsData as StorefrontAnnouncement[]) ?? [];
    if (promotionsError) showError("Could not fetch promotions.");
    else setPromotions(promos);

    if (announcementsError) showError("Could not fetch storefront announcements.");
    else setStorefrontAnnouncements(announcements);

    if (!promotionsError && !announcementsError) writeCache<PromoSnapshot>("promotions", { promotions: promos, announcements });

    setIsLoading(false);
  };

  useEffect(() => { fetchPromotionsAndAnnouncements(); }, []);

  // ── handlers ────────────────────────────────────────────────────────────────

  const handlePromotionSave = () => {
    fetchPromotionsAndAnnouncements();
    setIsPromotionEditorOpen(false);
    setSelectedPromotion(null);
  };

  const handlePromotionEdit = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setIsPromotionEditorOpen(true);
  };

  const handlePromotionDelete = (promotionId: string) => {
    setItemToDelete({ id: promotionId, type: 'promotion' });
    setIsDeleteConfirmOpen(true);
  };

  const handleRerunPromotion = (promotion: Promotion) => {
    setSelectedPromotion({
      ...promotion,
      id: crypto.randomUUID(),
      name: `${promotion.name} (Copy)`,
      is_active: false,
      start_date: null,
      end_date: null,
    });
    setIsPromotionEditorOpen(true);
  };

  const handleTogglePromotionActive = async (promotionId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('promotions')
      .update({ is_active: !currentStatus })
      .eq('id', promotionId);

    if (error) {
      showError(toFriendlyError(error, "Couldn't update the promotion. Please try again."));
    } else {
      showSuccess(`Promotion ${!currentStatus ? 'activated' : 'deactivated'}.`);
      setPromotions(prev => prev.map(p => p.id === promotionId ? { ...p, is_active: !currentStatus } : p));
    }
  };

  const handleAnnouncementSave = () => {
    fetchPromotionsAndAnnouncements();
    setIsAnnouncementEditorOpen(false);
    setSelectedAnnouncement(null);
  };

  const handleAnnouncementEdit = (element: StorefrontAnnouncement) => {
    setSelectedAnnouncement(element);
    setIsAnnouncementEditorOpen(true);
  };

  const handleAnnouncementDelete = (elementId: string) => {
    setItemToDelete({ id: elementId, type: 'announcement' });
    setIsDeleteConfirmOpen(true);
  };

  const handleToggleAnnouncementActive = async (elementId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('marquee_elements')
      .update({ is_active: !currentStatus })
      .eq('id', elementId);

    if (error) {
      showError(toFriendlyError(error, "Couldn't update the announcement. Please try again."));
    } else {
      showSuccess(`Announcement ${!currentStatus ? 'activated' : 'deactivated'}.`);
      setStorefrontAnnouncements(prev => prev.map(e => e.id === elementId ? { ...e, is_active: !currentStatus } : e));
    }
  };

  const getAnnouncementIconComponent = (iconName: string) => {
    const Icon = getIcon(iconName);
    return <Icon className="h-4 w-4" />;
  };

  const confirmDeletion = async () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'promotion') {
      const { error } = await supabase.from("promotions").delete().eq("id", itemToDelete.id);
      if (error) showError(toFriendlyError(error, "Couldn't delete the promotion. Please try again."));
      else { showSuccess("Promotion deleted."); fetchPromotionsAndAnnouncements(); }
    } else {
      const { error } = await supabase.from("marquee_elements").delete().eq("id", itemToDelete.id);
      if (error) showError(toFriendlyError(error, "Couldn't delete the announcement. Please try again."));
      else { showSuccess("Storefront announcement deleted."); fetchPromotionsAndAnnouncements(); }
    }

    setIsDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  // ── derived stats ────────────────────────────────────────────────────────────

  const now = new Date();
  const activeCount = promotions.filter(p => p.is_active && (!p.end_date || isAfter(parseISO(p.end_date), now)) && (!p.start_date || isBefore(parseISO(p.start_date), now))).length;
  const scheduledCount = promotions.filter(p => p.start_date && isAfter(parseISO(p.start_date), now)).length;
  const expiredCount = promotions.filter(p => p.end_date && isBefore(parseISO(p.end_date), now)).length;

  // ── filtered list ─────────────────────────────────────────────────────────────

  const filteredPromotions = promotions.filter(p => {
    const status = getPromotionStatus(p);
    if (filter === 'all') return true;
    if (filter === 'active') return status === 'active';
    if (filter === 'scheduled') return status === 'scheduled';
    if (filter === 'expired') return status === 'expired';
    return true;
  });

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <PromotionEditorModal
        isOpen={isPromotionEditorOpen}
        onClose={() => { setIsPromotionEditorOpen(false); setSelectedPromotion(null); }}
        onSave={handlePromotionSave}
        promotion={selectedPromotion}
      />
      <StorefrontAnnouncementEditorModal
        isOpen={isAnnouncementEditorOpen}
        onClose={() => { setIsAnnouncementEditorOpen(false); setSelectedAnnouncement(null); }}
        onSave={handleAnnouncementSave}
        element={selectedAnnouncement}
      />

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("promotions.delete_confirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("promotions.delete_warning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletion} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("products.yes_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-8">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t("nav.promotions")}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {t("promotions.page_desc")}
            </p>
          </div>
          <Button onClick={() => setIsPromotionEditorOpen(true)} data-tour="promotions-create">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("promotions.create")}
          </Button>
        </div>

        {/* ── Stats bar ── */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label={t("promotions.active_promotions")}
              value={activeCount}
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              colorClass="bg-emerald-500/10"
            />
            <StatCard
              label={t("promotions.scheduled")}
              value={scheduledCount}
              icon={<Clock className="h-5 w-5 text-blue-600" />}
              colorClass="bg-blue-500/10"
            />
            <StatCard
              label={t("promotions.expired")}
              value={expiredCount}
              icon={<XCircle className="h-5 w-5 text-zinc-500" />}
              colorClass="bg-zinc-500/10"
            />
            <StatCard
              label={t("promotions.total_promotions")}
              value={promotions.length}
              icon={<LayoutGrid className="h-5 w-5 text-primary" />}
              colorClass="bg-primary/10"
            />
          </div>
        )}

        {/* ── Promotions section ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">{t("promotions.your_promotions")}</h2>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3">{t("common.all")} ({promotions.length})</TabsTrigger>
                <TabsTrigger value="active" className="text-xs px-3">{t("common.active")} ({activeCount})</TabsTrigger>
                <TabsTrigger value="scheduled" className="text-xs px-3">{t("promotions.scheduled")} ({scheduledCount})</TabsTrigger>
                <TabsTrigger value="expired" className="text-xs px-3">{t("promotions.expired")} ({expiredCount})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
            </div>
          ) : filteredPromotions.length === 0 ? (
            filter === 'all' ? (
              <EmptyPromotions onCreateClick={() => setIsPromotionEditorOpen(true)} />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <Tag className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm">{t("promotions.no_filtered", { filter })}</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-tour="promotions-list">
              {filteredPromotions.map(promo => (
                <PromotionCard
                  key={promo.id}
                  promo={promo}
                  onEdit={handlePromotionEdit}
                  onDelete={handlePromotionDelete}
                  onRerun={handleRerunPromotion}
                  onToggle={handleTogglePromotionActive}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Storefront Announcements section ── */}
        <div className="pt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{t("promotions.announcements")}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("promotions.announcements_desc")}
              </p>
            </div>
            <Button onClick={() => setIsAnnouncementEditorOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t("promotions.add_announcement")}
            </Button>
          </div>

          {/* Preview shows only what customers actually see right now: enabled
              AND within schedule — mirroring the storefront exactly. */}
          {storefrontAnnouncements.some(e => isAnnouncementLiveNow(e as any)) ? (
            <div className="space-y-2">
              <h3 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                <Megaphone className="h-4 w-4" /> {t("promotions.live_preview")}
              </h3>
              <div className="border rounded-lg p-2 bg-muted/50">
                <Marquee pauseOnHover className="py-2 border-y-2 border-primary/20 bg-primary/10">
                  {storefrontAnnouncements.filter(e => isAnnouncementLiveNow(e as any)).map(element => (
                    <div key={element.id} className="flex items-center gap-6 text-base font-semibold text-primary px-8">
                      {getAnnouncementIconComponent(element.icon_name)}
                      <span>{element.message}</span>
                    </div>
                  ))}
                </Marquee>
              </div>
            </div>
          ) : storefrontAnnouncements.some(e => e.is_active) ? (
            // Enabled announcements exist but none is within its schedule right
            // now — explain why the storefront bar is empty.
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
              <Clock className="h-4 w-4 mt-0.5 shrink-0" />
              <span>None of your enabled announcements are within their scheduled dates today, so the storefront bar is hidden. Edit an announcement and clear its dates (or set the repeat to “None”) to show it now.</span>
            </div>
          ) : null}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("promotions.your_announcements")}</CardTitle>
              <CardDescription>
                {t("promotions.your_announcements_desc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">{t("promotions.order_col")}</TableHead>
                      <TableHead className="w-[50px]">{t("promotions.icon")}</TableHead>
                      <TableHead>{t("promotions.message")}</TableHead>
                      <TableHead className="w-[80px] text-center">{t("common.active")}</TableHead>
                      <TableHead className="text-right w-[120px]">{t("promotions.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storefrontAnnouncements.length > 0 ? (
                      storefrontAnnouncements.map((element) => (
                        <TableRow key={element.id}>
                          <TableCell>{element.display_order}</TableCell>
                          <TableCell>{getAnnouncementIconComponent(element.icon_name)}</TableCell>
                          <TableCell className="font-medium max-w-[300px]">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{element.message}</span>
                              {(() => {
                                const st = announcementStatus(element as any);
                                if (st === 'live' || st === 'off') return null;
                                const label = st === 'scheduled'
                                  ? (element.start_date ? `Scheduled from ${format(parseISO(element.start_date), 'MMM d')}` : 'Scheduled')
                                  : `Off schedule${element.end_date ? ` (window ended ${format(parseISO(element.end_date), 'MMM d')})` : ''}`;
                                return (
                                  <Badge variant="outline" className="shrink-0 gap-1 border-amber-300 text-amber-700 dark:border-amber-500/40 dark:text-amber-400">
                                    <Clock className="h-3 w-3" /> {label}
                                  </Badge>
                                );
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={element.is_active}
                              onCheckedChange={() => handleToggleAnnouncementActive(element.id, element.is_active)}
                              aria-label={`Toggle ${element.message} active status`}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleAnnouncementEdit(element)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleAnnouncementDelete(element.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          {t("promotions.no_announcements")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </>
  );
};

export default Promotions;
