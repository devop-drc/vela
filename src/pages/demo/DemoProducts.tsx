/** Demo Products — grid/table, filter sidebar, status dropdown, edit modal. */
import { useMemo, useState } from "react";
import {
  Plus, Filter as FilterIcon, LayoutGrid, List, Package, Star, Tag, AlertTriangle,
  CheckCircle, XCircle, Archive, SlidersHorizontal, Edit, Trash2, X, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { demoProducts, DemoProduct, fmtALL, productStatuses } from "./data";
import { showSuccess } from "@/utils/toast";
import { StatusBadge } from "@/components/ui-app/StatusBadge";
import { productStatusTone, stockTone, toneText, toneDotBg } from "@/lib/status";

const stockDot = (p: DemoProduct) => {
  const tone = stockTone(p.inventory);
  const label = p.inventory <= 0 ? "Out" : p.inventory <= 10 ? `${p.inventory} left` : `${p.inventory}`;
  return { c: toneDotBg[tone], t: toneText[tone], label };
};

const statusIcon: Record<DemoProduct["status"], any> = {
  "Active": CheckCircle,
  "Draft": XCircle,
  "Out of Stock": Archive,
};

const StatusDropdown = ({ value, onChange }: { value: DemoProduct["status"]; onChange: (s: DemoProduct["status"]) => void }) => {
  const Icon = statusIcon[value];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn("flex h-7 items-center gap-1 rounded px-1.5 text-xs font-semibold", toneText[productStatusTone(value)])}>
          <Icon className="h-3.5 w-3.5" /> {value}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {productStatuses.map((s) => {
          const SIcon = statusIcon[s];
          return (
            <DropdownMenuItem key={s} onClick={() => onChange(s)} className={cn(s === value && "bg-accent")}>
              <SIcon className={cn("mr-2 h-4 w-4", toneText[productStatusTone(s)])} /> {s}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ProductCard = ({ p, onStatus, onOpen }: { p: DemoProduct; onStatus: (s: DemoProduct["status"]) => void; onOpen: () => void }) => {
  const d = stockDot(p);
  return (
    <Card className="group flex h-full cursor-pointer flex-col overflow-hidden shadow-sm transition-shadow hover:shadow-md" onClick={onOpen}>
      <div className="aspect-square overflow-hidden bg-muted">
        <img src={p.image} alt={p.name} className={cn("h-full w-full object-cover transition-transform group-hover:scale-105", p.inventory <= 0 && "grayscale")} />
      </div>
      <div className="flex flex-1 flex-col justify-between space-y-2 p-3">
        <div>
          <p className="truncate text-[10px] text-muted-foreground">{p.category} · {p.type}</p>
          <h3 className="font-semibold leading-snug tracking-tight">{p.name}</h3>
          {p.rating && (
            <div className="mt-0.5 flex items-center gap-1 text-xs">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {p.rating}
              <span className="text-muted-foreground">({p.reviews})</span>
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {p.tags.slice(0, 3).map((t) => <Badge key={t} variant="secondary" className="px-1.5 py-0 text-[10px]">{t}</Badge>)}
          </div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-1" onClick={(e) => e.stopPropagation()}>
          <div className="min-w-0">
            <div className="whitespace-nowrap text-xl font-bold">{fmtALL(p.price)}</div>
            <div className={cn("flex items-center gap-1 text-[10px]", d.t)}>
              <span className={cn("h-2 w-2 rounded-full", d.c)} /> {d.label}
            </div>
          </div>
          <div className="shrink-0"><StatusDropdown value={p.status} onChange={onStatus} /></div>
        </div>
      </div>
    </Card>
  );
};

const StatPill = ({ dot, children, active, onClick }: any) => (
  <button onClick={onClick} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors",
    active ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/70 hover:bg-accent")}>
    {dot && <span className={cn("h-2 w-2 rounded-full", dot)} />} {children}
  </button>
);

const DemoProducts = () => {
  const [products, setProducts] = useState<DemoProduct[]>(demoProducts);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [showFilters, setShowFilters] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DemoProduct["status"] | null>(null);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [sort, setSort] = useState("newest");
  const [editing, setEditing] = useState<DemoProduct | null>(null);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);
  const counts = {
    total: products.length,
    active: products.filter((p) => p.status === "Active").length,
    draft: products.filter((p) => p.status === "Draft").length,
    out: products.filter((p) => p.inventory <= 0).length,
  };

  const filtered = useMemo(() => {
    let r = products.filter((p) =>
      (!statusFilter || p.status === statusFilter) &&
      (!catFilter || p.category === catFilter) &&
      p.price <= maxPrice);
    if (sort === "price-asc") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") r = [...r].sort((a, b) => b.price - a.price);
    if (sort === "name-asc") r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    return r;
  }, [products, statusFilter, catFilter, maxPrice, sort]);

  const setStatus = (id: string, s: DemoProduct["status"]) =>
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: s } : p)));

  return (
    <div className="flex w-full gap-4">
      {/* filter sidebar */}
      {showFilters && (
        <aside className="hidden w-[240px] shrink-0 lg:block">
          <div className="sticky top-0 overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Filters</span>
              <button className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                onClick={() => { setStatusFilter(null); setCatFilter(null); setMaxPrice(5000); }}>Clear all</button>
            </div>
            <div className="space-y-5 p-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {productStatuses.map((s) => (
                    <button key={s} onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                      className={cn("rounded-md border px-2.5 py-1 text-xs font-medium", statusFilter === s ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent")}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => (
                    <button key={c} onClick={() => setCatFilter(catFilter === c ? null : c)}
                      className={cn("rounded-md border px-2.5 py-1 text-xs font-medium", catFilter === c ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent")}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Max price</p>
                <Slider value={[maxPrice]} min={500} max={5000} step={100} onValueChange={([v]) => setMaxPrice(v)} />
                <p className="mt-1.5 text-xs text-muted-foreground">up to {fmtALL(maxPrice)}</p>
              </div>
            </div>
          </div>
        </aside>
      )}

      <div className="min-w-0 flex-1">
        {/* stat pills */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatPill active={!statusFilter} onClick={() => setStatusFilter(null)}><Package className="h-3.5 w-3.5" /> {counts.total} total</StatPill>
          <StatPill dot={toneDotBg.success} active={statusFilter === "Active"} onClick={() => setStatusFilter("Active")}>{counts.active} active</StatPill>
          <StatPill dot={toneDotBg.neutral} active={statusFilter === "Draft"} onClick={() => setStatusFilter("Draft")}>{counts.draft} draft</StatPill>
          <StatPill dot={toneDotBg.danger} active={false} onClick={() => setMaxPrice(5000)}>{counts.out} out of stock</StatPill>
        </div>

        {/* toolbar */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button size="sm" className="shadow-sm" onClick={() => showSuccess("This is a demo — sign up to add real products")}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Product
          </Button>
          <Button size="sm" variant={showFilters ? "secondary" : "outline"} onClick={() => setShowFilters((v) => !v)}>
            <FilterIcon className="mr-1.5 h-4 w-4" /> Filters
          </Button>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-[150px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price-asc">Price: low → high</SelectItem>
              <SelectItem value="price-desc">Price: high → low</SelectItem>
              <SelectItem value="name-asc">Name A–Z</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center rounded-lg border bg-muted/60 p-0.5">
            {(["grid", "table"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium", view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                {v === "grid" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">Showing {filtered.length} of {products.length} products</p>

        {view === "grid" ? (
          <div className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} p={p} onStatus={(s) => setStatus(p.id, s)} onOpen={() => setEditing(p)} />
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 text-left font-medium">Product</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Price</th>
                  <th className="p-3 text-left font-medium">Stock</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const d = stockDot(p);
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img src={p.image} alt="" className="h-12 w-12 rounded-md bg-muted object-cover" />
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3"><StatusBadge tone={productStatusTone(p.status)} size="sm">{p.status}</StatusBadge></td>
                      <td className="p-3 font-medium">{fmtALL(p.price)}</td>
                      <td className="p-3"><span className={cn("inline-flex items-center gap-1 text-xs", d.t)}><span className={cn("h-2 w-2 rounded-full", d.c)} />{d.label}</span></td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(p)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent></Card>
        )}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-muted"><Package className="h-8 w-8 text-muted-foreground" /></div>
            <h3 className="mt-3 text-lg font-semibold">No products match</h3>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { setStatusFilter(null); setCatFilter(null); setMaxPrice(5000); }}>Clear all filters</Button>
          </div>
        )}
      </div>

      <ProductEditor product={editing} onClose={() => setEditing(null)} onSave={(u) => { setProducts((prev) => prev.map((p) => (p.id === u.id ? u : p))); setEditing(null); showSuccess("Product updated (demo)"); }} />
    </div>
  );
};

/* View/Edit product dialog */
const ProductEditor = ({ product, onClose, onSave }: { product: DemoProduct | null; onClose: () => void; onSave: (p: DemoProduct) => void }) => {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState<DemoProduct | null>(product);

  // sync when a new product opens
  if (product && draft?.id !== product.id) { setDraft(product); setMode("view"); }
  if (!product || !draft) return null;

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <ScrollArea className="max-h-[90vh]">
          <div className="grid gap-6 p-6 md:grid-cols-2">
            <div className="overflow-hidden rounded-lg bg-muted">
              <img src={draft.image} alt={draft.name} className="aspect-square w-full object-cover" />
            </div>
            {mode === "view" ? (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">{draft.category} › {draft.type}</p>
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-2xl font-bold">{draft.name}</h1>
                  <StatusBadge tone={productStatusTone(draft.status)}>{draft.status}</StatusBadge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold">{fmtALL(draft.price)}</span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground"><Package className="h-4 w-4" /> {draft.inventory} in stock</span>
                </div>
                <p className="text-sm text-muted-foreground">{draft.caption}</p>
                {draft.variants && (
                  <div className="flex flex-wrap gap-1.5">
                    {draft.variants.map((v) => (
                      <span key={v.name} className={cn("rounded-md border px-2.5 py-1 text-xs", v.stock <= 0 ? "opacity-50" : v.stock <= 4 ? "border-warning/40 text-warning" : "border-success/40 text-success")}>
                        {v.name} · {v.stock}
                      </span>
                    ))}
                  </div>
                )}
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold"><Tag className="h-4 w-4" /> Specifications</p>
                  <div className="text-sm">
                    {draft.specs.map((s) => (
                      <div key={s.attribute} className="flex justify-between border-b border-dashed py-1.5">
                        <span className="capitalize text-muted-foreground">{s.attribute}</span>
                        <span className="font-medium">{s.value}{s.unit ? ` ${s.unit}` : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => setMode("edit")}><Edit className="mr-1.5 h-4 w-4" /> Edit</Button>
                  <Button variant="ghost" className="text-destructive" onClick={onClose}><Trash2 className="mr-1.5 h-4 w-4" /> Delete</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1 text-lg font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Price (ALL)</label>
                    <Input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: +e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Stock</label>
                    <Input type="number" value={draft.inventory} onChange={(e) => setDraft({ ...draft, inventory: +e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={draft.status} onValueChange={(s) => setDraft({ ...draft, status: s as DemoProduct["status"] })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{productStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Caption</label>
                  <Textarea value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} className="mt-1" rows={3} />
                </div>
                <Button variant="outline" size="sm" className="gap-1.5"><Sparkles className="h-4 w-4 text-amber-500" /> Find specs with the system</Button>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setMode("view")}>Cancel</Button>
                  <Button onClick={() => onSave(draft)}>Update Product</Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default DemoProducts;
