import { getStorefrontUrl } from "@/lib/storefront";
import { useEffect, useRef, useState } from "react";
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

  // Auto-scrolling marquee for the chip row: it drifts back and forth so it's
  // obvious the row scrolls, using a raised-cosine oscillation
  // (scrollLeft = max·(1−cos(t·π))/2) whose velocity is 0 at both ends — it
  // eases into each turn instead of snapping. Only runs when the row actually
  // overflows (i.e. on phones; the desktop row wraps and stays still), pauses
  // while the user is interacting, and is disabled under reduced-motion.
  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let start = 0;
    let phase = 0;           // t-offset so resuming after a manual scroll is seamless
    let paused = false;
    let resumeAt = 0;
    const SPEED = 24;        // px/sec, one-way average

    const maxScroll = () => el.scrollWidth - el.clientWidth;

    const frame = (ts: number) => {
      const m = maxScroll();
      if (m > 4 && !paused && ts >= resumeAt) {
        if (!start) start = ts;
        const oneWay = Math.max(3500, (m / SPEED) * 1000);
        const t = (ts - start) / oneWay + phase;
        el.scrollLeft = ((1 - Math.cos(t * Math.PI)) / 2) * m;
      } else if (start && (paused || ts < resumeAt)) {
        start = 0; // will re-anchor on resume
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // Hand control to the user on touch/drag/wheel; re-anchor the wave to the
    // current position after a short idle so it resumes without a jump.
    let resumeTimer = 0;
    const onInteract = () => {
      paused = true;
      resumeAt = 0;
      clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        const m = maxScroll();
        if (m > 0) {
          const frac = Math.min(1, Math.max(0, el.scrollLeft / m));
          phase = Math.acos(1 - 2 * frac) / Math.PI; // invert the raised cosine
          start = 0;
        }
        paused = false;
      }, 2200);
    };
    el.addEventListener("pointerdown", onInteract, { passive: true });
    el.addEventListener("wheel", onInteract, { passive: true });
    el.addEventListener("touchstart", onInteract, { passive: true });

    // Mouse drag-to-scroll (desktop). Touch keeps native momentum scrolling, so
    // we only hijack the mouse. A real drag suppresses the follow-up click so
    // sliding the strip never fires a chip's action.
    let dragging = false;
    let dragStartX = 0;
    let dragStartLeft = 0;
    let moved = false;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      dragging = true;
      moved = false;
      dragStartX = e.clientX;
      dragStartLeft = el.scrollLeft;
      try { el.setPointerCapture(e.pointerId); } catch {}
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStartX;
      if (Math.abs(dx) > 3) moved = true;
      el.scrollLeft = dragStartLeft - dx;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      try { el.releasePointerCapture(e.pointerId); } catch {}
    };
    const onClickCapture = (e: MouseEvent) => {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("click", onClickCapture, true);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resumeTimer);
      el.removeEventListener("pointerdown", onInteract);
      el.removeEventListener("wheel", onInteract);
      el.removeEventListener("touchstart", onInteract);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, []);

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
    <div className="flex w-full flex-col items-stretch gap-2 lg:w-auto lg:items-end">
      {storefrontUrl && (
        <a
          href={storefrontUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center gap-1 self-end py-1 text-xs text-muted-foreground transition-colors hover:text-foreground sm:min-h-0 sm:py-0"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t("dashboard.view_storefront")}
        </a>
      )}
      {/* A single horizontal strip on every breakpoint: it auto-drifts (marquee)
          so it's obviously scrollable, and you can grab-and-slide it (mouse drag
          on desktop, native touch on mobile). Capped width on desktop so it
          stays a compact strip beside the header instead of sprawling. */}
      <div className="relative -mx-1 lg:mx-0 lg:max-w-[24rem]">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />
        <div
          ref={trackRef}
          className="flex cursor-grab gap-1.5 select-none overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [touch-action:pan-x] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
        >
          {actions.map((action) => (
            <button
              key={action.title}
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                // Proper button footprint: fixed height, pill radius, sm text.
                // shrink-0 + nowrap so the draggable strip never wraps a button.
                "inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:h-9",
                "hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent hover:text-accent-foreground hover:shadow-md active:scale-[0.97]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                action.disabled && "cursor-not-allowed opacity-50 hover:translate-y-0 hover:shadow-sm"
              )}
            >
              {action.icon}
              {action.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
