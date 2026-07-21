/** Demo Stock — stat tiles, filters, expandable per-product inventory rows. */
import { useMemo, useState } from "react";
import {
  Search, ChevronRight, Package, Layers, XCircle, AlertTriangle, CheckCircle2, Plus, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapse } from "@/lib/anim";
import { StatusBadge } from "@/components/ui-app/StatusBadge";
import { type StatusTone } from "@/lib/status";
import { demoProducts, DemoProduct } from "./data";

// Keep this file's own <10 threshold (consistent with its stats/filters) and map to semantic tones.
const stockStatus = (n: number): { label: string; tone: StatusTone; Icon: typeof XCircle } =>
  n <= 0 ? { label: "Out of stock", tone: "danger", Icon: XCircle }
    : n < 10 ? { label: "Low stock", tone: "warning", Icon: AlertTriangle }
      : { label: "In stock", tone: "success", Icon: CheckCircle2 };

const StockBadge = ({ n }: { n: number }) => {
  const s = stockStatus(n);
  return <StatusBadge tone={s.tone} size="sm" icon={<s.Icon />}>{s.label}</StatusBadge>;
};

const Row = ({ p, stock, setStock }: { p: DemoProduct; stock: Record<string, number>; setStock: (k: string, v: number) => void }) => {
  const [open, setOpen] = useState(false);
  const variants = p.variants ?? [{ name: "Default", stock: p.inventory }];
  const total = variants.reduce((s, v) => s + (stock[`${p.id}-${v.name}`] ?? v.stock), 0);
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className={cn("flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30", open && "bg-muted/20")}>
        <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded-md bg-muted object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{p.name}</p>
          <p className="text-xs text-muted-foreground">{p.category}</p>
        </div>
        {p.variants && <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex"><Layers className="h-3.5 w-3.5" /> {p.variants.length}</span>}
        <span className="w-14 text-right text-sm font-semibold tabular-nums">{total}</span>
        <span className="hidden w-28 sm:block"><StockBadge n={total} /></span>
      </button>
      <Collapse open={open}>
        {open && (
          <div className="border-t bg-muted/10">
            {variants.map((v) => {
              const key = `${p.id}-${v.name}`;
              const val = stock[key] ?? v.stock;
              return (
                <div key={v.name} className="flex items-center gap-3 border-b px-4 py-2.5 pl-12 last:border-0">
                  <Badge variant="secondary" className="text-xs">{v.name}</Badge>
                  <span className="hidden w-28 sm:block"><StockBadge n={val} /></span>
                  <div className="ml-auto flex items-center rounded-md border">
                    <button className="px-2 py-1.5 hover:bg-accent" onClick={() => setStock(key, Math.max(0, val - 1))}><Minus className="h-3.5 w-3.5" /></button>
                    <input value={val} onChange={(e) => setStock(key, Math.max(0, +e.target.value || 0))} className="h-8 w-12 border-x bg-transparent text-center text-sm tabular-nums focus:outline-none" />
                    <button className="px-2 py-1.5 hover:bg-accent" onClick={() => setStock(key, val + 1)}><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Collapse>
    </div>
  );
};

const DemoStock = () => {
  const [stock, setStockMap] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "in" | "low" | "out">("all");
  const setStock = (k: string, v: number) => setStockMap((m) => ({ ...m, [k]: v }));

  const totalOf = (p: DemoProduct) => (p.variants ?? [{ name: "Default", stock: p.inventory }]).reduce((s, v) => s + (stock[`${p.id}-${v.name}`] ?? v.stock), 0);
  const stats = {
    total: demoProducts.length,
    inStock: demoProducts.filter((p) => totalOf(p) >= 10).length,
    low: demoProducts.filter((p) => { const n = totalOf(p); return n > 0 && n < 10; }).length,
    out: demoProducts.filter((p) => totalOf(p) <= 0).length,
    units: demoProducts.reduce((s, p) => s + totalOf(p), 0),
  };

  const list = useMemo(() => demoProducts.filter((p) => {
    if (!p.name.toLowerCase().includes(q.toLowerCase())) return false;
    const n = totalOf(p);
    if (filter === "in") return n >= 10;
    if (filter === "low") return n > 0 && n < 10;
    if (filter === "out") return n <= 0;
    return true;
  }), [q, filter, stock]);

  const tiles = [
    { v: stats.total, l: "Total Products", c: "text-foreground" },
    { v: stats.inStock, l: "In Stock", c: "text-success" },
    { v: stats.low, l: "Low Stock", c: "text-warning" },
    { v: stats.out, l: "Out of Stock", c: "text-destructive" },
    { v: stats.units, l: "Total Units", c: "text-foreground" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.l}><CardContent className="px-4 py-3">
            <div className={cn("text-2xl font-bold tabular-nums", t.c)}>{t.v}</div>
            <p className="text-xs text-muted-foreground">{t.l}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="pl-10" />
        </div>
        <div className="flex gap-2">
          {(["all", "in", "low", "out"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
              {f === "all" ? "All" : f === "in" ? "In Stock" : f === "low" ? "Low" : "Out"}
            </Button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground">
          <span className="w-4" /><span className="w-10" /><span className="flex-1">Product</span>
          <span className="w-14 text-right">Total</span><span className="hidden w-28 sm:block">Status</span>
        </div>
        <div className="divide-y">
          {list.map((p) => <Row key={p.id} p={p} stock={stock} setStock={setStock} />)}
        </div>
        {list.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No products match</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DemoStock;
