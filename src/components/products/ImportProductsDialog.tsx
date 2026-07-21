import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileSpreadsheet, Upload, Download, CheckCircle, Sparkles } from "lucide-react";

/**
 * AI-powered bulk import: the file is parsed to raw rows client-side (any
 * column names, any language) and the system maps them into structured
 * products server-side — prices, images, specifications, option groups —
 * via the import-products edge function. No fixed column format required;
 * the template is just a convenient starting point.
 */

const SAMPLE_CSV = [
  'name,price,currency,inventory,description,category,status,images,specifications,options',
  '"Çantë lëkure",4500,ALL,12,"Çantë dore prej lëkure natyrale","Çanta",Active,"https://example.com/canta-1.jpg|https://example.com/canta-2.jpg","Materiali: Lëkurë natyrale; Përmasat: 28 x 20 cm","Ngjyra: E kuqe | E zezë"',
  '"Bluzë pambuku",1900,ALL,30,"Bluzë 100% pambuk","Veshje",Active,https://example.com/bluze.jpg,"Materiali: 100% pambuk; Kujdesi: Larje 30°C","Masa: S | M | L | XL; Ngjyra: E bardhë | Blu"',
].join('\n');

/** Rows per edge-function call (the function caps at 200). */
const CHUNK = 50;

export const ImportProductsDialog = ({ open, onOpenChange, onImported }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) => {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [doneCount, setDoneCount] = useState<number | null>(null);
  const [failures, setFailures] = useState<string[]>([]);

  const reset = () => { setRows([]); setFileName(null); setProgress(0); setDoneCount(null); setFailures([]); };

  const handleFile = async (file: File) => {
    reset();
    setFileName(file.name);
    try {
      let rawRows: Record<string, unknown>[] = [];
      if (/\.(xlsx|xls)$/i.test(file.name)) {
        const XLSX = await import('xlsx');
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      } else {
        const Papa = (await import('papaparse')).default;
        rawRows = await new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: (r) => resolve(r.data as Record<string, unknown>[]),
            error: reject,
          });
        });
      }
      // Drop rows that are entirely empty; everything else is the system's job.
      const nonEmpty = rawRows.filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''));
      setRows(nonEmpty);
      if (!nonEmpty.length) showError(t('import.no_valid_rows'));
    } catch (e) {
      showError(t('import.parse_failed', { message: (e as Error).message }));
      reset();
    }
  };

  const runImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setFailures([]);
    let ok = 0;
    const errs: string[] = [];
    try {
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { data, error } = await supabase.functions.invoke('import-products', {
          body: { rows: rows.slice(i, i + CHUNK) },
        });
        if (error) throw new Error(error.message);
        if (data?.error && !data?.results?.length) throw new Error(data.error);
        ok += data?.created ?? 0;
        for (const r of data?.results ?? []) {
          if (!r.ok) errs.push(`${r.name}: ${r.error}`);
        }
        setProgress(Math.round(Math.min(i + CHUNK, rows.length) / rows.length * 100));
      }
      setDoneCount(ok);
      setFailures(errs);
      if (ok) { showSuccess(t('import.done', { count: ok })); onImported(); }
      else showError(t('import.no_valid_rows'));
    } catch (e) {
      showError(t('import.parse_failed', { message: (e as Error).message }));
      setDoneCount(ok || null);
    } finally {
      setImporting(false);
    }
  };

  const downloadSample = () => {
    const blob = new Blob(['﻿' + SAMPLE_CSV], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vela-import-template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!importing) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {t('import.title')}
          </DialogTitle>
          <DialogDescription>{t('import.description')}</DialogDescription>
        </DialogHeader>

        {doneCount !== null ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="space-y-1">
              <p>{t('import.summary', { ok: doneCount, total: rows.length })}</p>
              {failures.slice(0, 5).map((f, i) => <p key={i} className="text-xs text-destructive">{f}</p>)}
              {failures.length > 5 && <p className="text-xs text-muted-foreground">+{failures.length - 5}</p>}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              <Upload className="h-8 w-8" />
              {fileName ?? t('import.drop_hint')}
            </button>
            <input
              ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
            />
            {rows.length > 0 && (
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>{t('import.ready_ai', { count: rows.length })}</AlertDescription>
              </Alert>
            )}
            {importing && (
              <div className="space-y-1.5">
                <Progress value={progress} />
                <p className="text-center text-xs text-muted-foreground">{t('import.ai_working')}</p>
              </div>
            )}
            <Button variant="link" size="sm" onClick={downloadSample} className="px-0">
              <Download className="mr-2 h-4 w-4" />
              {t('import.download_template')}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            {doneCount !== null ? t('common.close') : t('common.cancel')}
          </Button>
          {doneCount === null && (
            <Button onClick={runImport} disabled={!rows.length || importing}>
              {importing ? t('import.importing', { progress }) : t('import.start', { count: rows.length })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
