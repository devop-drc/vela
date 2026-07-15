import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readCache, writeCache } from "@/lib/pageCache";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PlusCircle, Search, Sparkles, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess, toFriendlyError } from "@/utils/toast";
import { KeywordEditorModal } from "@/components/KeywordEditorModal";
import { KeywordsTable } from "@/components/KeywordsTable";
import { CommandBar, SearchInput, EmptyState, StatCard } from "@/components/ui-app";
import { useReveal } from "@/lib/anim";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";

export interface Keyword {
  id: string;
  keyword: string;
  description: string;
}

const SUGGESTED_KEYWORDS = [
  { keyword: "Çmimi", descKey: "keywords.sug_price" },
  { keyword: "Ngjyra", descKey: "keywords.sug_color" },
  { keyword: "Madhësia", descKey: "keywords.sug_size" },
  { keyword: "Materiali", descKey: "keywords.sug_material" },
  { keyword: "Sasia", descKey: "keywords.sug_quantity" },
  { keyword: "Transporti", descKey: "keywords.sug_shipping" },
  { keyword: "Ref", descKey: "keywords.sug_ref" },
];

const Keywords = () => {
  const { setTitle } = usePageTitle();
  const { t } = useTranslation();
  const { userId } = useAuth();
  const [keywords, setKeywords] = useState<Keyword[]>(() => readCache<Keyword[]>("keywords") ?? []);
  const [isLoading, setIsLoading] = useState(() => !readCache<Keyword[]>("keywords"));
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Keyword | null>(null);
  const [search, setSearch] = useState("");
  const [pendingSuggestion, setPendingSuggestion] = useState<string | null>(null);

  const revealRef = useReveal<HTMLDivElement>({}, [isLoading]);

  useEffect(() => {
    setTitle(t("keywords.title"));
  }, [setTitle, t]);

  const fetchKeywords = async () => {
    if (!readCache("keywords")) setIsLoading(true); // spinner only when nothing cached
    const { data, error } = await supabase.from("keywords").select("*").order("keyword");
    if (error) {
      showError(toFriendlyError(error, t("keywords.fetch_failed")));
    } else {
      const rows = data as Keyword[];
      setKeywords(rows);
      writeCache("keywords", rows);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchKeywords();
  }, []);

  const handleSave = () => {
    fetchKeywords();
    setIsEditorOpen(false);
    setSelectedKeyword(null);
  };

  const handleDelete = (keywordId: string) => {
    const kw = keywords.find((k) => k.id === keywordId);
    if (kw) setDeleteTarget(kw);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    const prev = keywords;
    const next = keywords.filter((k) => k.id !== target.id);
    // Optimistic remove — reconcile from the server only on failure.
    setKeywords(next);
    writeCache("keywords", next);
    setDeleteTarget(null);

    const { error } = await supabase.from("keywords").delete().eq("id", target.id);
    if (error) {
      showError(toFriendlyError(error, t("keywords.delete_failed")));
      setKeywords(prev);
      writeCache("keywords", prev);
    } else {
      showSuccess(t("keywords.deleted"));
    }
  };

  const handleInlineUpdate = async (updated: Keyword) => {
    const prev = keywords;
    const next = keywords.map((k) => (k.id === updated.id ? updated : k));
    // Optimistic in-place update so the single cell doesn't flash a full reload.
    setKeywords(next);
    writeCache("keywords", next);

    // RLS scopes rows to the owner, so user_id isn't needed on update.
    const { error } = await supabase
      .from("keywords")
      .update({ keyword: updated.keyword, description: updated.description })
      .eq("id", updated.id);

    if (error) {
      showError(toFriendlyError(error, t("keywords.update_failed")));
      setKeywords(prev);
      writeCache("keywords", prev);
    } else {
      showSuccess(t("keywords.updated"));
    }
  };

  const handleAddSuggestion = async (suggestion: { keyword: string; descKey: string }) => {
    const alreadyExists = keywords.some(
      (k) => k.keyword.toLowerCase() === suggestion.keyword.toLowerCase()
    );
    if (alreadyExists) {
      showError(t("keywords.already_exists", { keyword: suggestion.keyword }));
      return;
    }
    if (!userId) { showError(t("keywords.must_login")); return; }

    setPendingSuggestion(suggestion.keyword);
    const { data, error } = await supabase
      .from("keywords")
      .insert({ keyword: suggestion.keyword, description: t(suggestion.descKey), user_id: userId })
      .select()
      .single();

    if (error) {
      showError(toFriendlyError(error, t("keywords.add_failed")));
    } else if (data) {
      const next = [...keywords, data as Keyword].sort((a, b) => a.keyword.localeCompare(b.keyword));
      setKeywords(next);
      writeCache("keywords", next);
      showSuccess(t("keywords.added", { keyword: suggestion.keyword }));
    }
    setPendingSuggestion(null);
  };

  const filteredKeywords = useMemo(() => {
    const q = search.toLowerCase();
    return keywords.filter(
      (k) => k.keyword.toLowerCase().includes(q) || k.description.toLowerCase().includes(q)
    );
  }, [keywords, search]);

  const availableSuggestions = useMemo(() => {
    const existing = new Set(keywords.map((k) => k.keyword.toLowerCase()));
    return SUGGESTED_KEYWORDS.filter((s) => !existing.has(s.keyword.toLowerCase()));
  }, [keywords]);

  return (
    <>
      <KeywordEditorModal
        isOpen={isEditorOpen}
        onClose={() => { setIsEditorOpen(false); setSelectedKeyword(null); }}
        onSave={handleSave}
        keyword={selectedKeyword}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("keywords.delete_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("keywords.delete_confirm_desc", { keyword: deleteTarget?.keyword })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6" ref={revealRef}>
        {/* Page header */}
        <div data-reveal className="space-y-1">
          <h1 className="text-2xl font-bold">{t("keywords.title")}</h1>
          <p className="text-muted-foreground max-w-2xl">
            {t("keywords.description")}
          </p>
        </div>

        {/* Stats */}
        {!isLoading && keywords.length > 0 && (
          <div data-reveal className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
            <StatCard title={t("keywords.stat_total")} value={keywords.length} icon={Tag} tone="brand" />
            <StatCard title={t("keywords.stat_suggestions")} value={availableSuggestions.length} icon={Sparkles} tone="info" />
          </div>
        )}

        {/* Command bar: search + add */}
        {!isLoading && keywords.length > 0 && (
          <div data-reveal>
            <CommandBar>
              <SearchInput
                value={search}
                onValueChange={setSearch}
                placeholder={t("keywords.search_keywords")}
                containerClassName="min-w-[200px] flex-1"
              />
              <Button onClick={() => setIsEditorOpen(true)} className="shrink-0" data-tour="keywords-add">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t("keywords.add_keyword")}
              </Button>
            </CommandBar>
          </div>
        )}

        {/* Suggested keywords */}
        {!isLoading && availableSuggestions.length > 0 && (
          <Card data-reveal className="border-dashed">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">{t("keywords.suggested")}</CardTitle>
              </div>
              <CardDescription>
                {t("keywords.suggested_desc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {availableSuggestions.map((s) => {
                  const isPending = pendingSuggestion === s.keyword;
                  return (
                    <button
                      key={s.keyword}
                      onClick={() => handleAddSuggestion(s)}
                      disabled={isPending}
                      className="group flex max-w-[260px] items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-60"
                      title={t(s.descKey)}
                    >
                      <span className="shrink-0 font-mono font-medium">{s.keyword}</span>
                      <span className="truncate text-xs text-muted-foreground transition-colors group-hover:text-primary">
                        — {t(s.descKey)}
                      </span>
                      {isPending ? (
                        <Spinner className="ml-0.5 h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <PlusCircle className="ml-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Keywords table */}
        <Card data-reveal>
          <CardHeader className="pb-3">
            <CardTitle>{t("keywords.your_keywords")}</CardTitle>
            <CardDescription>
              {t("keywords.your_keywords_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent data-tour="keywords-table">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : keywords.length === 0 ? (
              <EmptyState
                icon={Tag}
                title={t("keywords.empty_title")}
                description={t("keywords.empty_desc")}
                action={
                  <Button onClick={() => setIsEditorOpen(true)} data-tour="keywords-add">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t("keywords.add_keyword")}
                  </Button>
                }
              />
            ) : filteredKeywords.length === 0 ? (
              <EmptyState
                compact
                icon={Search}
                title={t("keywords.no_match")}
                description={t("keywords.no_match_desc", { search })}
              />
            ) : (
              <KeywordsTable
                keywords={filteredKeywords}
                onInlineUpdate={handleInlineUpdate}
                onDelete={handleDelete}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Keywords;
