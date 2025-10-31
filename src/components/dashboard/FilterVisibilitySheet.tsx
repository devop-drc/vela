"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAttributeIcon } from "@/lib/attributeIcons";
import { Info, Tag as TagIcon, Layers, Monitor, Cpu, HardDrive, Baby, Package, Globe, Sparkles, GripVertical, DollarSign } from "lucide-react";
import { Sortable, SortableItem, SortableItemHandle } from "@/components/ui/sortable";
import { useIsMobile } from "@/hooks/use-mobile";

export interface DetailsAttribute { name: string; values: string[] }
export interface ProductLite { id: string; details?: Record<string, unknown> }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allCategories: string[];
  allTags: string[];
  allDetailsAttributes: DetailsAttribute[];
  allProducts: ProductLite[];
}

export function FilterVisibilitySheet({ open, onOpenChange, allCategories, allTags, allDetailsAttributes, allProducts }: Props) {
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [orderMode, setOrderMode] = useState<'alpha' | 'useful' | 'manual'>(() => {
    const s = typeof window !== 'undefined' ? localStorage.getItem('instagram_filter_order_mode') : null;
    return (s === 'alpha' || s === 'useful' || s === 'manual') ? s : 'manual';
  });
  const [visQuery, setVisQuery] = useState("");

  const toTitle = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const visibilityKeys = useMemo(() => {
    const keys: string[] = [];
    if (allCategories.length > 0) keys.push('categories');
    // include priceRange as a toggleable card (no values, no slider)
    keys.push('priceRange');
    if (allTags.length > 0) keys.push('tags');
    const attrSet = new Set<string>();
    allDetailsAttributes.forEach(a => { if ((a.values?.length || 0) > 0) attrSet.add(a.name); });
    allProducts.forEach(p => { Object.keys(p.details || {}).forEach(k => { if (k !== 'type') attrSet.add(k); }); });
    const isRefCode = (name: string) => {
      const n = name.toLowerCase();
      return n.includes('reference code') || n.includes('ref code') || n === 'ref' || n.includes('refcode') || n.includes('reference');
    };
    const attrs = Array.from(attrSet).filter(a => !isRefCode(a)).sort((a,b)=>a.localeCompare(b));
    return [...keys, ...attrs];
  }, [allCategories, allTags, allDetailsAttributes, allProducts]);

  // Load persisted visibility
  useEffect(() => {
    try {
      const raw = localStorage.getItem('instagram_filter_visibility');
      setVisibilityMap(raw ? JSON.parse(raw) : {});
    } catch { setVisibilityMap({}); }
  }, []);

  // Initialize and persist order
  useEffect(() => {
    const stored = localStorage.getItem('instagram_filter_order');
    const keysSet = new Set(visibilityKeys);
    if (stored) {
      try {
        const parsed: string[] = JSON.parse(stored);
        const filtered = parsed.filter(k => keysSet.has(k));
        const missing = visibilityKeys.filter(k => !filtered.includes(k));
        setOrder([...filtered, ...missing]);
        return;
      } catch {}
    }
    setOrder(visibilityKeys);
  }, [visibilityKeys]);

  useEffect(() => {
    if (order.length > 0) localStorage.setItem('instagram_filter_order', JSON.stringify(order));
  }, [order]);
  useEffect(() => { localStorage.setItem('instagram_filter_order_mode', orderMode); }, [orderMode]);

  const setVisibility = (key: string, val: boolean) => {
    setVisibilityMap(prev => {
      const next = { ...prev, [key]: val };
      localStorage.setItem('instagram_filter_visibility', JSON.stringify(next));
      return next;
    });
  };

  const handleToggleKey = (key: string) => {
    const isOn = visibilityMap[key] !== false;
    setVisibility(key, !isOn);
  };

  const iconForKey = (key: string) => {
    const norm = key.toLowerCase().replace(/\s|_/g, '');
    if (key === 'categories') return Layers;
    if (key === 'priceRange') return DollarSign;
    if (key === 'tags') return TagIcon;
    if (norm === 'brand') return TagIcon;
    if (norm === 'corefeatures') return Sparkles;
    if (norm === 'displaytype') return Monitor;
    if (norm === 'model') return Package;
    if (norm === 'os' || norm === 'operatingsystem') return Cpu;
    if (norm === 'platform') return Globe;
    if (norm === 'ram' || norm === 'memory') return HardDrive;
    if (norm === 'recommendedage' || norm === 'age') return Baby;
    return getAttributeIcon(key);
  };

  const renderValues = (key: string): string[] | null => {
    if (key === 'categories') return allCategories.slice(0, 5);
    if (key === 'tags') return allTags.slice(0, 5);
    if (key === 'priceRange') return null;
    const attr = allDetailsAttributes.find(a => a.name === key);
    let vals = (attr?.values || []);
    if (!vals || vals.length === 0) {
      const bucket = new Set<string>();
      allProducts.forEach(p => {
        const v = (p.details || {})[key as keyof typeof p.details];
        if (Array.isArray(v)) (v as unknown[]).forEach(x => x && bucket.add(String(x)));
        else if (v != null) bucket.add(String(v));
      });
      vals = Array.from(bucket);
    }
    return vals.slice(0, 5).map(String);
  };

  const filteredLists = useMemo(() => {
    let enabledKeys = order.filter(k => visibilityKeys.includes(k) && visibilityMap[k] !== false);
    let hiddenKeys = order.filter(k => visibilityKeys.includes(k) && visibilityMap[k] === false);
    if (visQuery.trim()) {
      const q = visQuery.trim().toLowerCase();
      const match = (k: string) => toTitle(k).toLowerCase().includes(q);
      enabledKeys = enabledKeys.filter(match);
      hiddenKeys = hiddenKeys.filter(match);
    }
    const byAlpha = (a: string, b: string) => toTitle(a).localeCompare(toTitle(b));
    const valueCount = (k: string) => {
      if (k === 'categories') return allCategories.length;
      if (k === 'tags') return allTags.length;
      const attr = allDetailsAttributes.find(a => a.name === k);
      return (attr?.values?.length) || 0;
    };
    if (orderMode === 'alpha') {
      enabledKeys = [...enabledKeys].sort(byAlpha);
      hiddenKeys = [...hiddenKeys].sort(byAlpha);
    } else if (orderMode === 'useful') {
      const byUseful = (a: string, b: string) => valueCount(b) - valueCount(a) || byAlpha(a,b);
      enabledKeys = [...enabledKeys].sort(byUseful);
      hiddenKeys = [...hiddenKeys].sort(byUseful);
    }
    return { enabledKeys, hiddenKeys };
  }, [order, visibilityKeys, visibilityMap, orderMode, visQuery, allCategories, allTags, allDetailsAttributes]);

  const reorderWithinSection = (enabled: boolean, newKeys: string[]) => {
    setOrder(prev => {
      const currentEnabled = prev.filter(k => visibilityKeys.includes(k) && visibilityMap[k] !== false);
      const currentHidden = prev.filter(k => visibilityKeys.includes(k) && visibilityMap[k] === false);
      if (enabled) return [...newKeys, ...currentHidden];
      return [...currentEnabled, ...newKeys];
    });
  };

  const Card = ({ keyName, withHandle = false }: { keyName: string; withHandle?: boolean }) => {
    const isOn = visibilityMap[keyName] !== false;
    const Icon = iconForKey(keyName);
    return (
      <button
        type="button"
        onClick={() => handleToggleKey(keyName)}
        className={cn(
          "group relative flex items-center gap-3 rounded-md border p-3 text-left transition-colors select-none w-full h-[80px]",
          "hover:bg-[hsl(var(--muted))]",
          isOn ? "border-primary/40" : "border-[hsl(var(--border))]"
        )}
        aria-pressed={isOn}
      >
        {withHandle && (
          <SortableItemHandle className="mr-1 text-muted-foreground flex">
            <GripVertical className="h-4 w-4" />
          </SortableItemHandle>
        )}
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-md shrink-0",
          isOn ? "bg-primary/10 text-primary" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]")}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-row gap-2 items-center">
            <div className="truncate text-sm font-medium">{toTitle(keyName)}</div>
            {/* <div className="text-xs text-muted-foreground">{isOn ? 'Shown' : 'Hidden'}</div> */}
          </div>
          {keyName !== 'priceRange' && (
            <div className="mt-2 flex flex-wrap gap-1 max-h-10 overflow-x-auto pr-1 items-center">
              {renderValues(keyName)?.slice(0, 2).map((val, i) => (
                <span key={i} className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground max-w-[200px] truncate whitespace-nowrap">{val}</span>
              ))}
            </div>
          )}
        </div>
      </button>
    );
  };

  const { enabledKeys, hiddenKeys } = filteredLists;

  const isMobile = useIsMobile();

  const Body = () => (
    <div className="w-full p-0 flex flex-col md:h-auto h-[95dvh] max-w-[100vw]">
        <div className="px-4 pt-3 pb-2 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex flex-col items-start justify-between gap-1 flex-wrap">
            <div className="text-base font-semibold">Filter Visibility</div>
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">Enable/disable and order which filter groups appear in the Instagram shop.</p>
              <div className="flex items-center flex-wrap gap-2">
                <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={visQuery} onChange={(e)=>setVisQuery(e.target.value)} placeholder="Search filters" className="pl-8 h-10 w-[190px]" />
              </div>
              <div className="inline-flex rounded-md border overflow-hidden">
                <button className={cn("px-3 py-2.5 text-xs", orderMode==='alpha' ? 'bg-primary/10 text-primary' : 'text-muted-foreground')} onClick={()=>setOrderMode('alpha')}>A–Z</button>
                <button className={cn("px-3 py-2.5 text-xs border-l", orderMode==='useful' ? 'bg-primary/10 text-primary' : 'text-muted-foreground')} onClick={()=>setOrderMode('useful')}>Most Useful</button>
                <button className={cn("px-3 py-2.5 text-xs border-l", orderMode==='manual' ? 'bg-primary/10 text-primary' : 'text-muted-foreground')} onClick={()=>setOrderMode('manual')}>Manual</button>
              </div>
              <div className="inline-flex rounded-md border overflow-hidden">
                <button className="px-3 py-2.5 text-xs text-muted-foreground hover:bg-muted" onClick={() => {
                  const keys = [...order].filter(k => visibilityKeys.includes(k)).filter(k => !visQuery || toTitle(k).toLowerCase().includes(visQuery.toLowerCase()));
                  keys.forEach(k => setVisibility(k, true));
                }}>Enable All</button>
                <button className="px-3 py-2.5 text-xs border-l text-muted-foreground hover:bg-muted" onClick={() => {
                  const keys = [...order].filter(k => visibilityKeys.includes(k)).filter(k => !visQuery || toTitle(k).toLowerCase().includes(visQuery.toLowerCase()));
                  keys.forEach(k => setVisibility(k, false));
                }}>Disable All</button>
              </div>
              </div>
            </div>
          </div>
        </div>
        <ScrollArea className="flex-1 px-4 pt-4">
          {isMobile ? (
            <div className="flex flex-col gap-6">
              <div className="min-h-[44px] flex flex-col">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Enabled</div>
                {orderMode === 'manual' ? (
                  <Sortable
                    value={enabledKeys}
                    getItemValue={(k:string)=>k}
                    onValueChange={(newKeys:string[])=>{
                      setOrder(prev => {
                        const hidden = prev.filter(k => visibilityKeys.includes(k) && visibilityMap[k] === false);
                        return [...newKeys, ...hidden];
                      });
                    }}
                    strategy="vertical"
                    className="space-y-3"
                  >
                    {enabledKeys.map((key) => (
                      <SortableItem key={key} value={key}>
                        <Card keyName={key} withHandle />
                      </SortableItem>
                    ))}
                  </Sortable>
                ) : (
                  <div className="flex flex-col gap-3">
                    {enabledKeys.map(k => <Card key={k} keyName={k} />)}
                  </div>
                )}
              </div>
              <div className="min-h-[44px] flex flex-col">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Hidden</div>
                {orderMode === 'manual' ? (
                  <Sortable
                    value={hiddenKeys}
                    getItemValue={(k:string)=>k}
                    onValueChange={(newKeys:string[])=>{
                      setOrder(prev => {
                        const enabled = prev.filter(k => visibilityKeys.includes(k) && visibilityMap[k] !== false);
                        return [...enabled, ...newKeys];
                      });
                    }}
                    strategy="vertical"
                    className="space-y-3"
                  >
                    {hiddenKeys.map((key) => (
                      <SortableItem key={key} value={key}>
                        <Card keyName={key} withHandle />
                      </SortableItem>
                    ))}
                  </Sortable>
                ) : (
                  <div className="flex flex-col gap-3">
                    {hiddenKeys.map(k => <Card key={k} keyName={k} />)}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:h-[calc(100dvh-150px)]">
              <div className="min-h-[44px] flex flex-col">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Enabled</div>
                <ScrollArea className="flex-1 pr-1">
                  {orderMode === 'manual' ? (
                    <Sortable
                      value={enabledKeys}
                      getItemValue={(k:string)=>k}
                      onValueChange={(newKeys:string[])=>{
                        setOrder(prev => {
                          const hidden = prev.filter(k => visibilityKeys.includes(k) && visibilityMap[k] === false);
                          return [...newKeys, ...hidden];
                        });
                      }}
                      strategy="vertical"
                      className="space-y-3"
                    >
                      {enabledKeys.map((key) => (
                        <SortableItem key={key} value={key}>
                          <Card keyName={key} withHandle />
                        </SortableItem>
                      ))}
                    </Sortable>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {enabledKeys.map(k => <Card key={k} keyName={k} />)}
                    </div>
                  )}
                </ScrollArea>
              </div>
              <div className="min-h-[44px] flex flex-col">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Hidden</div>
                <ScrollArea className="flex-1 pr-1">
                  {orderMode === 'manual' ? (
                    <Sortable
                      value={hiddenKeys}
                      getItemValue={(k:string)=>k}
                      onValueChange={(newKeys:string[])=>{
                        setOrder(prev => {
                          const enabled = prev.filter(k => visibilityKeys.includes(k) && visibilityMap[k] !== false);
                          return [...enabled, ...newKeys];
                        });
                      }}
                      strategy="vertical"
                      className="space-y-3"
                    >
                      {hiddenKeys.map((key) => (
                        <SortableItem key={key} value={key}>
                          <Card keyName={key} withHandle />
                        </SortableItem>
                      ))}
                    </Sortable>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {hiddenKeys.map(k => <Card key={k} keyName={k} />)}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </ScrollArea>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="p-0">
          <Body />
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[800px] p-0 rounded-l-md">
        <Body />
      </SheetContent>
    </Sheet>
  );
}
