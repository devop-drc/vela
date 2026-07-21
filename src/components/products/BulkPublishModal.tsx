import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, useMotionValue, useTransform, LayoutGroup, AnimatePresence, type PanInfo } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { Image as ImageIcon, Clapperboard, X, Send } from "lucide-react";

/**
 * "Choose what to generate and post" — bulk Instagram publishing.
 * Selected products sit in a center card stack (drag physics adapted from
 * the vendored React Bits Stack); dragging the top card onto one of the four
 * columns assigns its post type. Confirming queues the bulk-publish
 * background job, which then lives in the process widget.
 */

export type BulkKind = "post_image" | "post_video" | "story_image" | "story_video";
export interface BulkProduct { id: string; name: string; media_url: string | null }

const KINDS: Array<{ kind: BulkKind; group: "post" | "story"; icon: typeof ImageIcon }> = [
  { kind: "post_image", group: "post", icon: ImageIcon },
  { kind: "post_video", group: "post", icon: Clapperboard },
  { kind: "story_image", group: "story", icon: ImageIcon },
  { kind: "story_video", group: "story", icon: Clapperboard },
];

/** Top card of the stack — React Bits Stack tilt physics + drop targeting. */
const DraggableTopCard = ({ product, onDrop, onCycle }: {
  product: BulkProduct;
  onDrop: (point: { x: number; y: number }) => boolean;
  onCycle: () => void;
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [30, -30]);
  const rotateY = useTransform(x, [-100, 100], [-30, 30]);

  const handleDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Prefer the raw pointer's viewport coordinates; fall back to
    // framer's page-based info.point corrected for scroll.
    const pe = e as PointerEvent;
    const point = typeof pe.clientX === 'number' && (pe.clientX || pe.clientY)
      ? { x: pe.clientX, y: pe.clientY }
      : { x: info.point.x - window.scrollX, y: info.point.y - window.scrollY };
    const dropped = onDrop(point);
    if (!dropped) {
      if (Math.abs(info.offset.x) > 160 || Math.abs(info.offset.y) > 160) onCycle();
      x.set(0);
      y.set(0);
    }
  };

  return (
    <motion.div
      layoutId={`bp-${product.id}`}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, y, rotateX, rotateY, zIndex: 30 }}
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.9}
      whileTap={{ scale: 1.06 }}
      onDragEnd={handleDragEnd}
    >
      <CardFace product={product} />
    </motion.div>
  );
};

const CardFace = ({ product }: { product: BulkProduct }) => (
  <div className="h-full w-full overflow-hidden rounded-2xl border bg-card shadow-xl">
    {product.media_url
      ? <img src={product.media_url} alt="" className="pointer-events-none h-full w-full object-cover" draggable={false} />
      : <div className="grid h-full w-full place-items-center bg-muted text-xs text-muted-foreground">{product.name}</div>}
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8">
      <p className="truncate text-xs font-semibold text-white">{product.name}</p>
    </div>
  </div>
);

export const BulkPublishModal = ({ open, onOpenChange, products, onQueued }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: BulkProduct[];
  onQueued?: () => void;
}) => {
  const { t } = useTranslation();
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

  const dropTopCard = (point: { x: number; y: number }): boolean => {
    const px = point.x;
    const py = point.y;
    for (const { kind } of KINDS) {
      const el = zoneRefs.current[kind];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) {
        // Assignment must happen OUTSIDE the setStack updater (updaters must
        // be pure — nested setState inside one is dropped in production).
        const top = stack[0];
        if (top) {
          setStack((s) => s.slice(1));
          setAssigned((a) => ({ ...a, [kind]: [...a[kind], top] }));
        }
        return true;
      }
    }
    return false;
  };

  const cycleStack = () => setStack((s) => (s.length > 1 ? [...s.slice(1), s[0]] : s));

  const unassign = (kind: BulkKind, product: BulkProduct) => {
    setAssigned((a) => ({ ...a, [kind]: a[kind].filter((p) => p.id !== product.id) }));
    setStack((s) => [product, ...s]);
  };

  const confirm = async () => {
    const items = KINDS.flatMap(({ kind }) => assigned[kind].map((p) => ({ productId: p.id, kind })));
    if (!items.length) return;
    setSubmitting(true);
    try {
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
        <AnimatePresence>
          {assigned[kind].map((p) => (
            <motion.div
              key={p.id}
              layoutId={`bp-${p.id}`}
              initial={false}
              className="group relative flex items-center gap-1.5 rounded-lg border bg-card p-1 shadow-sm"
            >
              {p.media_url
                ? <img src={p.media_url} alt="" className="h-9 w-9 rounded-md object-cover" />
                : <span className="grid h-9 w-9 place-items-center rounded-md bg-muted text-[9px]">{p.name.slice(0, 2)}</span>}
              <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{p.name}</span>
              <button
                type="button"
                onClick={() => unassign(kind, p)}
                className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl">{t("bulk_publish.title")}</DialogTitle>
          <DialogDescription>{t("bulk_publish.subtitle")}</DialogDescription>
        </DialogHeader>

        <LayoutGroup>
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[1fr_auto_1fr]">
            {/* Post group */}
            <div className="min-w-0">
              <p className="mb-1.5 text-center font-semibold">{t("bulk_publish.group_post")}</p>
              <div className="flex gap-2">
                <Column kind="post_image" icon={ImageIcon} />
                <Column kind="post_video" icon={Clapperboard} />
              </div>
            </div>

            {/* Center stack (React Bits Stack physics) */}
            <div className="flex flex-col items-center gap-3 self-center justify-self-center md:pt-10" style={{ perspective: 700 }}>
              <div className="relative h-48 w-40 sm:h-56 sm:w-48">
                {stack.length === 0 ? (
                  <div className="grid h-full w-full place-items-center rounded-2xl border-2 border-dashed text-center text-xs text-muted-foreground">
                    {t("bulk_publish.stack_empty")}
                  </div>
                ) : (
                  stack.slice(0, 4).reverse().map((p, revIdx, arr) => {
                    const idx = arr.length - 1 - revIdx; // 0 = top
                    return idx === 0 ? (
                      <DraggableTopCard key={p.id} product={p} onDrop={dropTopCard} onCycle={cycleStack} />
                    ) : (
                      <motion.div
                        key={p.id}
                        layoutId={`bp-${p.id}`}
                        className="absolute inset-0"
                        animate={{ rotate: idx % 2 === 0 ? idx * 3 : idx * -3, scale: 1 - idx * 0.05, y: idx * 6 }}
                        transition={{ type: "spring", stiffness: 260, damping: 22 }}
                        style={{ zIndex: 20 - idx }}
                      >
                        <CardFace product={p} />
                      </motion.div>
                    );
                  })
                )}
              </div>
              <p className="max-w-[180px] text-center text-[11px] leading-snug text-muted-foreground">
                {t("bulk_publish.stack_hint", { count: stack.length })}
              </p>
            </div>

            {/* Story/Reel group */}
            <div className="min-w-0">
              <p className="mb-1.5 text-center font-semibold">{t("bulk_publish.group_story")}</p>
              <div className="flex gap-2">
                <Column kind="story_image" icon={ImageIcon} />
                <Column kind="story_video" icon={Clapperboard} />
              </div>
            </div>
          </div>
        </LayoutGroup>

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
