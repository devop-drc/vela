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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Grid3X3, Package, Banknote, Tag, Search, Settings2, GripVertical, Info, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { currencies } from "@/lib/currencies";

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
  // Track initially loaded IDs for delete detection
  const initialOptionIdsRef = React.useRef<Set<string>>(new Set());
  const initialValueIdsRef = React.useRef<Set<string>>(new Set());

  const currencySymbol = useMemo(() => {
    return currencies.find(c => c.code === displayCurrency)?.symbol || displayCurrency;
  }, [displayCurrency]);

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
        .order('display_order')
        .order('display_order', { foreignTable: 'option_values' });
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
      // capture initial ids
      initialOptionIdsRef.current = new Set((optRows||[]).map((o:any)=>o.id).filter(Boolean));
      const valIds: string[] = [];
      (optRows||[]).forEach((o:any)=> (o.option_values||[]).forEach((v:any)=> v.id && valIds.push(v.id)));
      initialValueIdsRef.current = new Set(valIds);
      setVariants(mappedVars);
      setLoading(false);
    };
    run();
  }, [productId]);

  // Simple options editor: name + list of values with price diff and delete
  const addOption = () => setOptions(prev => [...prev, { name: `Option ${prev.length+1}`, values: [] }]);
  const addValue = (idx: number) => setOptions(prev => { const next=[...prev]; next[idx] = { ...next[idx], values: [...next[idx].values, { value: '', price_difference: 0, is_active: true, is_default: next[idx].values.length===0, inventory: 0 }]}; return next; });
  const removeOption = (idx: number) => setOptions(prev => prev.filter((_,i)=>i!==idx));
  const removeValue = (iOpt: number, iVal: number) => setOptions(prev => { const next=[...prev]; next[iOpt] = { ...next[iOpt], values: next[iOpt].values.filter((_,j)=>j!==iVal) }; return next; });
  // Drag & drop reordering
  const [dragOptIndex, setDragOptIndex] = useState<number | null>(null);
  const [dragVal, setDragVal] = useState<{ opt: number; idx: number } | null>(null);
  const onOptionDragStart = (idx: number) => setDragOptIndex(idx);
  const onOptionDrop = (idx: number) => {
    if (dragOptIndex === null || dragOptIndex === idx) return;
    setOptions(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragOptIndex, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragOptIndex(null);
  };
  const onValueDragStart = (optIdx: number, valIdx: number) => setDragVal({ opt: optIdx, idx: valIdx });
  const onValueDrop = (optIdx: number, valIdx: number) => {
    if (!dragVal || dragVal.opt !== optIdx || dragVal.idx === valIdx) return;
    setOptions(prev => {
      const next = [...prev];
      const vals = [...next[optIdx].values];
      const [moved] = vals.splice(dragVal.idx, 1);
      vals.splice(valIdx, 0, moved);
      next[optIdx] = { ...next[optIdx], values: vals };
      return next;
    });
    setDragVal(null);
  };

  // Build combinations from active values
  const activeOptionNames = useMemo(()=> options.filter(o=>o.values.length>0).map(o=>o.name), [options]);
  const combinations = useMemo(()=>{
    const active = options.map(o => o.values.filter(v=>v.is_active).map(v=>v.value)).filter(arr=>arr.length>0);
    if (active.length < 1 || active.length > 5) return [] as Array<Record<string,string>>;
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

  // Regenerate variants from current options (force rebuild)
  const regenerateVariants = () => {
    const newVariants = combinations.map(combo => {
      const key = normalizeKey(combo);
      const ex = variants.find(v => v.combination_key === key);
      if (ex) return ex;
      return { product_id: productId, combination_key: key, option_values: combo, price_difference: 0, inventory: 0, is_active: true, is_default: false, sku: autoSku('SKU', combo) } as VariantRow;
    });
    setVariants(newVariants);
  };

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
        const pa = rowDisplayPrice(a) ?? 0; const pb = rowDisplayPrice(b) ?? 0;
        return (sortDir==='asc'?1:-1) * cmp(pa, pb);
      }
      if (sortKey.startsWith('opt:')) {
        const name = sortKey.slice(4);
        const av = a.option_values[name]||'';
        const bv = b.option_values[name]||'';
        const an = parseFloat(av as string);
        const bn = parseFloat(bv as string);
        const bothNumeric = !isNaN(an) && !isNaN(bn);
        return (sortDir==='asc'?1:-1) * (bothNumeric ? cmp(an, bn) : cmp((av as string).toLowerCase(), (bv as string).toLowerCase()));
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
    // Require auth user for tables with NOT NULL user_id
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) throw new Error("You're not signed in. Please sign in to save options and variants.");
    // 1) Save options and values
    // Upsert options
    // Split: updates (with id) vs inserts (without id)
    const toUpdateOpts = options.filter(o=>!!o.id).map((o, idx)=> ({ id: o.id!, product_id: productId, name: o.name, display_order: idx }));
    const toInsertOpts = options.filter(o=>!o.id).map((o, idx)=> ({ product_id: productId, name: o.name, display_order: idx }));

    if (toUpdateOpts.length) {
      const { error } = await supabase.from('product_options').upsert(toUpdateOpts, { onConflict: 'id' });
      if (error) throw error;
    }
    let insertedOpts: Array<{ id: string; name: string }> = [];
    if (toInsertOpts.length) {
      // Use upsert on unique (product_id, name) to avoid duplicate conflicts
      const { data, error } = await supabase.from('product_options').upsert(toInsertOpts, { onConflict: 'product_id,name' }).select('id, name');
      if (error) throw error;
      insertedOpts = data as Array<{ id: string; name: string }>;
    }
    const upsertedOptions = [
      ...options.filter(o=>!!o.id).map(o=> ({ id: o.id!, name: o.name })),
      ...insertedOpts,
    ];
    const idMap: Record<string,string> = {};
    upsertedOptions?.forEach((r: { id: string; name: string })=>{ idMap[r.name]=r.id });

    // Upsert values (including inventory!)
    const valueRows: Array<{ id?: string; option_id: string; value: string; price_difference: number; inventory: number; is_active: boolean; is_default: boolean; display_order: number }>= [];
    options.forEach((o, idx) => {
      const option_id = idMap[o.name] || o.id;
      o.values.forEach((v, vidx) => {
        valueRows.push({ id: v.id, option_id: option_id as string, value: v.value, price_difference: v.price_difference, inventory: v.inventory ?? 0, is_active: v.is_active, is_default: v.is_default, display_order: vidx });
      });
    });
    // Deletes: values removed
    const currentValueIds = new Set(valueRows.map(v=>v.id).filter(Boolean) as string[]);
    const toDeleteValueIds = Array.from(initialValueIdsRef.current).filter(id => !currentValueIds.has(id));
    if (toDeleteValueIds.length) {
      const { error } = await supabase.from('option_values').delete().in('id', toDeleteValueIds);
      if (error) throw error;
    }
    const toUpdateVals = valueRows.filter(v=>!!v.id) as Array<Required<typeof valueRows[number]>>;
    const toInsertVals = valueRows.filter(v=>!v.id).map(({ id, ...rest })=> rest);
    if (toUpdateVals.length) {
      const { error } = await supabase.from('option_values').upsert(toUpdateVals as any[], { onConflict: 'id' });
      if (error) throw error;
    }
    if (toInsertVals.length) {
      // Avoid duplicates by upserting on (option_id, value)
      const { error } = await supabase.from('option_values').upsert(toInsertVals as any[], { onConflict: 'option_id,value' });
      if (error) throw error;
    }

    // Deletes: options removed (after values to avoid FK issues)
    const currentOptionIds = new Set(Object.values(idMap));
    const toDeleteOptionIds = Array.from(initialOptionIdsRef.current).filter(id => !currentOptionIds.has(id));
    if (toDeleteOptionIds.length) {
      const { error } = await supabase.from('product_options').delete().in('id', toDeleteOptionIds);
      if (error) throw error;
    }

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
    }));
    const cleanVariants = variantPayload.map(v=>{ const c:any={...v}; if(!c.id) delete c.id; return c; });
    let { error: varErr } = await supabase.from('product_variants').upsert(cleanVariants, { onConflict: 'id' });
    if (varErr && user) {
      const retryVariantsRaw = orderedRows.map(r => ({ id: r.id, product_id: r.product_id, combination_key: r.combination_key, option_values: r.option_values, price_difference: r.price_difference, inventory: r.inventory, is_active: r.is_active, is_default: r.is_default, sku: r.sku || autoSku('SKU', r.option_values) }));
      const retryVariants = retryVariantsRaw.map(v=>{ const c:any={...v}; if(!c.id) delete c.id; return c; });
      const retry = await supabase.from('product_variants').upsert(retryVariants as any[], { onConflict: 'id' });
      varErr = retry.error as any;
    }
    if (varErr) throw varErr;

    // refresh initial IDs after successful save
    initialOptionIdsRef.current = new Set(currentOptionIds);
    initialValueIdsRef.current = new Set((await (async()=>{ return valueRows.map(v=>v.id).filter(Boolean) as string[]; })()));
    return true;
  }, [options, rows, productId, convertCurrency, displayCurrency, basePriceALL]);

  useImperativeHandle(ref, ()=>({ handleSaveCombined: handleSave }));

  // Price computations for display
  const rowDisplayPrice = (r: VariantRow) => {
    // Sum price diffs by matching selected values in options list
    try {
      let deltaALL = 0;
      Object.entries(r.option_values||{}).forEach(([optName, val]) => {
        const opt = options.find(o=>o.name===optName);
        const v = opt?.values.find(x=>x.value===val);
        if (v) deltaALL += v.price_difference||0;
      });
      const totalALL = (basePriceALL||0) + deltaALL + (r.price_difference||0);
      const converted = convertCurrency(totalALL, 'ALL', displayCurrency);
      return isFinite(converted) ? converted : 0;
    } catch {
      return 0;
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalValues = options.reduce((sum, o) => sum + o.values.length, 0);

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-3">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <span className="font-medium">Options</span> are attributes customers choose (like Color or Size). Each combination of option values creates a <span className="font-medium">variant</span> with its own price and inventory.
        </p>
      </div>

      <Tabs defaultValue="options" className="w-full">
        <TabsList className="grid grid-cols-2 w-full md:w-auto">
          <TabsTrigger value="options" className="text-sm gap-1.5">
            <Settings2 className="h-4 w-4" />
            Options
            {options.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{options.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="variants" className="text-sm gap-1.5">
            <Grid3X3 className="h-4 w-4" />
            Variants
            {rows.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{rows.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ===================== OPTIONS TAB ===================== */}
        <TabsContent value="options" className="mt-4">
          <div className="space-y-4">
            {options.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Settings2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <h3 className="text-base font-medium mb-1">No options yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    Options let customers choose between different versions of your product. Add your first option to get started.
                  </p>
                  <Button type="button" onClick={addOption} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first option
                  </Button>
                </CardContent>
              </Card>
            )}

            {options.map((opt, idx) => (
              <Card
                key={idx}
                className="overflow-hidden"
                draggable
                onDragStart={() => onOptionDragStart(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onOptionDrop(idx)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`opt-name-${idx}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Option name
                      </Label>
                      <div className="relative max-w-sm">
                        <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id={`opt-name-${idx}`}
                          value={opt.name}
                          onChange={(e) => setOptions(prev => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], name: e.target.value };
                            return next;
                          })}
                          className="pl-9"
                          placeholder="e.g., Color, Size, Material"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Values customers can choose from (e.g., Red, Blue, Green)
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(idx)}
                      title="Delete option"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {opt.values.length === 0 ? (
                    <div className="rounded-md border border-dashed p-6 text-center">
                      <p className="text-sm text-muted-foreground mb-3">No values yet. Add values like "Small", "Medium", "Large".</p>
                      <Button type="button" size="sm" variant="outline" onClick={() => addValue(idx)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add first value
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {opt.values.map((v, vidx) => (
                        <div
                          key={vidx}
                          className="rounded-lg border bg-card p-3 transition-colors hover:bg-muted/30"
                          draggable
                          onDragStart={() => onValueDragStart(idx, vidx)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => onValueDrop(idx, vidx)}
                        >
                          <div className="flex items-start gap-3">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab mt-2.5 shrink-0" />

                            {/* Value name */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <Label className="text-xs text-muted-foreground">Value</Label>
                              <Input
                                placeholder="e.g., Red, Large, Cotton"
                                value={v.value}
                                onChange={(e) => setOptions(prev => {
                                  const next = [...prev];
                                  const vals = [...next[idx].values];
                                  vals[vidx] = { ...vals[vidx], value: e.target.value };
                                  next[idx] = { ...next[idx], values: vals };
                                  return next;
                                })}
                              />
                            </div>

                            {/* Price adjustment */}
                            <div className="w-36 space-y-1 shrink-0">
                              <Label className="text-xs text-muted-foreground">Price adjustment</Label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                                  {currencySymbol}
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={convertCurrency(v.price_difference || 0, 'ALL', displayCurrency)}
                                  onChange={(e) => setOptions(prev => {
                                    const next = [...prev];
                                    const vals = [...next[idx].values];
                                    const entered = parseFloat(e.target.value || '0');
                                    const backToALL = convertCurrency(entered, displayCurrency, 'ALL');
                                    vals[vidx] = { ...vals[vidx], price_difference: isFinite(backToALL) ? backToALL : 0 };
                                    next[idx] = { ...next[idx], values: vals };
                                    return next;
                                  })}
                                  className="pl-8"
                                />
                              </div>
                            </div>

                            {/* Inventory */}
                            <div className="w-24 space-y-1 shrink-0">
                              <Label className="text-xs text-muted-foreground">Inventory</Label>
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={v.inventory ?? 0}
                                onChange={(e) => setOptions(prev => {
                                  const next = [...prev];
                                  const vals = [...next[idx].values];
                                  vals[vidx] = { ...vals[vidx], inventory: parseInt(e.target.value || '0', 10) };
                                  next[idx] = { ...next[idx], values: vals };
                                  return next;
                                })}
                              />
                            </div>

                            {/* Controls */}
                            <div className="flex items-end gap-3 pb-0.5 shrink-0">
                              <div className="flex flex-col items-center gap-1">
                                <Label className="text-xs text-muted-foreground">Active</Label>
                                <Switch
                                  checked={v.is_active}
                                  onCheckedChange={(c) => setOptions(prev => {
                                    const next = [...prev];
                                    const vals = [...next[idx].values];
                                    vals[vidx] = { ...vals[vidx], is_active: !!c };
                                    next[idx] = { ...next[idx], values: vals };
                                    return next;
                                  })}
                                />
                              </div>
                              <div className="flex flex-col items-center gap-1">
                                <Label className="text-xs text-muted-foreground">Default</Label>
                                <Checkbox
                                  checked={v.is_default}
                                  onCheckedChange={(c) => setOptions(prev => {
                                    const next = [...prev];
                                    const vals = next[idx].values.map((vv, i) => ({ ...vv, is_default: i === vidx }));
                                    next[idx] = { ...next[idx], values: vals };
                                    return next;
                                  })}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeValue(idx, vidx)}
                                title="Delete value"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <Button type="button" size="sm" variant="outline" onClick={() => addValue(idx)} className="mt-2">
                        <Plus className="h-4 w-4 mr-1" />
                        Add value
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Add option card */}
            {options.length > 0 && (
              <button
                type="button"
                onClick={addOption}
                className="w-full rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 p-6 text-center transition-colors group"
              >
                <Plus className="h-6 w-6 text-muted-foreground/50 group-hover:text-muted-foreground mx-auto mb-2 transition-colors" />
                <span className="block text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  Add Option
                </span>
                <span className="block text-xs text-muted-foreground/70 mt-1">
                  Add a new customer-selectable option like Color, Size, or Material
                </span>
              </button>
            )}
          </div>
        </TabsContent>

        {/* ===================== VARIANTS TAB ===================== */}
        <TabsContent value="variants" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              {rows.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Grid3X3 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <h3 className="text-base font-medium mb-1">No variants yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Add at least one option with values to generate variants. Each combination of option values becomes a variant.
                  </p>
                </div>
              ) : (
                <>
                  {/* Compact toolbar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[180px] max-w-xs">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search variants..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
                    </div>
                    <Select value={groupBy} onValueChange={setGroupBy as any}>
                      <SelectTrigger className="w-32 h-9 text-sm">
                        <SelectValue placeholder="Group by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No grouping</SelectItem>
                        {activeOptionNames.map(n => (<SelectItem key={n} value={n}>Group: {n}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                      <SelectTrigger className="w-32 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inventory">Sort: Inventory</SelectItem>
                        <SelectItem value="price">Sort: Price</SelectItem>
                        <SelectItem value="sku">Sort: SKU</SelectItem>
                        {activeOptionNames.map(n => (<SelectItem key={`opt:${n}`} value={`opt:${n}`}>Sort: {n}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Select value={sortDir} onValueChange={(v) => setSortDir(v as 'asc' | 'desc')}>
                      <SelectTrigger className="w-20 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Asc</SelectItem>
                        <SelectItem value="desc">Desc</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="sm" onClick={regenerateVariants} title="Regenerate variants from current options" className="h-9">
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Regenerate
                    </Button>

                    {Object.values(selected).some(Boolean) && (
                      <div className="ml-auto flex items-center gap-1.5">
                        <Button variant="outline" size="sm" className="h-9" onClick={() => bulkSet({ is_active: true })}>Activate</Button>
                        <Button variant="outline" size="sm" className="h-9" onClick={() => bulkSet({ is_active: false })}>Deactivate</Button>
                        <Button variant="outline" size="sm" className="h-9" onClick={() => bulkSet({ inventory: 0 })}>Set Inv 0</Button>
                      </div>
                    )}
                  </div>

                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"><Checkbox checked={filtered.length > 0 && filtered.every(r => selected[r.combination_key])} onCheckedChange={(c) => toggleSelectAll(!!c)} /></TableHead>
                          {activeOptionNames.map(n => (<TableHead key={n} className="whitespace-nowrap">{n}</TableHead>))}
                          <TableHead className="whitespace-nowrap"><Package className="inline h-4 w-4 mr-1" />Inventory</TableHead>
                          <TableHead className="whitespace-nowrap"><Banknote className="inline h-4 w-4 mr-1" />Price</TableHead>
                          <TableHead className="whitespace-nowrap"><Tag className="inline h-4 w-4 mr-1" />SKU</TableHead>
                          <TableHead className="whitespace-nowrap">Active</TableHead>
                          <TableHead className="whitespace-nowrap">Default</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(groupBy !== 'none' ? Array.from(new Map<string, VariantRow[]>(sorted.map(r => [r.option_values[groupBy] || '\u2014', []])).keys()) : [null]).flatMap(groupVal => {
                          const groupRows = groupBy === 'none' ? sorted : sorted.filter(r => (r.option_values[groupBy] || '\u2014') === groupVal);
                          const headerRow = groupBy === 'none' ? null : (
                            <TableRow key={`g-${groupVal}`} className="bg-muted/40">
                              <TableCell colSpan={activeOptionNames.length + 6} className="font-semibold">{groupBy}: <span className="capitalize">{groupVal}</span> <Badge variant="secondary" className="ml-2">{groupRows.length}</Badge></TableCell>
                            </TableRow>
                          );
                          const bodyRows = groupRows.map((r) => {
                            const priceDisp = rowDisplayPrice(r);
                            return (
                              <TableRow key={r.combination_key}>
                                <TableCell className="w-10"><Checkbox checked={!!selected[r.combination_key]} onCheckedChange={(c) => setSelected(prev => ({ ...prev, [r.combination_key]: !!c }))} /></TableCell>
                                {activeOptionNames.map(n => (<TableCell key={n} className="capitalize">{r.option_values[n]}</TableCell>))}
                                <TableCell className="w-[110px]"><Input type="number" min={0} value={r.inventory} onChange={(e) => { const val = parseInt(e.target.value || '0', 10); setVariants(prev => { const next = [...prev]; const i = next.findIndex(v => v.combination_key === r.combination_key); if (i >= 0) next[i] = { ...next[i], inventory: val }; else next.push({ ...r, inventory: val }); return next; }); }} /></TableCell>
                                <TableCell className="w-[160px] font-medium">{formatCurrency(priceDisp, displayCurrency)}</TableCell>
                                <TableCell className="w-[180px]"><Input value={r.sku || ''} onChange={(e) => { const val = e.target.value; setVariants(prev => { const next = [...prev]; const i = next.findIndex(v => v.combination_key === r.combination_key); if (i >= 0) next[i] = { ...next[i], sku: val }; else next.push({ ...r, sku: val }); return next; }); }} placeholder="SKU" /></TableCell>
                                <TableCell className="w-[90px]"><Switch checked={r.is_active} onCheckedChange={(c) => setVariants(prev => { const next = [...prev]; const i = next.findIndex(v => v.combination_key === r.combination_key); if (i >= 0) next[i] = { ...next[i], is_active: !!c }; else next.push({ ...r, is_active: !!c }); return next; })} /></TableCell>
                                <TableCell className="w-[120px]"><Checkbox checked={r.is_default} onCheckedChange={(c) => setVariants(prev => { // unique default
                                  const next = rows.map(x => ({ ...x, is_default: x.combination_key === r.combination_key })); return next;
                                })} /></TableCell>
                              </TableRow>
                            );
                          });
                          return [headerRow, ...bodyRows].filter(Boolean) as React.ReactNode[];
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Price shown = Base + option price adjustments, converted to {displayCurrency}.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

CombinedVariantManager.displayName = 'CombinedVariantManager';

export default CombinedVariantManager;
