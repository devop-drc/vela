import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { useShop } from "@/contexts/ShopContext";
import { useAuth } from "@/contexts/AuthContext";
import { useStudioSettings } from "@/hooks/useStudioSettings";
import { renderToJpegBlob, DEFAULT_TRANSFORM } from "@/lib/igStudio";
import { Image as ImageIcon, Clapperboard, X, Send } from "lucide-react";

gsap.registerPlugin(Draggable);

/**
 * "Choose what to generate and post" — bulk Instagram publishing.
 * Selected products sit in a center card stack (React Bits Stack look, GSAP
 * Draggable physics); dragging the top card onto one of the four columns
 * assigns its post type via Draggable.hitTest. Confirming queues the
 * bulk-publish background job, which then lives in the process widget.
 */

export type BulkKind = "post_image" | "post_video" | "story_image" | "story_video";
export interface BulkProduct { id: string; name: string; media_url: string | null; price?: number | null; currency?: string | null }

const KINDS: Array<{ kind: BulkKind; group: "post" | "story"; icon: typeof ImageIcon }> = [
  { kind: "post_image", group: "post", icon: ImageIcon },
  { kind: "post_video", group: "post", icon: Clapperboard },
  { kind: "story_image", group: "story", icon: ImageIcon },
  { kind: "story_video", group: "story", icon: Clapperboard },
];

const CardFace = ({ product }: { product: BulkProduct }) => (
  <div className="relative h-full w-full overflow-hidden rounded-2xl border bg-card shadow-xl">
    {product.media_url
      ? <img src={product.media_url} alt="" className="pointer-events-none h-full w-full select-none object-cover" draggable={false} />
      : <div className="grid h-full w-full place-items-center bg-muted text-xs text-muted-foreground">{product.name}</div>}
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8">
      <p className="truncate text-xs font-semibold text-white">{product.name}</p>
    </div>
  </div>
);

/**
 * Top card: GSAP Draggable with the React Bits Stack tilt (rotation follows
 * displacement). On release, Draggable.hitTest against the four zones decides
 * assignment; a big fling with no hit cycles the stack.
 */
const DraggableTopCard = ({ product, zones, onAssign, onCycle }: {
  product: BulkProduct;
  zones: () => Array<{ kind: BulkKind; el: HTMLDivElement | null }>;
  onAssign: (kind: BulkKind, doneTween: gsap.core.Tween | null) => void;
  onCycle: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const qRotX = gsap.quickTo(el, "rotationX", { duration: 0.2, ease: "power2.out" });
    const qRotY = gsap.quickTo(el, "rotationY", { duration: 0.2, ease: "power2.out" });
    const [drag] = Draggable.create(el, {
      type: "x,y",
      zIndexBoost: false,
      onPress() { gsap.to(el, { scale: 1.06, duration: 0.18, ease: "power2.out" }); },
      onDrag() {
        qRotX(gsap.utils.clamp(-30, 30, -this.y * 0.25));
        qRotY(gsap.utils.clamp(-30, 30, this.x * 0.25));
      },
      onRelease() {
        gsap.to(el, { scale: 1, duration: 0.18 });
        const hit = zones().find((z) => z.el && this.hitTest(z.el, "40%"));
        if (hit) {
          // shrink toward the drop point, then hand over to the chip pop-in
          const tween = gsap.to(el, { scale: 0.25, opacity: 0, duration: 0.28, ease: "power3.in" });
          onAssign(hit.kind, tween);
          return;
        }
        const flung = Math.abs(this.x) > 160 || Math.abs(this.y) > 160;
        gsap.to(el, {
          x: 0, y: 0, rotationX: 0, rotationY: 0,
          duration: 0.55, ease: "elastic.out(1, 0.55)",
          onComplete: () => { if (flung) onCycle(); },
        });
      },
    });
    return () => { drag.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  return (
    <div ref={ref} className="absolute inset-0 z-30 cursor-grab touch-none active:cursor-grabbing" style={{ transformStyle: "preserve-3d" }}>
      <CardFace product={product} />
    </div>
  );
};

/** Column chip that pops in when a product lands. */
const AssignedChip = ({ product, onRemove }: { product: BulkProduct; onRemove: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(ref.current, { scale: 0.4, opacity: 0, y: -10 }, { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: "back.out(1.8)" });
    }
  }, []);
  return (
    <div ref={ref} className="group relative flex items-center gap-1.5 rounded-lg border bg-card p-1 shadow-sm">
      {product.media_url
        ? <img src={product.media_url} alt="" className="h-9 w-9 rounded-md object-cover" />
        : <span className="grid h-9 w-9 place-items-center rounded-md bg-muted text-[9px]">{product.name.slice(0, 2)}</span>}
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{product.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

export const BulkPublishModal = ({ open, onOpenChange, products, onQueued }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: BulkProduct[];
  onQueued?: () => void;
}) => {
  const { t } = useTranslation();
  const { shopDetails } = useShop();
  const { userId } = useAuth();
  const { settings: studio } = useStudioSettings();
  const [stack, setStack] = useState<BulkProduct[]>(products);
  const [assigned, setAssigned] = useState<Record<BulkKind, BulkProduct[]>>({
    post_image: [], post_video: [], story_image: [], story_video: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const zoneRefs = useRef<Partial<Record<BulkKind, HTMLDivElement | null>>>({});

  // Re-seed when a new selection opens the modal.
  const seedKey = useMemo(() => products.map((p) => p.id).join(","), [products]);
  const lastSeed = useRef<string | null>(null);
  if (open && lastSeed.current !== seedKey) {
    lastSeed.current = seedKey;
    setStack(products);
    setAssigned({ post_image: [], post_video: [], story_image: [], story_video: [] });
  }

  const totalAssigned = KINDS.reduce((n, k) => n + assigned[k.kind].length, 0);
  const zoneList = () => KINDS.map(({ kind }) => ({ kind, el: zoneRefs.current[kind] ?? null }));

  const assignTop = (kind: BulkKind, doneTween: gsap.core.Tween | null) => {
    const finish = () => {
      setStack((s) => {
        const top = s[0];
        if (top) {
          // queue outside this updater tick — updaters must stay pure
          queueMicrotask(() => setAssigned((a) => ({ ...a, [kind]: [...a[kind], top] })));
        }
        return s.slice(1);
      });
    };
    if (doneTween) doneTween.eventCallback("onComplete", finish);
    else finish();
  };

  const cycleStack = () => setStack((s) => (s.length > 1 ? [...s.slice(1), s[0]] : s));

  const unassign = (kind: BulkKind, product: BulkProduct) => {
    setAssigned((a) => ({ ...a, [kind]: a[kind].filter((p) => p.id !== product.id) }));
    setStack((s) => [product, ...s]);
  };

  const confirm = async () => {
    const queued = KINDS.flatMap(({ kind }) => assigned[kind].map((p) => ({ kind, product: p })));
    if (!queued.length) return;
    setSubmitting(true);
    try {
      // Pre-render each image post/story through the merchant's Instagram Studio
      // design and upload it, so the bulk job publishes the SAME styled image the
      // single-publish dialog produces — not the raw photo. The backend applies
      // `imageUrl` when it's an https URL and otherwise falls back to the raw
      // photo, so a failed render just skips the overlay instead of dropping the
      // item. (Video kinds carry no imageUrl — the render worker handles those.)
      const transform = studio.transform ?? DEFAULT_TRANSFORM;
      const items = await Promise.all(queued.map(async ({ kind, product }) => {
        const item: { productId: string; kind: BulkKind; imageUrl?: string } = { productId: product.id, kind };
        const isStory = kind === "story_image";
        if ((kind !== "post_image" && !isStory) || !product.media_url) return item;
        try {
          const blob = await renderToJpegBlob({
            cutout: transform.removeBg,
            imageUrl: product.media_url,
            name: product.name,
            price: product.price ?? null,
            currency: product.currency || "ALL",
            shopName: shopDetails?.shop_name || "",
            settings: { ...studio, template: isStory ? (studio.storyTemplate ?? studio.template) : studio.template, transform },
            format: isStory ? "story" : "post",
          });
          const path = `${userId}/ig-designs/${product.id}-bulk-${kind}-${Date.now()}.jpg`;
          const { error: upErr } = await supabase.storage.from("product-media").upload(path, blob, {
            contentType: "image/jpeg", cacheControl: "31536000", upsert: false,
          });
          if (upErr) throw new Error(upErr.message);
          item.imageUrl = supabase.storage.from("product-media").getPublicUrl(path).data.publicUrl;
        } catch (e) {
          console.error(`bulk pre-render ${product.id}/${kind}:`, (e as Error).message);
        }
        return item;
      }));
      const { data, error } = await supabase.functions.invoke("bulk-publish-products", { body: { items } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      showSuccess(t("bulk_publish.queued"));
      onQueued?.();
      onOpenChange(false);
    } catch (e) {
      showError(t("bulk_publish.queue_failed", { message: (e as Error).message }));
    } finally {
      setSubmitting(false);
    }
  };

  const Column = ({ kind, icon: Icon }: { kind: BulkKind; icon: typeof ImageIcon }) => (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <p className="flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {t(`bulk_publish.col_${kind.endsWith("video") ? "video" : "image"}`)}
      </p>
      <div
        ref={(el) => { zoneRefs.current[kind] = el; }}
        className={cn(
          "flex min-h-[280px] flex-col gap-1.5 rounded-2xl border-2 border-dashed bg-muted/40 p-1.5 transition-colors sm:min-h-[340px]",
          "hover:border-primary/40"
        )}
      >
        {assigned[kind].map((p) => (
          <AssignedChip key={p.id} product={p} onRemove={() => unassign(kind, p)} />
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl">{t("bulk_publish.title")}</DialogTitle>
          <DialogDescription>{t("bulk_publish.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[1fr_auto_1fr]">
          {/* Post group */}
          <div className="min-w-0">
            <p className="mb-1.5 text-center font-semibold">{t("bulk_publish.group_post")}</p>
            <div className="flex gap-2">
              <Column kind="post_image" icon={ImageIcon} />
              {/* Video disabled for now: <Column kind="post_video" icon={Clapperboard} /> */}
            </div>
          </div>

          {/* Center stack */}
          <div className="flex flex-col items-center gap-3 self-center justify-self-center md:pt-10" style={{ perspective: 700 }}>
            <div className="relative h-48 w-40 sm:h-56 sm:w-48">
              {stack.length === 0 ? (
                <div className="grid h-full w-full place-items-center rounded-2xl border-2 border-dashed text-center text-xs text-muted-foreground">
                  {t("bulk_publish.stack_empty")}
                </div>
              ) : (
                stack.slice(0, 4).map((p, idx) =>
                  idx === 0 ? (
                    <DraggableTopCard key={p.id} product={p} zones={zoneList} onAssign={assignTop} onCycle={cycleStack} />
                  ) : (
                    <div
                      key={p.id}
                      className="absolute inset-0 transition-transform duration-300"
                      style={{
                        transform: `rotate(${idx % 2 === 0 ? idx * 3 : idx * -3}deg) scale(${1 - idx * 0.05}) translateY(${idx * 6}px)`,
                        zIndex: 20 - idx,
                      }}
                    >
                      <CardFace product={p} />
                    </div>
                  )
                )
              )}
            </div>
            <p className="max-w-[180px] text-center text-[11px] leading-snug text-muted-foreground">
              {t("bulk_publish.stack_hint", { count: stack.length })}
            </p>
          </div>

          {/* Story group (video/Reel disabled for now, matching IG Studio) */}
          <div className="min-w-0">
            <p className="mb-1.5 text-center font-semibold">{t("bulk_publish.group_story")}</p>
            <div className="flex gap-2">
              <Column kind="story_image" icon={ImageIcon} />
              {/* Video disabled for now: <Column kind="story_video" icon={Clapperboard} /> */}
            </div>
          </div>
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {t("bulk_publish.summary", { assigned: totalAssigned, remaining: stack.length })}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>{t("common.cancel")}</Button>
            <Button onClick={confirm} disabled={!totalAssigned || submitting}>
              {submitting ? <Spinner className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
              {t("bulk_publish.confirm", { count: totalAssigned })}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
