import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search, Sparkles, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from "@/utils/toast";
import { KeywordEditorModal } from "@/components/KeywordEditorModal";
import { KeywordsTable } from "@/components/KeywordsTable";
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
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setTitle(t("keywords.title"));
  }, [setTitle, t]);

  const fetchKeywords = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("keywords").select("*").order("keyword");
    if (error) {
      showError("Could not fetch keywords.");
    } else {
      setKeywords(data as Keyword[]);
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

  const handleDelete = async (keywordId: string) => {
    const { error } = await supabase.from("keywords").delete().eq("id", keywordId);
    if (error) {
      showError(`Failed to delete keyword: ${error.message}`);
    } else {
      showSuccess("Keyword deleted.");
      fetchKeywords();
    }
  };

  const handleInlineUpdate = async (updated: Keyword) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showError("You must be logged in."); return; }

    const { error } = await supabase
      .from("keywords")
      .update({ keyword: updated.keyword, description: updated.description, user_id: user.id })
      .eq("id", updated.id);

    if (error) {
      showError(`Failed to update keyword: ${error.message}`);
    } else {
      showSuccess("Keyword updated.");
      fetchKeywords();
    }
  };

  const handleAddSuggestion = async (suggestion: { keyword: string; descKey: string }) => {
    const alreadyExists = keywords.some(
      (k) => k.keyword.toLowerCase() === suggestion.keyword.toLowerCase()
    );
    if (alreadyExists) {
      showError(`"${suggestion.keyword}" is already in your keywords.`);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showError("You must be logged in."); return; }

    const { error } = await supabase.from("keywords").insert({ keyword: suggestion.keyword, description: t(suggestion.descKey), user_id: user.id });
    if (error) {
      showError(`Failed to add keyword: ${error.message}`);
    } else {
      showSuccess(`"${suggestion.keyword}" added.`);
      fetchKeywords();
    }
  };

  const filteredKeywords = keywords.filter((k) => {
    const q = search.toLowerCase();
    return k.keyword.toLowerCase().includes(q) || k.description.toLowerCase().includes(q);
  });

  const existingKeywordsLower = new Set(keywords.map((k) => k.keyword.toLowerCase()));
  const availableSuggestions = SUGGESTED_KEYWORDS.filter(
    (s) => !existingKeywordsLower.has(s.keyword.toLowerCase())
  );

  return (
    <>
      <KeywordEditorModal
        isOpen={isEditorOpen}
        onClose={() => { setIsEditorOpen(false); setSelectedKeyword(null); }}
        onSave={handleSave}
        keyword={selectedKeyword}
      />

      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{t("keywords.title")}</h1>
            <p className="text-muted-foreground max-w-2xl">
              {t("keywords.description")}
            </p>
          </div>
          <Button onClick={() => setIsEditorOpen(true)} className="shrink-0">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("keywords.add_keyword")}
          </Button>
        </div>

        {/* Stats bar */}
        {!isLoading && (
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {keywords.length === 0
                ? t("keywords.no_keywords")
                : t("keywords.keywords_count", { count: keywords.length })}
            </span>
          </div>
        )}

        {/* Suggested keywords */}
        {!isLoading && availableSuggestions.length > 0 && (
          <Card className="border-dashed">
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
                {availableSuggestions.map((s) => (
                  <button
                    key={s.keyword}
                    onClick={() => handleAddSuggestion(s)}
                    className="group flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm hover:border-primary hover:bg-primary/5 transition-colors"
                    title={t(s.descKey)}
                  >
                    <span className="font-mono font-medium">{s.keyword}</span>
                    <span className="text-muted-foreground text-xs group-hover:text-primary transition-colors">
                      — {t(s.descKey)}
                    </span>
                    <PlusCircle className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors ml-0.5" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Keywords table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{t("keywords.your_keywords")}</CardTitle>
                <CardDescription>
                  {t("keywords.your_keywords_desc")}
                </CardDescription>
              </div>
              {!isLoading && keywords.length > 0 && (
                <div className="relative shrink-0 w-56">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder={t("keywords.search_keywords")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <KeywordsTable
                  keywords={filteredKeywords}
                  onInlineUpdate={handleInlineUpdate}
                  onDelete={handleDelete}
                />
                {search && filteredKeywords.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    {t("keywords.no_match")} <Badge variant="secondary">{search}</Badge>
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Keywords;
