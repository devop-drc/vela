/** Demo Keywords — suggested chips + editable keywords table. */
import { useState } from "react";
import { Tag, Sparkles, PlusCircle, Search, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { demoKeywords, demoSuggestedKeywords, DemoKeyword } from "./data";

const DemoKeywords = () => {
  const [keywords, setKeywords] = useState<DemoKeyword[]>(demoKeywords);
  const [suggested, setSuggested] = useState<DemoKeyword[]>(demoSuggestedKeywords);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const add = (k: DemoKeyword) => { setKeywords((p) => [...p, k]); setSuggested((p) => p.filter((s) => s.id !== k.id)); };
  const remove = (id: string) => setKeywords((p) => p.filter((k) => k.id !== id));
  const commit = (id: string) => { setKeywords((p) => p.map((k) => (k.id === id ? { ...k, keyword: draft || k.keyword } : k))); setEditing(null); };

  const list = keywords.filter((k) => k.keyword.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Keywords</h1>
          <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
            Keywords guide the AI when it reads your Instagram captions — the details it should extract from every post.
          </p>
        </div>
        <Button className="shrink-0"><PlusCircle className="mr-1.5 h-4 w-4" /> Add Keyword</Button>
      </div>

      <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Tag className="h-4 w-4" /> {keywords.length} keywords</p>

      {suggested.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> Suggested</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {suggested.map((s) => (
                <button key={s.id} onClick={() => add(s)} className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm hover:border-primary hover:bg-primary/5">
                  <span className="font-mono">{s.keyword}</span>
                  <span className="text-muted-foreground">— {s.description}</span>
                  <PlusCircle className="h-4 w-4 text-primary" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div><CardTitle className="text-base">Your keywords</CardTitle><CardDescription>Click a keyword to rename it.</CardDescription></div>
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-9 pl-8" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-y bg-muted/30 text-xs text-muted-foreground">
              <tr><th className="w-48 px-4 py-2 text-left font-medium">Keyword</th><th className="px-4 py-2 text-left font-medium">Description</th><th className="w-20 px-4 py-2 text-right font-medium">Actions</th></tr>
            </thead>
            <tbody>
              {list.map((k) => (
                <tr key={k.id} className="group border-b last:border-0">
                  <td className="px-4 py-2.5">
                    {editing === k.id ? (
                      <span className="flex items-center gap-1">
                        <Input autoFocus defaultValue={k.keyword} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") commit(k.id); if (e.key === "Escape") setEditing(null); }} className="h-7 w-32 font-mono" />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => commit(k.id)}><Check className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                      </span>
                    ) : (
                      <button onClick={() => { setEditing(k.id); setDraft(k.keyword); }} className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm hover:bg-muted/70">{k.keyword}</button>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{k.description}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive sm:opacity-0 sm:group-hover:opacity-100" onClick={() => remove(k.id)}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  No keywords match {q && <Badge variant="secondary">{q}</Badge>}
                </td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoKeywords;
