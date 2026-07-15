/** Demo Categories — collapsible categories → types with specs & options. */
import { useMemo, useState } from "react";
import {
  Layers, Wrench, Palette, Lock, PlusCircle, Search, ChevronRight, Copy, Pencil, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { demoCategories, DemoCategory, DemoType } from "./data";
import { showSuccess } from "@/utils/toast";

const TypeCard = ({ t }: { t: DemoType }) => (
  <div className={cn("rounded-lg border p-3", t.system ? "bg-muted/20" : "bg-card hover:bg-accent/30")}>
    <div className="flex items-center gap-2">
      {t.system && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
      <span className="text-sm font-medium">{t.name}</span>
      {!t.system && <Badge variant="outline" className="border-primary/30 text-primary">Custom</Badge>}
      <div className="ml-auto flex items-center gap-1">
        {t.system ? (
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"><Copy className="h-3.5 w-3.5" /> Duplicate</Button>
        ) : (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
          </>
        )}
      </div>
    </div>
    {t.specs.length > 0 && (
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
        {t.specs.map((s) => <span key={s.label} className="rounded bg-muted/60 px-1.5 py-0.5 text-xs">{s.label}{s.unit ? ` (${s.unit})` : ""}</span>)}
      </div>
    )}
    {t.options.length > 0 && (
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <Palette className="h-3.5 w-3.5 text-muted-foreground" />
        {t.options.map((o) => <span key={o.name} className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-xs text-primary/80">{o.name} · {o.values.length}</span>)}
      </div>
    )}
  </div>
);

const CategoryCard = ({ c }: { c: DemoCategory }) => {
  const [open, setOpen] = useState(false);
  const specs = c.types.reduce((s, t) => s + t.specs.length, 0);
  const opts = c.types.reduce((s, t) => s + t.options.length, 0);
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 hover:bg-accent/30">
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-90")} />
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{c.name}</span>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary">{c.types.length} types</Badge>
          <span className="hidden text-xs text-muted-foreground sm:inline">{specs} specs · {opts} opts</span>
          {c.system && <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />}
        </div>
      </button>
      {open && (
        <div className="space-y-2 border-t px-4 pb-3 pt-3">
          {c.types.map((t) => <TypeCard key={t.name} t={t} />)}
          <button onClick={() => showSuccess("Demo — sign up to add real types")} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-sm text-muted-foreground hover:bg-accent/30">
            <PlusCircle className="h-4 w-4" /> Add type to {c.name}
          </button>
        </div>
      )}
    </div>
  );
};

const DemoCategories = () => {
  const [tab, setTab] = useState<"all" | "system" | "custom">("all");
  const [q, setQ] = useState("");

  const totals = {
    cats: demoCategories.length,
    types: demoCategories.reduce((s, c) => s + c.types.length, 0),
    specs: demoCategories.reduce((s, c) => s + c.types.reduce((a, t) => a + t.specs.length, 0), 0),
    opts: demoCategories.reduce((s, c) => s + c.types.reduce((a, t) => a + t.options.length, 0), 0),
  };

  const list = useMemo(() => demoCategories.filter((c) =>
    c.name.toLowerCase().includes(q.toLowerCase()) &&
    (tab === "all" || (tab === "system" && c.system) || (tab === "custom" && !c.system))), [tab, q]);

  const counts = { all: demoCategories.length, system: demoCategories.filter((c) => c.system).length, custom: demoCategories.filter((c) => !c.system).length };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-3 py-1.5 text-sm"><Layers className="h-4 w-4" /> {totals.cats} Categories</span>
        <span className="rounded-md border bg-muted/50 px-3 py-1.5 text-sm">{totals.types} Types</span>
        <span className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-3 py-1.5 text-sm"><Wrench className="h-4 w-4" /> {totals.specs} Specs</span>
        <span className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-3 py-1.5 text-sm"><Palette className="h-4 w-4" /> {totals.opts} Options</span>
        <Button size="sm" className="ml-auto" onClick={() => showSuccess("Demo — sign up to add categories")}><PlusCircle className="mr-1.5 h-4 w-4" /> Add Category</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {(["all", "system", "custom"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium capitalize", tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
              {t === "system" && <Lock className="h-3.5 w-3.5" />} {t}
              <Badge variant="secondary" className="h-4 px-1 text-xs">{counts[t]}</Badge>
            </button>
          ))}
        </div>
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories" className="pl-9" />
        </div>
      </div>

      <div className="space-y-2">
        {list.map((c) => <CategoryCard key={c.id} c={c} />)}
      </div>
    </div>
  );
};

export default DemoCategories;
