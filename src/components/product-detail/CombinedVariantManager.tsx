import React, { useCallback, useImperativeHandle, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Grid3X3, Package, Banknote, Tag, Search, ChevronDown, Settings2, Check } from "lucide-react";

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

export interface CombinedVariantManagerProps {
  productId: string;
  basePriceALL: number; // product.price in ALL
  displayCurrency: string;
  convertCurrency: (amount: number | null | undefined, fromCurrency?: string, toCurrency?: string) => number;
}

const cartesian = (arrays: string[][]): string[][] => arrays.reduce<string[][]>((acc, curr) => {
  if (acc.length === 0) return curr.map(v => [v]);
  const out: string[][] = [];
  for (const a of acc) for (const b of curr) out.push([...a, b]);
  return out;
}, []);

const normalizeKey = (obj: Record<string, string>) => Object.keys(obj).sort().map(k => `${k}:${obj[k]}`).join("|");

const autoSku = (base: string, obj: Record<string, string>) => {
  const parts = Object.keys(obj).sort().map(k => `${obj[k]}`.replace(/\s+/g,'').slice(0,6).toUpperCase());
  return `${base}-${parts.join('-')}`.replace(/--+/g,'-').slice(0,48);
};

const CombinedVariantManager = React.forwardRef(({ productId, basePriceALL, displayCurrency, convertCurrency }: CombinedVariantManagerProps, ref: any) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);

  // Load initial options and variants
  React.useEffect(() => {
    const run = async () => {
      if (!productId) return;
      setLoading(true);
      // options
      const { data: optRows, error: optLoadErr } = await supabase
        .from('product_options')
        .select(`id, name, display_order, option_values(id, value, price_difference, is_active, is_default, inventory, display_order)`) // inventory stored on value for preview
        .eq('product_id', productId)
        .order('display_order');
      const mapped: ProductOption[] = (optRows || []).map((o: any) => ({
        id: o.id,
        name: o.name,
        display_order: o.display_order,
        values: (o.option_values||[]).map((v: any)=>({ id: v.id, value: v.value, price_difference: v.price_difference||0, is_active: v.is_active ?? true, is_default: v.is_default ?? false, inventory: v.inventory ?? 0 }))
      }));

      // variants
      const { data: varRows, error: varLoadErr } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId);
      const mappedVars: VariantRow[] = (varRows||[]).map((r:any)=>({ id: r.id, product_id: r.product_id, combination_key: r.combination_key, option_values: r.option_values||{}, price_difference: r.price_difference||0, inventory: r.inventory??0, is_active: r.is_active??true, is_default: r.is_default??false, sku: r.sku||null }));

      setOptions(mapped);
      setVariants(mappedVars);
      setLoading(false);
    };
    run();
  }, [productId]);

  // Simple options editor: name + list of values with price diff and delete
  const addOption = () => setOptions(prev => [...prev, { name: `Option ${prev.length+1}`, values: [] }]);
  const addValue = (idx: number) => setOptions(prev => { const next=[...prev]; next[idx] = { ...next[idx], values: [...next[idx].values, { value: '', price_difference: 0, is_active: true, is_default: next[idx].values.length===0 }]}; return next; });
  const removeOption = (idx: number) => setOptions(prev => prev.filter((_,i)=>i!==idx));
  const removeValue = (iOpt: number, iVal: number) => setOptions(prev => { const next=[...prev]; next[iOpt] = { ...next[iOpt], values: next[iOpt].values.filter((_,j)=>j!==iVal) }; return next; });

  // Build combinations from active values
  const activeOptionNames = useMemo(()=> options.filter(o=>o.values.length>0).map(o=>o.name), [options]);
  const combinations = useMemo(()=>{
    const active = options.map(o => o.values.filter(v=>v.is_active).map(v=>v.value)).filter(arr=>arr.length>0);
    if (active.length < 2 || active.length > 3) return [] as Array<Record<string,string>>;
    return cartesian(active).map(row => {
      const obj: Record<string,string> = {};
      row.forEach((val, idx) => { const name = options.filter(o=>o.values.filter(v=>v.is_active).length>0)[idx].name; obj[name]=val; });
      return obj;
    });
  }, [options]);

  // Merge to variant rows
  const rows = useMemo(()=>{
    return combinations.map(combo => {
      const key = normalizeKey(combo);
      const ex = variants.find(v=>v.combination_key===key);
      if (ex) return ex;
      return { product_id: productId, combination_key: key, option_values: combo, price_difference: 0, inventory: 0, is_active: true, is_default: false, sku: autoSku('SKU', combo) } as VariantRow;
    });
  }, [combinations, variants, productId]);

  // Table controls
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<string | 'none'>(activeOptionNames[0] || 'none');
  React.useEffect(()=>{ if (!activeOptionNames.includes(groupBy)) setGroupBy(activeOptionNames[0]||'none'); }, [activeOptionNames, groupBy]);

  // Sorting
  type SortKey = 'inventory' | 'price' | 'sku' | `opt:${string}`;
  const [sortKey, setSortKey] = useState<SortKey>('inventory');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');

  const filtered = useMemo(()=>{
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter(r => Object.values(r.option_values).join(' ').toLowerCase().includes(s) || (r.sku||'').toLowerCase().includes(s));
  }, [rows, search]);

  const sorted = useMemo(()=>{
    const list = [...filtered];
    list.sort((a, b) => {
      const cmp = (x: number | string, y: number | string) => x < y ? -1 : x > y ? 1 : 0;
      if (sortKey === 'inventory') return (sortDir==='asc'?1:-1) * cmp(a.inventory, b.inventory);
      if (sortKey === 'sku') return (sortDir==='asc'?1:-1) * cmp(a.sku||'', b.sku||'');
      if (sortKey === 'price') {
        const pa = rowDisplayPrice(a); const pb = rowDisplayPrice(b);
        return (sortDir==='asc'?1:-1) * cmp(pa, pb);
      }
      if (sortKey.startsWith('opt:')) {
        const name = sortKey.slice(4);
        return (sortDir==='asc'?1:-1) * cmp(a.option_values[name]||'', b.option_values[name]||'');
      }
      return 0;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const toggleSelectAll = (checked: boolean) => {
    const map: Record<string, boolean> = {};
    filtered.forEach(r=> map[r.combination_key]=checked);
    setSelected(map);
  };

  const bulkSet = (patch: Partial<VariantRow>) => {
    const keys = new Set(Object.keys(selected).filter(k => selected[k]));
    setVariants(prev => {
      const next = [...prev];
      sorted.forEach(r => {
        if (keys.has(r.combination_key)) {
          const i = next.findIndex(v => v.combination_key===r.combination_key);
          if (i>=0) next[i] = { ...next[i], ...patch };
          else next.push({ ...r, ...patch });
        }
      });
      return next;
    });
  };

  // Save handler
  const handleSave = useCallback(async ()=>{
    // 1) Save options and values
    // Upsert options
    const { data: { user } = {} } = await supabase.auth.getUser();
    const optionPayload = options.map((o, idx) => ({ id: o.id, product_id: productId, name: o.name, display_order: idx, ...(user ? { user_id: user.id } : {}) }));
    const cleanOptions = optionPayload.map(o=>{ const c:any={...o}; if(!c.id) delete c.id; return c; });
    // Explicit onConflict for id; select ids back for mapping
    let { data: upsertedOptions, error: optErr } = await supabase.from('product_options').upsert(cleanOptions, { onConflict: 'id' }).select('id, name');
    if (optErr && user) {
      // Retry without user_id field in case the column doesn't exist
      const retryOptions = options.map((o, idx) => ({ id: o.id, product_id: productId, name: o.name, display_order: idx }));
      const retryClean = retryOptions.map(o=>{ const c:any={...o}; if(!c.id) delete c.id; return c; });
      const retry = await supabase.from('product_options').upsert(retryClean, { onConflict: 'id' }).select('id, name');
      upsertedOptions = retry.data as any;
      optErr = retry.error as any;
    }
    if (optErr) throw optErr;
    const idMap: Record<string,string> = {};
    upsertedOptions?.forEach((r: { id: string; name: string })=>{ idMap[r.name]=r.id });

    // Upsert values
    const valueRows: Array<{ id?: string; option_id: string; value: string; price_difference: number; is_active: boolean; is_default: boolean; display_order: number; product_id?: string; user_id?: string }>= [];
    options.forEach((o, idx) => {
      const option_id = idMap[o.name] || o.id;
      o.values.forEach((v, vidx) => {
        valueRows.push({ id: v.id, option_id: option_id as string, value: v.value, price_difference: v.price_difference, is_active: v.is_active, is_default: v.is_default, display_order: vidx, ...(user ? { user_id: user.id } : {}), product_id: productId });
      });
    });
    const cleanValues = valueRows.map(v=>{ const c:any={...v}; if(!c.id) delete c.id; return c; });
    let { error: valErr } = await supabase.from('option_values').upsert(cleanValues, { onConflict: 'id' });
    if (valErr && user) {
      // Retry without user_id/product_id columns if RLS/schema mismatches
      const retryValues = valueRows.map(({ id, option_id, value, price_difference, is_active, is_default, display_order }) => ({ id, option_id, value, price_difference, is_active, is_default, display_order })) as any[];
      const retry = await supabase.from('option_values').upsert(retryValues, { onConflict: 'id' });
      valErr = retry.error as any;
    }
    if (valErr) throw valErr;

    // 2) Save variants: enforce single default
    const orderedRows = [...rows];
    const defaultIdx = orderedRows.findIndex(r=>r.is_default);
    if (defaultIdx>=0) {
      orderedRows.forEach((r, i)=>{ if (i!==defaultIdx) r.is_default = false; });
    }
    const variantPayload = orderedRows.map(r => ({
      id: r.id,
      product_id: r.product_id,
      combination_key: r.combination_key,
      option_values: r.option_values,
      price_difference: r.price_difference,
      inventory: r.inventory,
      is_active: r.is_active,
      is_default: r.is_default,
      sku: r.sku || autoSku('SKU', r.option_values),
      ...(user ? { user_id: user.id } : {}),
    }));
    const cleanVariants = variantPayload.map(v=>{ const c:any={...v}; if(!c.id) delete c.id; return c; });
    let { error: varErr } = await supabase.from('product_variants').upsert(cleanVariants, { onConflict: 'id' });
    if (varErr && user) {
      const retryVariants = orderedRows.map(r => ({ id: r.id, product_id: r.product_id, combination_key: r.combination_key, option_values: r.option_values, price_difference: r.price_difference, inventory: r.inventory, is_active: r.is_active, is_default: r.is_default, sku: r.sku || autoSku('SKU', r.option_values) }));
      const retry = await supabase.from('product_variants').upsert(retryVariants as any[], { onConflict: 'id' });
      varErr = retry.error as any;
    }
    if (varErr) throw varErr;

    return true;
  }, [options, rows, productId, convertCurrency, displayCurrency, basePriceALL]);

  useImperativeHandle(ref, ()=>({ handleSaveCombined: handleSave }));

  // Price computations for display
  const rowDisplayPrice = (r: VariantRow) => {
    // Sum price diffs by matching selected values in options list
    let deltaALL = 0;
    Object.entries(r.option_values).forEach(([optName, val]) => {
      const opt = options.find(o=>o.name===optName);
      const v = opt?.values.find(x=>x.value===val);
      if (v) deltaALL += v.price_difference||0;
    });
    const totalALL = basePriceALL + deltaALL + (r.price_difference||0);
    return convertCurrency(totalALL, 'ALL', displayCurrency);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-5 w-5" /> Options</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {options.map((opt, idx)=>(
            <div key={idx} className="border rounded-md p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Label className="w-20">Name</Label>
                <div className="relative max-w-xs flex-1">
                  <Tag className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={opt.name} onChange={(e)=> setOptions(prev=>{ const next=[...prev]; next[idx] = { ...next[idx], name: e.target.value }; return next; })} className="pl-8" placeholder="e.g., Color" />
                </div>
                <Button variant="ghost" size="icon" onClick={()=>removeOption(idx)} title="Delete option"><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2">
                {opt.values.map((v, vidx)=>(
                  <div key={vidx} className="flex items-center gap-2">
                    <div className="relative max-w-[220px] w-full">
                      <Tag className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Value" value={v.value} onChange={(e)=> setOptions(prev=>{ const next=[...prev]; const vals=[...next[idx].values]; vals[vidx] = { ...vals[vidx], value: e.target.value }; next[idx] = { ...next[idx], values: vals }; return next; })} className="pl-8" />
                    </div>
                    <div className="relative w-44">
                      <Banknote className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="number" step="0.01" placeholder="Price Δ (ALL)" value={v.price_difference} onChange={(e)=> setOptions(prev=>{ const next=[...prev]; const vals=[...next[idx].values]; vals[vidx] = { ...vals[vidx], price_difference: parseFloat(e.target.value||'0') }; next[idx] = { ...next[idx], values: vals }; return next; })} className="pl-8" />
                    </div>
                    <Switch checked={v.is_active} onCheckedChange={(c)=> setOptions(prev=>{ const next=[...prev]; const vals=[...next[idx].values]; vals[vidx] = { ...vals[vidx], is_active: !!c }; next[idx] = { ...next[idx], values: vals }; return next; })} />
                    <Label>Active</Label>
                    <Checkbox checked={v.is_default} onCheckedChange={(c)=> setOptions(prev=>{ const next=[...prev]; const vals=next[idx].values.map((vv, i)=> ({ ...vv, is_default: i===vidx })); next[idx] = { ...next[idx], values: vals }; return next; })} />
                    <Label>Default</Label>
                    <Button variant="ghost" size="icon" onClick={()=>removeValue(idx, vidx)} title="Delete value"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={()=>addValue(idx)}><Plus className="h-4 w-4 mr-1" />Add value</Button>
              </div>
            </div>
          ))}
          <Button onClick={addOption}><Plus className="h-4 w-4 mr-1" />Add option</Button>
          <div className="text-xs text-muted-foreground">Enter price differences in ALL. Variants table will reflect total in {displayCurrency}.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Grid3X3 className="h-5 w-5" /> Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search variants..." value={search} onChange={(e)=>setSearch(e.target.value)} className="pl-8 w-64" />
            </div>
            <div className="flex items-center gap-2">
              <Label>Group by</Label>
              <Select value={groupBy} onValueChange={setGroupBy as any}>
                <SelectTrigger className="w-40"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {activeOptionNames.map(n=> (<SelectItem key={n} value={n}>{n}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label>Sort</Label>
              <Select value={sortKey} onValueChange={(v)=> setSortKey(v as SortKey)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="sku">SKU</SelectItem>
                  {activeOptionNames.map(n=> (<SelectItem key={`opt:${n}`} value={`opt:${n}`}>By {n}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={sortDir} onValueChange={(v)=> setSortDir(v as 'asc'|'desc')}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Asc</SelectItem>
                  <SelectItem value="desc">Desc</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={()=>bulkSet({ is_active: true })}>Activate</Button>
              <Button variant="outline" size="sm" onClick={()=>bulkSet({ is_active: false })}>Deactivate</Button>
              <Button variant="outline" size="sm" onClick={()=>bulkSet({ inventory: 0 })}>Set Inv 0</Button>
            </div>
          </div>

          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={filtered.length>0 && filtered.every(r=>selected[r.combination_key])} onCheckedChange={(c)=>toggleSelectAll(!!c)} /></TableHead>
                  {activeOptionNames.map(n=> (<TableHead key={n} className="whitespace-nowrap">{n}</TableHead>))}
                  <TableHead className="whitespace-nowrap"><Package className="inline h-4 w-4 mr-1" />Inventory</TableHead>
                  <TableHead className="whitespace-nowrap"><Banknote className="inline h-4 w-4 mr-1" />Price</TableHead>
                  <TableHead className="whitespace-nowrap"><Tag className="inline h-4 w-4 mr-1" />SKU</TableHead>
                  <TableHead className="whitespace-nowrap">Active</TableHead>
                  <TableHead className="whitespace-nowrap">Default</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(groupBy !== 'none' ? Array.from(new Map<string, VariantRow[]>(sorted.map(r=> [r.option_values[groupBy]||'—', []])).keys()) : [null]).flatMap(groupVal => {
                  const groupRows = groupBy === 'none' ? sorted : sorted.filter(r => (r.option_values[groupBy]||'—') === groupVal);
                  const headerRow = groupBy === 'none' ? null : (
                    <TableRow key={`g-${groupVal}`} className="bg-muted/40">
                      <TableCell colSpan={activeOptionNames.length + 6} className="font-semibold">{groupBy}: <span className="capitalize">{groupVal}</span> <Badge variant="secondary" className="ml-2">{groupRows.length}</Badge></TableCell>
                    </TableRow>
                  );
                  const bodyRows = groupRows.map((r)=>{
                  const priceDisp = rowDisplayPrice(r);
                  return (
                    <TableRow key={r.combination_key}>
                      <TableCell className="w-10"><Checkbox checked={!!selected[r.combination_key]} onCheckedChange={(c)=> setSelected(prev=>({ ...prev, [r.combination_key]: !!c }))} /></TableCell>
                      {activeOptionNames.map(n=> (<TableCell key={n} className="capitalize">{r.option_values[n]}</TableCell>))}
                      <TableCell className="w-[110px]"><Input type="number" min={0} value={r.inventory} onChange={(e)=>{ const val=parseInt(e.target.value||'0',10); setVariants(prev=>{ const next=[...prev]; const i=next.findIndex(v=>v.combination_key===r.combination_key); if(i>=0) next[i]={...next[i], inventory: val}; else next.push({...r, inventory: val}); return next; }); }} /></TableCell>
                      <TableCell className="w-[140px] font-medium">{priceDisp.toFixed(2)} {displayCurrency}</TableCell>
                      <TableCell className="w-[180px]"><Input value={r.sku||''} onChange={(e)=>{ const val=e.target.value; setVariants(prev=>{ const next=[...prev]; const i=next.findIndex(v=>v.combination_key===r.combination_key); if(i>=0) next[i]={...next[i], sku: val}; else next.push({...r, sku: val}); return next; }); }} placeholder="SKU" /></TableCell>
                      <TableCell className="w-[90px]"><Switch checked={r.is_active} onCheckedChange={(c)=> setVariants(prev=>{ const next=[...prev]; const i=next.findIndex(v=>v.combination_key===r.combination_key); if(i>=0) next[i]={...next[i], is_active: !!c}; else next.push({...r, is_active: !!c}); return next; })} /></TableCell>
                      <TableCell className="w-[120px]"><Checkbox checked={r.is_default} onCheckedChange={(c)=> setVariants(prev=>{ // unique default
                        const next = rows.map(x=> ({ ...x, is_default: x.combination_key===r.combination_key })); return next; })} /></TableCell>
                    </TableRow>
                  );
                  });
                  return [headerRow, ...bodyRows].filter(Boolean) as React.ReactNode[];
                })}
              </TableBody>
            </Table>
          </div>
          <div className="text-xs text-muted-foreground">Price shown = Base + option diffs (+ variant-specific diff if any), converted to {displayCurrency}.</div>
        </CardContent>
      </Card>
    </div>
  );
});

CombinedVariantManager.displayName = 'CombinedVariantManager';

export default CombinedVariantManager;
