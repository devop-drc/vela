import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Grid3X3, Package, Banknote, Tag } from "lucide-react";

export type VariantRecord = {
  id?: string;
  product_id: string;
  combination_key: string; // normalized key for quick lookups
  option_values: Record<string, string>; // { Color: "Red", Size: "M" }
  price_difference: number; // stored in ALL in DB; UI may show converted
  inventory: number;
  is_active: boolean;
  is_default: boolean;
  sku?: string | null;
};

interface VariantMatrixProps {
  productId: string;
  displayCurrency: string;
  convertCurrency: (amount: number | null | undefined, fromCurrency?: string, toCurrency?: string) => number;
}

// Helper cartesian product
const cartesian = (arrays: string[][]): string[][] => arrays.reduce<string[][]>((acc, curr) => {
  if (acc.length === 0) return curr.map(v => [v]);
  const out: string[][] = [];
  for (const a of acc) for (const b of curr) out.push([...a, b]);
  return out;
}, []);

const normalizeKey = (obj: Record<string, string>) => {
  return Object.keys(obj).sort().map(k => `${k}:${obj[k]}`).join("|");
};

const VariantMatrix = React.forwardRef(({ productId, displayCurrency, convertCurrency }: VariantMatrixProps, ref: any) => {
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<Array<{ name: string; values: string[] }>>([]);
  const [variants, setVariants] = useState<VariantRecord[]>([]);

  // Load options and existing variants
  useEffect(() => {
    const run = async () => {
      if (!productId) return;
      setLoading(true);
      // Load options for this product
      const { data: opts, error: optErr } = await supabase
        .from('product_options')
        .select(`name, option_values(value, is_active, inventory)`).eq('product_id', productId).order('display_order');

      const mapped = (opts || []).map((o: any) => ({
        name: o.name,
        values: (o.option_values || []).filter((v: any)=> v && typeof v.value === 'string')?.map((v: any) => String(v.value)) || []
      }));

      // Load existing variants
      const { data: existing, error: varErr } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId);

      const existingList: VariantRecord[] = (existing || []).map((r: any) => ({
        id: r.id,
        product_id: r.product_id,
        combination_key: r.combination_key,
        option_values: r.option_values || {},
        price_difference: r.price_difference || 0,
        inventory: r.inventory ?? 0,
        is_active: r.is_active ?? true,
        is_default: r.is_default ?? false,
        sku: r.sku || null,
      }));

      setOptions(mapped);
      setVariants(existingList);
      setLoading(false);
    };
    run();
  }, [productId]);

  const optionNames = useMemo(()=> options.map(o=>o.name), [options]);

  // Build all combinations for 2-3 options
  const combinations = useMemo(() => {
    const activeOptions = options.filter(o => o.values.length > 0);
    if (activeOptions.length < 2 || activeOptions.length > 3) return [] as Array<Record<string, string>>;
    const grids = activeOptions.map(o => o.values);
    const rows = cartesian(grids);
    const result: Array<Record<string, string>> = rows.map(row => {
      const obj: Record<string, string> = {};
      row.forEach((val, idx) => { obj[activeOptions[idx].name] = val; });
      return obj;
    });
    return result;
  }, [options]);

  // Merge with variants state; ensure each combo has a row entry
  const rows = useMemo(() => {
    return combinations.map((combo) => {
      const key = normalizeKey(combo);
      const existing = variants.find(v => v.combination_key === key);
      if (existing) return existing;
      return {
        product_id: productId,
        combination_key: key,
        option_values: combo,
        price_difference: 0,
        inventory: 0,
        is_active: false,
        is_default: false,
        sku: null,
      } as VariantRecord;
    });
  }, [combinations, variants, productId]);

  // Expose save
  const handleSaveVariants = useCallback(async () => {
    if (rows.length === 0) return true;
    // Enforce one default
    const defaultCount = rows.filter(r => r.is_default).length;
    if (defaultCount > 1) {
      // Keep only the first default
      const firstIdx = rows.findIndex(r => r.is_default);
      rows.forEach((r, i) => { if (i !== firstIdx) r.is_default = false; });
    }

    const payload = rows.map(r => ({
      id: r.id,
      product_id: r.product_id,
      combination_key: r.combination_key,
      option_values: r.option_values,
      price_difference: r.price_difference, // already in display? store back to ALL via convertCurrency?
      inventory: r.inventory,
      is_active: r.is_active,
      is_default: r.is_default,
      sku: r.sku || null,
    }));

    // Convert price_difference back to ALL
    payload.forEach(p => { p.price_difference = convertCurrency(p.price_difference, displayCurrency, 'ALL'); });

    const cleaned = payload.map(p => { const cp = { ...p } as any; if (!cp.id) delete cp.id; return cp; });
    const { error } = await supabase.from('product_variants').upsert(cleaned, { onConflict: 'id' });
    if (error) throw error;
    return true;
  }, [rows, displayCurrency, convertCurrency]);

  React.useImperativeHandle(ref, () => ({ handleSaveVariants }));

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Grid3X3 className="h-5 w-5" /> Variant Matrix</CardTitle></CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />Loading variants…</CardContent>
      </Card>
    );
  }

  // Only show when 2-3 options
  if (options.filter(o => o.values.length > 0).length < 2 || options.filter(o => o.values.length > 0).length > 3) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Grid3X3 className="h-5 w-5" /> Variant Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {optionNames.map(n => (<TableHead key={n} className="whitespace-nowrap">{n}</TableHead>))}
                <TableHead className="whitespace-nowrap"><Package className="inline h-4 w-4 mr-1" />Inventory</TableHead>
                <TableHead className="whitespace-nowrap"><Banknote className="inline h-4 w-4 mr-1" />Price Δ</TableHead>
                <TableHead className="whitespace-nowrap"><Tag className="inline h-4 w-4 mr-1" />SKU</TableHead>
                <TableHead className="whitespace-nowrap">Active</TableHead>
                <TableHead className="whitespace-nowrap">Default</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={row.combination_key}>
                  {optionNames.map(name => (
                    <TableCell key={name} className="capitalize">{row.option_values[name]}</TableCell>
                  ))}
                  <TableCell className="w-[110px]"><Input type="number" min={0} value={row.inventory} onChange={(e)=>{
                    const val = parseInt(e.target.value||'0',10); setVariants(prev=>{
                      const next = [...prev];
                      const i = next.findIndex(v=>v.combination_key===row.combination_key); if (i>=0) next[i] = { ...next[i], inventory: val }; else next.push({ ...row, inventory: val });
                      return next; });
                  }} /></TableCell>
                  <TableCell className="w-[140px]"><Input type="number" step="0.01" value={convertCurrency(row.price_difference, 'ALL', displayCurrency)} onChange={(e)=>{
                    const val = parseFloat(e.target.value||'0'); setVariants(prev=>{
                      const next = [...prev];
                      const i = next.findIndex(v=>v.combination_key===row.combination_key); if (i>=0) next[i] = { ...next[i], price_difference: convertCurrency(val, displayCurrency, 'ALL') }; else next.push({ ...row, price_difference: convertCurrency(val, displayCurrency, 'ALL') });
                      return next; });
                  }} /></TableCell>
                  <TableCell className="w-[160px]"><Input value={row.sku || ''} placeholder="SKU" onChange={(e)=>{
                    const val = e.target.value; setVariants(prev=>{
                      const next = [...prev];
                      const i = next.findIndex(v=>v.combination_key===row.combination_key); if (i>=0) next[i] = { ...next[i], sku: val }; else next.push({ ...row, sku: val });
                      return next; });
                  }} /></TableCell>
                  <TableCell className="w-[90px]"><Switch checked={row.is_active} onCheckedChange={(checked)=>{
                    setVariants(prev=>{ const next = [...prev]; const i = next.findIndex(v=>v.combination_key===row.combination_key); if (i>=0) next[i] = { ...next[i], is_active: !!checked }; else next.push({ ...row, is_active: !!checked }); return next; });
                  }} /></TableCell>
                  <TableCell className="w-[120px]">
                    <RadioGroup value={row.is_default ? 'yes' : 'no'} onValueChange={(val)=>{
                      setVariants(prev=>{
                        // Set only this row as default
                        const next = rows.map(r => ({ ...r, is_default: r.combination_key === row.combination_key }));
                        return next;
                      });
                    }} className="flex items-center gap-3">
                      <div className="flex items-center gap-1"><RadioGroupItem value="yes" id={`def-yes-${idx}`} /><Label htmlFor={`def-yes-${idx}`}>Yes</Label></div>
                      <div className="flex items-center gap-1"><RadioGroupItem value="no" id={`def-no-${idx}`} /><Label htmlFor={`def-no-${idx}`}>No</Label></div>
                    </RadioGroup>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="text-xs text-muted-foreground mt-2">Always visible when there are 2–3 option groups.</div>
      </CardContent>
    </Card>
  );
});

VariantMatrix.displayName = 'VariantMatrix';

export default VariantMatrix;
