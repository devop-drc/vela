import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/contexts/ShopContext";
import { useAuth } from "@/contexts/AuthContext";
import { showError, showSuccess } from "@/utils/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileSpreadsheet, Upload, Download, CheckCircle } from "lucide-react";

/**
 * Bulk import from CSV / Excel. Column layout (header row required,
 * case-insensitive; * = required):
 *   name*, price*, description, currency, inventory, category, status,
 *   images          — image URLs separated by | or ;
 *   specifications  — "Key: Value; Key: Value" (units stay in the value)
 *   options         — "Group: v1 | v2 | v3; Group2: v1 | v2"
 */

interface ParsedRow {
  name: string;
  description: string;
  price: number;
  currency: string;
  inventory: number;
  category: string;
  status: string;
  images: string[];
  specifications: Array<{ key: string; value: string }>;
  options: Array<{ name: string; values: string[] }>;
}

const splitList = (s: string) => s.split(/[|;]/).map((x) => x.trim()).filter(Boolean);

const parsePairs = (s: string): Array<{ key: string; value: string }> =>
  s.split(';').map((pair) => {
    const i = pair.indexOf(':');
    if (i < 0) return null;
    return { key: pair.slice(0, i).trim(), value: pair.slice(i + 1).trim() };
  }).filter((p): p is { key: string; value: string } => Boolean(p?.key && p?.value));

const parseOptions = (s: string): Array<{ name: string; values: string[] }> =>
  s.split(';').map((group) => {
    const i = group.indexOf(':');
    if (i < 0) return null;
    const name = group.slice(0, i).trim();
    const values = group.slice(i + 1).split('|').map((v) => v.trim()).filter(Boolean);
    return name && values.length ? { name, values } : null;
  }).filter((g): g is { name: string; values: string[] } => Boolean(g));

const normalizeRow = (raw: Record<string, unknown>): ParsedRow | null => {
  const get = (key: string) => {
    const found = Object.keys(raw).find((k) => k.trim().toLowerCase() === key);
    return found != null ? String(raw[found] ?? '').trim() : '';
  };
  const name = get('name');
  const price = parseFloat(get('price').replace(/[^\d.,-]/g, '').replace(',', '.'));
  if (!name || !Number.isFinite(price)) return null;
  return {
    name,
    description: get('description'),
    price,
    currency: (get('currency') || 'ALL').toUpperCase(),
    inventory: parseInt(get('inventory'), 10) || 0,
    category: get('category'),
    status: /^(active|aktiv)$/i.test(get('status')) ? 'Active' : /^draft/i.test(get('status') || 'x') ? 'Draft' : (get('status') || 'Active'),
    images: splitList(get('images') || get('image')).filter((u) => u.startsWith('http')),
    specifications: parsePairs(get('specifications') || get('specs')),
    options: parseOptions(get('options')),
  };
};

const SAMPLE_CSV = [
  'name,price,currency,inventory,description,category,status,images,specifications,options',
  '"Çantë lëkure",4500,ALL,12,"Çantë dore prej lëkure natyrale","Çanta",Active,"https://example.com/canta-1.jpg|https://example.com/canta-2.jpg","Materiali: Lëkurë natyrale; Përmasat: 28 x 20 cm","Ngjyra: E kuqe | E zezë"',
  '"Bluzë pambuku",1900,ALL,30,"Bluzë 100% pambuk","Veshje",Active,https://example.com/bluze.jpg,"Materiali: 100% pambuk; Kujdesi: Larje 30°C","Masa: S | M | L | XL; Ngjyra: E bardhë | Blu"',
].join('\n');

export const ImportProductsDialog = ({ open, onOpenChange, onImported }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) => {
  const { t } = useTranslation();
  const { shopDetails } = useShop();
  const { userId } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [doneCount, setDoneCount] = useState<number | null>(null);
  const [failures, setFailures] = useState<string[]>([]);

  const reset = () => { setRows([]); setSkipped(0); setFileName(null); setProgress(0); setDoneCount(null); setFailures([]); };

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
      const parsed = rawRows.map(normalizeRow);
      const good = parsed.filter((r): r is ParsedRow => r !== null);
      setRows(good);
      setSkipped(parsed.length - good.length);
      if (!good.length) showError(t('import.no_valid_rows'));
    } catch (e) {
      showError(t('import.parse_failed', { message: (e as Error).message }));
      reset();
    }
  };

  const runImport = async () => {
    if (!shopDetails?.id || !userId || !rows.length) return;
    setImporting(true);
    setFailures([]);
    let ok = 0;
    const errs: string[] = [];

    // Category map (create missing ones on the fly)
    const { data: cats } = await supabase.from('categories').select('id, name').eq('user_id', userId);
    const catMap = new Map<string, string>((cats || []).map((c: any) => [c.name.toLowerCase(), c.id]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        let categoryId: string | null = null;
        if (row.category) {
          categoryId = catMap.get(row.category.toLowerCase()) ?? null;
          if (!categoryId) {
            const { data: newCat } = await supabase.from('categories')
              .insert({ name: row.category, user_id: userId }).select('id').single();
            if (newCat) { categoryId = newCat.id; catMap.set(row.category.toLowerCase(), newCat.id); }
          }
        }

        const { data: product, error: pErr } = await supabase.from('products').insert({
          name: row.name,
          caption: row.description || null,
          status: row.status,
          business_id: shopDetails.id,
          price: row.price,
          currency: row.currency,
          inventory: row.inventory,
          pricing_type: 'one_time',
          product_type: 'physical',
          details: { type: 'generic' },
          tags: [],
          category_id: categoryId,
          media_url: row.images[0] ?? null,
          media_type: row.images[0] ? 'image' : null,
          media_gallery: row.images.length > 1 ? row.images : null,
        }).select('id').single();
        if (pErr || !product) throw new Error(pErr?.message || 'insert failed');

        if (row.specifications.length) {
          await supabase.from('product_specifications').insert(
            row.specifications.map((s, idx) => ({
              product_id: product.id, user_id: userId,
              key: s.key, value: s.value, display_order: idx,
            }))
          );
        }

        for (const [gIdx, group] of row.options.entries()) {
          const { data: opt } = await supabase.from('product_options')
            .insert({ product_id: product.id, user_id: userId, name: group.name, display_order: gIdx, is_active: true })
            .select('id').single();
          if (opt) {
            await supabase.from('option_values').insert(
              group.values.map((v, vIdx) => ({
                option_id: opt.id, user_id: userId, value: v,
                inventory: row.inventory, is_active: true, is_default: vIdx === 0, display_order: vIdx,
              }))
            );
          }
        }
        ok++;
      } catch (e) {
        errs.push(`${row.name}: ${(e as Error).message}`);
      }
      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    setImporting(false);
    setDoneCount(ok);
    setFailures(errs);
    if (ok) { showSuccess(t('import.done', { count: ok })); onImported(); }
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
                <AlertDescription>
                  {t('import.ready', { count: rows.length })}
                  {skipped > 0 && ` ${t('import.skipped', { count: skipped })}`}
                </AlertDescription>
              </Alert>
            )}
            {importing && <Progress value={progress} />}
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
