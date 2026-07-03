"use client";

import React, { useCallback, useImperativeHandle, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Trash2, Search, Settings2, RefreshCw, Layers, X, ArrowUpDown,
  CheckCircle2, AlertTriangle, XCircle, PackageX,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { currencies } from "@/lib/currencies";
import { getStockStatus } from "@/lib/stock";

// ── Types ─────────────────────────────────────────────────────────────────────
export type OptionValue = { id?: string; value: string; price_difference: number; is_active: boolean; is_default: boolean; inventory?: number };
export type ProductOption = { id?: string; name: string; values: OptionValue[]; display_order?: number };
export type VariantRow = {
  id?: string;
  product_id: string;
  combination_key: string;
  option_values: Record<string, string>;
  price_difference: number; // stored in ALL
  inventory: number;
  is_active: boolean;
  is_default: boolean;
  sku?: string | null;
};

export interface VariantsManagerProps {
  productId: string;
  basePriceALL: number;
  displayCurrency: string;
  convertCurrency: (amount: number | null | undefined, fromCurrency?: string, toCurrency?: string) => number;
}

type StatusFilter = "all" | "in" | "low" | "out";
type SortKey = "inventory" | "price" | "sku" | `opt:${string}`;

// ── Helpers ───────────────────────────────────────────────────────────────────
const cartesian = (arrays: string[][]): string[][] => arrays.reduce<string[][]>((acc, curr) => {
  if (acc.length === 0) return curr.map(v => [v]);
  const out: string[][] = [];
  for (const a of acc) for (const b of curr) out.push([...a, b]);
  return out;
}, []);

const normalizeKey = (obj: Record<string, string>) => Object.keys(obj).sort().map(k => `${k}:${obj[k]}`).join("|");

const autoSku = (base: string, obj: Record<string, string>) => {
  const parts = Object.keys(obj).sort().map(k => `${obj[k]}`.replace(/\s+/g, '').slice(0, 6).toUpperCase());
  return `${base}-${parts.join('-')}`.replace(/--+/g, '-').slice(0, 48);
};

// Map the centralized 4-state status onto this component's 3-state filter
// vocabulary (critical is treated as low here).
const stockStatus = (inv: number): StatusFilter => {
  const s = getStockStatus(inv);
  if (s === "out") return "out";
  if (s === "in") return "in";
  return "low"; // covers both "critical" and "low"
};

// Stable serialization of the editable option + variant state for dirty-checking.
const serializeState = (options: ProductOption[], variants: VariantRow[]): string => {
  const opts = [...options]
    .map(o => ({
      name: o.name.trim(),
      values: [...o.values]
        .map(v => ({ v: v.value.trim(), p: v.price_difference || 0, a: !!v.is_active, d: !!v.is_default, i: v.inventory ?? 0 }))
        .sort((a, b) => a.v.localeCompare(b.v)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const vars = [...variants]
    .map(v => ({ k: v.combination_key, i: v.inventory ?? 0, s: v.sku || '', a: !!v.is_active, d: !!v.is_default, p: v.price_difference || 0 }))
    .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
  return JSON.stringify({ opts, vars });
};

const VariantsManager = React.forwardRef(({ productId, basePriceALL, displayCurrency, convertCurrency }: VariantsManagerProps, ref: any) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const initialOptionIdsRef = React.useRef<Set<string>>(new Set());
  const initialValueIdsRef = React.useRef<Set<string>>(new Set());
  // Snapshot of the saved state (options + variants) captured on load and after
  // each successful save, used to detect unsaved edits via isDirty().
  const initialSnapshotRef = React.useRef<string>("");

  const currencySymbol = useMemo(() => currencies.find(c => c.code === displayCurrency)?.symbol || displayCurrency, [displayCurrency]);

  // ── Load ──────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const run = async () => {
      if (!productId) return;
      setLoading(true);
      const { data: optRows } = await supabase
        .from('product_options')
        .select(`id, name, display_order, option_values(id, value, price_difference, is_active, is_default, inventory, display_order)`)
        .eq('product_id', productId)
        .order('display_order')
        .order('display_order', { foreignTable: 'option_values' });
      const mapped: ProductOption[] = (optRows || []).map((o: any) => ({
        id: o.id,
        name: o.name,
        display_order: o.display_order,
        values: (o.option_values || []).map((v: any) => ({ id: v.id, value: v.value, price_difference: v.price_difference || 0, is_active: v.is_active ?? true, is_default: v.is_default ?? false, inventory: v.inventory ?? 0 })),
      }));

      const { data: varRows } = await supabase.from('product_variants').select('*').eq('product_id', productId);
      const mappedVars: VariantRow[] = (varRows || []).map((r: any) => ({ id: r.id, product_id: r.product_id, combination_key: r.combination_key, option_values: r.option_values || {}, price_difference: r.price_difference || 0, inventory: r.inventory ?? 0, is_active: r.is_active ?? true, is_default: r.is_default ?? false, sku: r.sku || null }));

      setOptions(mapped);
      initialOptionIdsRef.current = new Set((optRows || []).map((o: any) => o.id).filter(Boolean));
      const valIds: string[] = [];
      (optRows || []).forEach((o: any) => (o.option_values || []).forEach((v: any) => v.id && valIds.push(v.id)));
      initialValueIdsRef.current = new Set(valIds);
      setVariants(mappedVars);
      setLoading(false);
    };
    run();
  }, [productId]);

  // ── Options editing ─────────────────────────────────────────────────────────
  const addOption = () => setOptions(prev => [...prev, { name: ``, values: [] }]);
  const removeOption = (idx: number) => setOptions(prev => prev.filter((_, i) => i !== idx));
  const addValue = (idx: number) => setOptions(prev => { const next = [...prev]; next[idx] = { ...next[idx], values: [...next[idx].values, { value: '', price_difference: 0, is_active: true, is_default: next[idx].values.length === 0, inventory: 0 }] }; return next; });
  const removeValue = (iOpt: number, iVal: number) => setOptions(prev => { const next = [...prev]; next[iOpt] = { ...next[iOpt], values: next[iOpt].values.filter((_, j) => j !== iVal) }; return next; });
  const patchOption = (idx: number, patch: Partial<ProductOption>) => setOptions(prev => { const next = [...prev]; next[idx] = { ...next[idx], ...patch }; return next; });
  const patchValue = (iOpt: number, iVal: number, patch: Partial<OptionValue>) => setOptions(prev => {
    const next = [...prev];
    const vals = [...next[iOpt].values];
    vals[iVal] = { ...vals[iVal], ...patch };
    next[iOpt] = { ...next[iOpt], values: vals };
    return next;
  });
  const setDefaultValue = (iOpt: number, iVal: number) => setOptions(prev => {
    const next = [...prev];
    next[iOpt] = { ...next[iOpt], values: next[iOpt].values.map((vv, i) => ({ ...vv, is_default: i === iVal })) };
    return next;
  });

  // ── Derived variants (cartesian of active values, merged with saved rows) ────
  const activeOptionNames = useMemo(() => options.filter(o => o.name.trim() && o.values.some(v => v.is_active && v.value.trim())).map(o => o.name), [options]);

  const combinations = useMemo(() => {
    const usable = options.filter(o => o.name.trim() && o.values.some(v => v.is_active && v.value.trim()));
    const active = usable.map(o => o.values.filter(v => v.is_active && v.value.trim()).map(v => v.value));
    if (active.length < 1 || active.length > 5) return [] as Array<Record<string, string>>;
    return cartesian(active).map(row => {
      const obj: Record<string, string> = {};
      row.forEach((val, idx) => { obj[usable[idx].name] = val; });
      return obj;
    });
  }, [options]);

  const rows = useMemo((): VariantRow[] => combinations.map(combo => {
    const key = normalizeKey(combo);
    const ex = variants.find(v => v.combination_key === key);
    if (ex) return { ...ex, option_values: combo };
    return { product_id: productId, combination_key: key, option_values: combo, price_difference: 0, inventory: 0, is_active: true, is_default: false, sku: autoSku('SKU', combo) };
  }), [combinations, variants, productId]);

  const patchVariant = (key: string, patch: Partial<VariantRow>) => setVariants(prev => {
    const next = [...prev];
    const i = next.findIndex(v => v.combination_key === key);
    if (i >= 0) next[i] = { ...next[i], ...patch };
    else { const row = rows.find(r => r.combination_key === key); if (row) next.push({ ...row, ...patch }); }
    return next;
  });

  const setSingleDefault = (key: string) => setVariants(() => rows.map(r => ({ ...r, is_default: r.combination_key === key })));

  // Capture the saved-state snapshot once after the initial load settles, so
  // isDirty() can compare subsequent edits against it.
  const snapshotCapturedRef = React.useRef(false);
  React.useEffect(() => {
    snapshotCapturedRef.current = false;
  }, [productId]);
  React.useEffect(() => {
    if (loading || snapshotCapturedRef.current) return;
    initialSnapshotRef.current = serializeState(options, rows);
    snapshotCapturedRef.current = true;
  }, [loading, options, rows]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let units = 0, inS = 0, low = 0, out = 0;
    rows.forEach(r => {
      units += r.inventory || 0;
      const s = stockStatus(r.inventory || 0);
      if (s === "in") inS++; else if (s === "low") low++; else out++;
    });
    return { total: rows.length, units, inS, low, out };
  }, [rows]);

  // ── Toolbar state: search / filter / sort ────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [valueFilters, setValueFilters] = useState<Record<string, Set<string>>>({});
  const [sortKey, setSortKey] = useState<SortKey>("inventory");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const toggleValueFilter = (optName: string, value: string) => setValueFilters(prev => {
    const next = { ...prev };
    const set = new Set(next[optName] || []);
    if (set.has(value)) set.delete(value); else set.add(value);
    if (set.size === 0) delete next[optName]; else next[optName] = set;
    return next;
  });
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setValueFilters({}); };
  const hasActiveFilters = !!search || statusFilter !== "all" || Object.keys(valueFilters).length > 0;

  const rowPriceALL = useCallback((r: VariantRow) => {
    let deltaALL = 0;
    Object.entries(r.option_values || {}).forEach(([optName, val]) => {
      const v = options.find(o => o.name === optName)?.values.find(x => x.value === val);
      if (v) deltaALL += v.price_difference || 0;
    });
    return (basePriceALL || 0) + deltaALL + (r.price_difference || 0);
  }, [options, basePriceALL]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter(r => {
      if (statusFilter !== "all" && stockStatus(r.inventory || 0) !== statusFilter) return false;
      for (const [optName, set] of Object.entries(valueFilters)) {
        if (!set.has(r.option_values[optName])) return false;
      }
      if (s) {
        const hay = (Object.values(r.option_values).join(' ') + ' ' + (r.sku || '')).toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, valueFilters]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    const cmp = (x: number | string, y: number | string) => (x < y ? -1 : x > y ? 1 : 0);
    list.sort((a, b) => {
      if (sortKey === "inventory") return dir * cmp(a.inventory || 0, b.inventory || 0);
      if (sortKey === "sku") return dir * cmp(a.sku || '', b.sku || '');
      if (sortKey === "price") return dir * cmp(rowPriceALL(a), rowPriceALL(b));
      if (sortKey.startsWith("opt:")) {
        const name = sortKey.slice(4);
        const av = a.option_values[name] || '', bv = b.option_values[name] || '';
        const an = parseFloat(av), bn = parseFloat(bv);
        return dir * (!isNaN(an) && !isNaN(bn) ? cmp(an, bn) : cmp(av.toLowerCase(), bv.toLowerCase()));
      }
      return 0;
    });
    return list;
  }, [filtered, sortKey, sortDir, rowPriceALL]);

  // ── Bulk actions ──────────────────────────────────────────────────────────────
  const selectedKeys = useMemo(() => sorted.filter(r => selected[r.combination_key]).map(r => r.combination_key), [sorted, selected]);
  const allVisibleSelected = sorted.length > 0 && sorted.every(r => selected[r.combination_key]);
  const toggleSelectAll = (checked: boolean) => { const map = { ...selected }; sorted.forEach(r => { map[r.combination_key] = checked; }); setSelected(map); };
  const [bulkValue, setBulkValue] = useState("");
  const applyBulk = (mode: "set" | "add" | "zero" | "activate" | "deactivate") => {
    const keys = new Set(selectedKeys);
    setVariants(prev => {
      const byKey = new Map(prev.map(v => [v.combination_key, v]));
      rows.forEach(r => { if (!byKey.has(r.combination_key)) byKey.set(r.combination_key, r); });
      const num = parseInt(bulkValue, 10);
      keys.forEach(k => {
        const cur = byKey.get(k); if (!cur) return;
        if (mode === "zero") byKey.set(k, { ...cur, inventory: 0 });
        else if (mode === "set" && !isNaN(num)) byKey.set(k, { ...cur, inventory: Math.max(0, num) });
        else if (mode === "add" && !isNaN(num)) byKey.set(k, { ...cur, inventory: Math.max(0, (cur.inventory || 0) + num) });
        else if (mode === "activate") byKey.set(k, { ...cur, is_active: true });
        else if (mode === "deactivate") byKey.set(k, { ...cur, is_active: false });
      });
      return Array.from(byKey.values());
    });
  };

  // ── Save (hardened: syncs option_values stock + product base inventory/status) ─
  const handleSave = useCallback(async () => {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) throw new Error("You're not signed in. Please sign in to save options and variants.");

    // Only save options that have a name, and values that have a value — blank
    // rows are incomplete and would collide on the unique (product_id, name) /
    // (option_id, value) constraints.
    const savableOptions = options
      .filter(o => o.name.trim().length > 0)
      .map(o => ({ ...o, name: o.name.trim(), values: o.values.filter(v => v.value.trim().length > 0).map(v => ({ ...v, value: v.value.trim() })) }));

    const toUpdateOpts = savableOptions.filter(o => !!o.id).map((o, idx) => ({ id: o.id!, product_id: productId, name: o.name, display_order: idx }));
    const toInsertOpts = savableOptions.filter(o => !o.id).map((o, idx) => ({ product_id: productId, name: o.name, display_order: idx }));
    if (toUpdateOpts.length) { const { error } = await supabase.from('product_options').upsert(toUpdateOpts, { onConflict: 'id' }); if (error) throw error; }
    let insertedOpts: Array<{ id: string; name: string }> = [];
    if (toInsertOpts.length) { const { data, error } = await supabase.from('product_options').upsert(toInsertOpts, { onConflict: 'product_id,name' }).select('id, name'); if (error) throw error; insertedOpts = data as any; }
    const idMap: Record<string, string> = {};
    [...savableOptions.filter(o => !!o.id).map(o => ({ id: o.id!, name: o.name })), ...insertedOpts].forEach(r => { idMap[r.name] = r.id; });

    // Derive each option value's stock from variants (single source of truth).
    const derivedValueStock: Record<string, Record<string, number>> = {};
    savableOptions.forEach(opt => { derivedValueStock[opt.name] = {}; opt.values.forEach(v => { derivedValueStock[opt.name][v.value] = rows.reduce((s, r) => r.option_values[opt.name] === v.value ? s + (r.inventory || 0) : s, 0); }); });

    const valueRows: Array<{ id?: string; option_id: string; value: string; price_difference: number; inventory: number; is_active: boolean; is_default: boolean; display_order: number }> = [];
    savableOptions.forEach((o) => { const option_id = idMap[o.name] || o.id; o.values.forEach((v, vidx) => { valueRows.push({ id: v.id, option_id: option_id as string, value: v.value, price_difference: v.price_difference, inventory: derivedValueStock[o.name]?.[v.value] ?? 0, is_active: v.is_active, is_default: v.is_default, display_order: vidx }); }); });

    const currentValueIds = new Set(valueRows.map(v => v.id).filter(Boolean) as string[]);
    const toDeleteValueIds = Array.from(initialValueIdsRef.current).filter(id => !currentValueIds.has(id));
    if (toDeleteValueIds.length) { const { error } = await supabase.from('option_values').delete().in('id', toDeleteValueIds); if (error) throw error; }
    const toUpdateVals = valueRows.filter(v => !!v.id);
    const toInsertVals = valueRows.filter(v => !v.id).map(({ id, ...rest }) => rest);
    if (toUpdateVals.length) { const { error } = await supabase.from('option_values').upsert(toUpdateVals as any[], { onConflict: 'id' }); if (error) throw error; }
    if (toInsertVals.length) { const { error } = await supabase.from('option_values').upsert(toInsertVals as any[], { onConflict: 'option_id,value' }); if (error) throw error; }

    const currentOptionIds = new Set(Object.values(idMap));
    const toDeleteOptionIds = Array.from(initialOptionIdsRef.current).filter(id => !currentOptionIds.has(id));
    if (toDeleteOptionIds.length) { const { error } = await supabase.from('product_options').delete().in('id', toDeleteOptionIds); if (error) throw error; }

    // Variants: enforce single default, upsert.
    const orderedRows = [...rows];
    const defaultIdx = orderedRows.findIndex(r => r.is_default);
    if (defaultIdx >= 0) orderedRows.forEach((r, i) => { if (i !== defaultIdx) r.is_default = false; });
    const variantPayload = orderedRows.map(r => ({ id: r.id, product_id: r.product_id, combination_key: r.combination_key, option_values: r.option_values, price_difference: r.price_difference, inventory: r.inventory, is_active: r.is_active, is_default: r.is_default, sku: r.sku || autoSku('SKU', r.option_values) }));
    const cleanVariants = variantPayload.map(v => { const c: any = { ...v }; if (!c.id) delete c.id; return c; });
    if (cleanVariants.length) { const { error } = await supabase.from('product_variants').upsert(cleanVariants, { onConflict: 'id' }); if (error) throw error; }

    // Remove variant rows that no longer match any current combination.
    const currentKeys = new Set(rows.map(r => r.combination_key));
    const staleVariantIds = variants.filter(v => v.id && !currentKeys.has(v.combination_key)).map(v => v.id!) as string[];
    if (staleVariantIds.length) { await supabase.from('product_variants').delete().in('id', staleVariantIds); }

    // Sync product base inventory + status from variant totals.
    if (rows.length > 0) {
      const totalInventory = rows.reduce((sum, r) => sum + (r.inventory || 0), 0);
      const { data: prod } = await supabase.from('products').select('status, pricing_type').eq('id', productId).single();
      const productUpdate: { inventory: number; status?: string } = { inventory: totalInventory };
      if (prod?.pricing_type !== 'subscription' && prod?.status !== 'Draft') productUpdate.status = totalInventory > 0 ? 'Active' : 'Out of Stock';
      const { error: prodErr } = await supabase.from('products').update(productUpdate).eq('id', productId);
      if (prodErr) console.error('Failed to sync product inventory from variants:', prodErr);
    }

    initialOptionIdsRef.current = new Set(currentOptionIds);
    initialValueIdsRef.current = new Set(valueRows.map(v => v.id).filter(Boolean) as string[]);
    // Refresh the dirty-check baseline so the form is considered clean post-save.
    initialSnapshotRef.current = serializeState(options, rows);
    return true;
  }, [options, rows, variants, productId]);

  const isDirty = useCallback(() => {
    if (!snapshotCapturedRef.current) return false;
    return serializeState(options, rows) !== initialSnapshotRef.current;
  }, [options, rows]);

  useImperativeHandle(ref, () => ({ handleSaveCombined: handleSave, isDirty }), [handleSave, isDirty]);

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="space-y-3"><Skeleton className="h-9 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-40 w-full" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* ── OPTIONS ──────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Settings2 className="h-4 w-4" /> Options</h3>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={addOption}><Plus className="h-3.5 w-3.5 mr-1" /> Add option</Button>
        </div>

        {options.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center">
            <Layers className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-medium">No options yet</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">Add an option like <b>Size</b> or <b>Color</b> to generate variants.</p>
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={addOption}><Plus className="h-3.5 w-3.5 mr-1.5" /> Add your first option</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {options.map((opt, idx) => (
              <div key={idx} className="rounded-lg border overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
                  <Input value={opt.name} onChange={e => patchOption(idx, { name: e.target.value })} placeholder="Option name (e.g. Size)" className="h-7 text-sm font-medium max-w-[220px]" />
                  <span className="text-xs text-muted-foreground ml-auto">{opt.values.length} value{opt.values.length !== 1 ? 's' : ''}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeOption(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                {opt.values.length > 0 && (
                  <div className="grid grid-cols-[1fr_110px_52px_56px_32px] items-center gap-2 px-3 py-1.5 border-b bg-muted/20 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    <span>Value</span><span>Price +/-</span><span className="text-center">Active</span><span className="text-center">Default</span><span />
                  </div>
                )}
                <div className="divide-y">
                  {opt.values.map((v, vidx) => (
                    <div key={vidx} className="grid grid-cols-[1fr_110px_52px_56px_32px] items-center gap-2 px-3 py-1.5">
                      <Input value={v.value} onChange={e => patchValue(idx, vidx, { value: e.target.value })} placeholder="e.g. Medium" className="h-8 text-sm" />
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{currencySymbol}</span>
                        <Input type="number" step="0.01" value={convertCurrency(v.price_difference || 0, 'ALL', displayCurrency)} onChange={e => { const entered = parseFloat(e.target.value || '0'); const backToALL = convertCurrency(entered, displayCurrency, 'ALL'); patchValue(idx, vidx, { price_difference: isFinite(backToALL) ? backToALL : 0 }); }} className="h-8 text-sm pl-6" />
                      </div>
                      <div className="flex justify-center"><Switch checked={v.is_active} onCheckedChange={c => patchValue(idx, vidx, { is_active: !!c })} className="scale-90" /></div>
                      <div className="flex justify-center"><Checkbox checked={v.is_default} onCheckedChange={() => setDefaultValue(idx, vidx)} /></div>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeValue(idx, vidx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2 border-t bg-muted/10">
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => addValue(idx)}><Plus className="h-3.5 w-3.5 mr-1" /> Add value</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── VARIANTS ─────────────────────────────────────────────────────────── */}
      {rows.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Layers className="h-4 w-4" /> Variants & Inventory <Badge variant="secondary" className="h-5 text-xs">{rows.length}</Badge></h3>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Total units", value: stats.units.toLocaleString(), cls: "text-foreground", Icon: Layers },
              { label: "In stock", value: stats.inS, cls: "text-emerald-600", Icon: CheckCircle2 },
              { label: "Low stock", value: stats.low, cls: "text-amber-600", Icon: AlertTriangle },
              { label: "Out of stock", value: stats.out, cls: "text-red-600", Icon: XCircle },
            ].map(s => (
              <div key={s.label} className="rounded-lg border px-3 py-2">
                <div className={cn("text-lg font-bold flex items-center gap-1.5", s.cls)}><s.Icon className="h-4 w-4" />{s.value}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search variants or SKU…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
            <div className="flex items-center rounded-md border p-0.5 gap-0.5">
              {([["all", "All"], ["in", "In"], ["low", "Low"], ["out", "Out"]] as [StatusFilter, string][]).map(([k, lbl]) => (
                <button key={k} type="button" onClick={() => setStatusFilter(k)} className={cn("px-2.5 h-7 text-xs rounded transition-colors", statusFilter === k ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}>{lbl}</button>
              ))}
            </div>
            <Select value={sortKey} onValueChange={v => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[140px] h-8 text-sm"><div className="flex items-center gap-1.5"><ArrowUpDown className="h-3.5 w-3.5" /><SelectValue /></div></SelectTrigger>
              <SelectContent>
                <SelectItem value="inventory">Stock</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="sku">SKU</SelectItem>
                {activeOptionNames.map(n => <SelectItem key={`opt:${n}`} value={`opt:${n}`}>By {n}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")} title={sortDir === "asc" ? "Ascending" : "Descending"}>
              <ArrowUpDown className={cn("h-3.5 w-3.5 transition-transform", sortDir === "asc" && "rotate-180")} />
            </Button>
            {hasActiveFilters && <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}><X className="h-3.5 w-3.5 mr-1" /> Clear</Button>}
          </div>

          {/* Per-option value filter chips */}
          {options.filter(o => o.values.filter(v => v.is_active && v.value.trim()).length > 0).map(opt => (
            <div key={opt.name} className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mr-1">{opt.name}:</span>
              {opt.values.filter(v => v.is_active && v.value.trim()).map(v => {
                const on = valueFilters[opt.name]?.has(v.value);
                return <button key={v.value} type="button" onClick={() => toggleValueFilter(opt.name, v.value)} className={cn("px-2 h-6 rounded-full text-xs border transition-colors", on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted text-muted-foreground border-border")}>{v.value}</button>;
              })}
            </div>
          ))}

          {/* Bulk action bar */}
          {selectedKeys.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <span className="text-xs font-medium">{selectedKeys.length} selected</span>
              <Input type="number" min={0} placeholder="Qty" value={bulkValue} onChange={e => setBulkValue(e.target.value)} className="h-7 w-20 text-sm" />
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyBulk("set")}>Set</Button>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyBulk("add")}>Add</Button>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyBulk("zero")}><PackageX className="h-3.5 w-3.5 mr-1" />Zero</Button>
              <span className="w-px h-5 bg-border mx-0.5" />
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyBulk("activate")}>Activate</Button>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyBulk("deactivate")}>Deactivate</Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => setSelected({})}>Clear selection</Button>
            </div>
          )}

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <div className="grid items-center gap-2 px-3 py-2 bg-muted/40 border-b text-[11px] font-medium text-muted-foreground uppercase tracking-wide" style={{ gridTemplateColumns: '28px 1fr 96px 110px 1fr 48px 52px' }}>
              <Checkbox checked={allVisibleSelected} onCheckedChange={c => toggleSelectAll(!!c)} className="mx-auto" />
              <span>Variant</span><span className="text-right">Stock</span><span>Price</span><span>SKU</span><span className="text-center">Active</span><span className="text-center">Default</span>
            </div>
            {sorted.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No variants match your filters.</div>
            ) : (
              <div className="divide-y max-h-[420px] overflow-y-auto">
                {sorted.map((r, ri) => {
                  const st = stockStatus(r.inventory || 0);
                  return (
                    <div key={r.combination_key} className={cn("grid items-center gap-2 px-3 py-1.5 hover:bg-muted/20", ri % 2 === 1 && "bg-muted/[0.04]", !r.is_active && "opacity-55")} style={{ gridTemplateColumns: '28px 1fr 96px 110px 1fr 48px 52px' }}>
                      <Checkbox checked={!!selected[r.combination_key]} onCheckedChange={c => setSelected(prev => ({ ...prev, [r.combination_key]: !!c }))} className="mx-auto" />
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(r.option_values).map(([n, v]) => (
                          <Badge key={n} variant="secondary" className="text-xs px-1.5 font-normal"><span className="text-muted-foreground mr-1">{n}:</span>{String(v)}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", st === "in" ? "bg-emerald-500" : st === "low" ? "bg-amber-500" : "bg-red-500")} />
                        <Input type="number" min={0} value={r.inventory} onChange={e => patchVariant(r.combination_key, { inventory: Math.max(0, parseInt(e.target.value || '0', 10) || 0) })} className="h-7 w-16 text-sm text-right" />
                      </div>
                      <span className="text-sm font-medium tabular-nums">{formatCurrency(convertCurrency(rowPriceALL(r), 'ALL', displayCurrency), displayCurrency)}</span>
                      <Input value={r.sku || ''} onChange={e => patchVariant(r.combination_key, { sku: e.target.value })} placeholder="SKU" className="h-7 text-sm" />
                      <div className="flex justify-center"><Switch checked={r.is_active} onCheckedChange={c => patchVariant(r.combination_key, { is_active: !!c })} className="scale-75" /></div>
                      <div className="flex justify-center"><Checkbox checked={r.is_default} onCheckedChange={() => setSingleDefault(r.combination_key)} /></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Variant price = base + option adjustments, shown in {displayCurrency}. Saving syncs the product's total stock automatically.</p>
        </section>
      )}
    </div>
  );
});

VariantsManager.displayName = "VariantsManager";
export default VariantsManager;
