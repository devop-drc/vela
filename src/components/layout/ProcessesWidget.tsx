import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { useSync } from "@/contexts/syncContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SyncSummaryModal } from "./SyncSummaryModal";
import { SyncLiveFeedModal } from "./SyncLiveFeedModal";
import { InstagramPostModal } from "@/components/InstagramPostModal";
import { cn } from "@/lib/utils";
import {
  RefreshCw, FileSpreadsheet, Send, Clapperboard, CheckCircle, XCircle,
  X, OctagonX, Activity, ChevronRight,
} from "lucide-react";

/**
 * Unified background-process monitor: Instagram sync, spreadsheet imports,
 * bulk publishing and video renders all live here — one dock pill, an
 * expandable list, per-process abort, and an animated detail modal.
 * Animations are GSAP (no framer-motion).
 */

type ProcKind = "sync" | "import" | "bulk_publish" | "video";

interface Proc {
  id: string;
  kind: ProcKind;
  status: string;
  running: boolean;
  progress: number;
  total: number;
  message: string;
  createdAt: string;
  abort?: () => Promise<void>;
  dismiss: () => void;
  raw: any;
}

const KIND_META: Record<ProcKind, { icon: typeof RefreshCw; chip: string; bar: string; text: string }> = {
  sync: { icon: RefreshCw, chip: "bg-primary/10 text-primary", bar: "bg-primary", text: "text-primary" },
  import: { icon: FileSpreadsheet, chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400", bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  bulk_publish: { icon: Send, chip: "bg-rose-500/10 text-rose-600 dark:text-rose-400", bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  video: { icon: Clapperboard, chip: "bg-blue-500/10 text-blue-600 dark:text-blue-400", bar: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
};

const pct = (p: Proc) =>
  p.status === "completed" || p.status === "done" ? 100 : p.total > 0 ? Math.round((p.progress / p.total) * 100) : 0;

/** Animated detail view for one process. */
const ProcessDetailModal = ({ proc, log, open, onOpenChange, onAbort }: {
  proc: Proc | null;
  log: string[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAbort?: () => void;
}) => {
  const { t } = useTranslation();
  const ringRef = useRef<SVGCircleElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const percent = proc ? pct(proc) : 0;
  const C = 2 * Math.PI * 54;

  useEffect(() => {
    if (!open || !ringRef.current) return;
    gsap.to(ringRef.current, { strokeDashoffset: C - (C * percent) / 100, duration: 0.8, ease: "power3.out" });
  }, [open, percent, C]);

  useEffect(() => {
    if (!open || !iconRef.current) return;
    const tween = proc?.running
      ? gsap.to(iconRef.current, { scale: 1.12, duration: 0.7, yoyo: true, repeat: -1, ease: "sine.inOut" })
      : gsap.fromTo(iconRef.current, { scale: 0.6 }, { scale: 1, duration: 0.5, ease: "back.out(2)" });
    return () => { tween.kill(); };
  }, [open, proc?.running]);

  useEffect(() => {
    if (!open || !logRef.current) return;
    const rows = logRef.current.children;
    if (rows.length) gsap.fromTo(rows[0], { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });
  }, [open, log.length]);

  if (!proc) return null;
  const meta = KIND_META[proc.kind];
  const Icon = meta.icon;
  const summary = proc.raw?.summary;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", meta.text)} />
            {t(`processes.kind_${proc.kind}`)}
          </DialogTitle>
          <DialogDescription>{t(`processes.status_${proc.running ? "running" : proc.status}`, proc.status)}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-5">
          {/* progress ring */}
          <div className="relative grid h-32 w-32 shrink-0 place-items-center">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r="54" fill="none" strokeWidth="9" className="stroke-muted" />
              <circle ref={ringRef} cx="60" cy="60" r="54" fill="none" strokeWidth="9" strokeLinecap="round"
                className={cn("transition-colors", meta.text)} stroke="currentColor"
                strokeDasharray={C} strokeDashoffset={C} />
            </svg>
            <div ref={iconRef} className={cn("absolute grid h-12 w-12 place-items-center rounded-full", meta.chip)}>
              {proc.running ? <Icon className="h-6 w-6" /> : proc.status === "failed" ? <XCircle className="h-6 w-6 text-destructive" /> : <CheckCircle className="h-6 w-6 text-success" />}
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-3xl font-bold tabular-nums">{percent}%</p>
            {proc.total > 0 && <p className="text-sm text-muted-foreground">{proc.progress}/{proc.total} {t("processes.items")}</p>}
            {summary && (summary.created != null || summary.failed != null) && (
              <p className="text-xs text-muted-foreground">
                {summary.created != null && <span className="text-success">✓ {summary.created} </span>}
                {summary.failed ? <span className="text-destructive">✗ {summary.failed}</span> : null}
              </p>
            )}
          </div>
        </div>

        {/* live feed */}
        <div ref={logRef} className="max-h-44 space-y-1 overflow-y-auto rounded-lg border bg-muted/40 p-2.5">
          {log.length === 0 && <p className="text-xs text-muted-foreground">{proc.message || "…"}</p>}
          {log.map((line, i) => (
            <p key={log.length - i} className={cn("truncate text-xs", i === 0 ? "text-foreground" : "text-muted-foreground")}>{line}</p>
          ))}
        </div>

        {proc.running && onAbort && (
          <Button variant="destructive" size="sm" onClick={onAbort} className="w-full">
            <OctagonX className="mr-2 h-4 w-4" />{t("processes.abort")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const ProcessesWidget = () => {
  const { t } = useTranslation();
  const {
    activeJob, activeImportJob, bulkJob, videoJobs,
    dismissJob, dismissImportJob, dismissBulkJob, dismissVideoJob,
  } = useSync();
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [liveFeedOpen, setLiveFeedOpen] = useState(false);
  const [postsBrowserOpen, setPostsBrowserOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pillIconRef = useRef<HTMLSpanElement>(null);
  const logsRef = useRef<Map<string, string[]>>(new Map());

  const abortSyncRow = (id: string) => async () => {
    const { error } = await supabase.from("sync_jobs").update({ status: "failed", message: t("processes.aborted") }).eq("id", id);
    if (error) showError(error.message); else showSuccess(t("processes.aborted"));
  };
  const abortVideo = (id: string) => async () => {
    const { error } = await supabase.from("video_render_jobs").update({ status: "failed", error: "aborted" }).eq("id", id);
    if (error) showError(error.message); else showSuccess(t("processes.aborted"));
  };

  const processes: Proc[] = useMemo(() => {
    const list: Proc[] = [];
    const jobRow = (j: any, kind: ProcKind, dismiss: () => void): Proc => ({
      id: j.id, kind, status: j.status,
      running: ["starting", "in_progress"].includes(j.status),
      progress: j.progress ?? 0, total: j.total ?? 0,
      message: j.message ?? "", createdAt: j.created_at,
      abort: ["starting", "in_progress"].includes(j.status) ? abortSyncRow(j.id) : undefined,
      dismiss, raw: j,
    });
    if (activeJob) list.push(jobRow(activeJob, "sync", dismissJob));
    if (activeImportJob) list.push(jobRow(activeImportJob, "import", dismissImportJob));
    if (bulkJob) list.push(jobRow(bulkJob, "bulk_publish", dismissBulkJob));
    for (const v of videoJobs) {
      list.push({
        id: v.id, kind: "video", status: v.status,
        running: ["queued", "rendering"].includes(v.status),
        progress: v.status === "done" ? 1 : 0, total: 1,
        message: v.error || t(`ig_studio.vid_${v.status}`, v.status),
        createdAt: v.created_at,
        abort: ["queued", "rendering"].includes(v.status) ? abortVideo(v.id) : undefined,
        dismiss: () => dismissVideoJob(v.id),
        raw: v,
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJob, activeImportJob, bulkJob, videoJobs]);

  // Accumulate a message log per process for the detail modal.
  useEffect(() => {
    for (const p of processes) {
      const log = logsRef.current.get(p.id) ?? [];
      if (p.message && log[0] !== p.message) logsRef.current.set(p.id, [p.message, ...log].slice(0, 60));
    }
  }, [processes]);

  const runningCount = processes.filter((p) => p.running).length;

  // GSAP: panel pop-in + row stagger; pill icon spin while anything runs.
  useEffect(() => {
    if (open && panelRef.current) {
      gsap.fromTo(panelRef.current, { opacity: 0, y: 14, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(1.6)" });
      gsap.fromTo(panelRef.current.querySelectorAll("[data-proc-row]"), { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.06, ease: "power2.out" });
    }
  }, [open]);
  useEffect(() => {
    if (!pillIconRef.current) return;
    if (runningCount > 0) {
      const tw = gsap.to(pillIconRef.current, { rotate: 360, duration: 1.6, repeat: -1, ease: "none" });
      return () => { tw.kill(); gsap.set(pillIconRef.current, { rotate: 0 }); };
    }
  }, [runningCount]);

  const detail = processes.find((p) => p.id === detailId) ?? null;
  if (!processes.length) return null;

  return (
    <div className="relative">
      <SyncSummaryModal job={activeJob} isOpen={summaryOpen} onClose={() => setSummaryOpen(false)} />
      <SyncLiveFeedModal job={activeJob} isOpen={liveFeedOpen} onClose={() => setLiveFeedOpen(false)} />
      {postsBrowserOpen && <InstagramPostModal onClose={() => setPostsBrowserOpen(false)} onImport={() => {}} />}
      <ProcessDetailModal
        proc={detail}
        log={detail ? (logsRef.current.get(detail.id) ?? []) : []}
        open={Boolean(detailId)}
        onOpenChange={(o) => !o && setDetailId(null)}
        onAbort={detail?.abort ? () => detail.abort!().then(() => setDetailId(null)) : undefined}
      />

      {/* dock pill */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-12 items-center gap-2 rounded-full border bg-card px-3.5 shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span ref={pillIconRef} className="grid place-items-center">
          {runningCount > 0
            ? <Activity className="h-4 w-4 text-primary" />
            : processes.some((p) => p.status === "failed") ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-success" />}
        </span>
        <span className="text-xs font-semibold">
          {runningCount > 0 ? t("processes.running", { count: runningCount }) : t("processes.finished")}
        </span>
      </button>

      {/* expandable process list */}
      {open && (
        <div ref={panelRef} className="absolute bottom-14 right-0 z-50 w-[340px] space-y-2 rounded-2xl border bg-card p-3 shadow-2xl">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("processes.title")}</p>
          {processes.map((p) => {
            const meta = KIND_META[p.kind];
            const Icon = meta.icon;
            return (
              <div key={p.id} data-proc-row className="rounded-xl border p-2.5">
                <div className="flex items-center gap-2">
                  <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", meta.chip)}><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{t(`processes.kind_${p.kind}`)}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{p.message}</p>
                  </div>
                  {p.running && <Spinner className="h-3.5 w-3.5 shrink-0" />}
                  {!p.running && (
                    <button type="button" onClick={p.dismiss} className="shrink-0 text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full transition-all duration-500", meta.bar)} style={{ width: `${pct(p)}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[10px] tabular-nums text-muted-foreground">{pct(p)}%</span>
                  <div className="flex gap-1">
                    {p.kind === "sync" && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]"
                        onClick={() => setPostsBrowserOpen(true)}>
                        {t("processes.details")}<ChevronRight className="ml-0.5 h-3 w-3" />
                      </Button>
                    )}
                    {p.kind !== "sync" && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setDetailId(p.id)}>
                        {t("processes.details")}<ChevronRight className="ml-0.5 h-3 w-3" />
                      </Button>
                    )}
                    {p.abort && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-destructive hover:text-destructive" onClick={() => p.abort!()}>
                        {t("processes.abort")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
