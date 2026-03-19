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

export interface Keyword {
  id: string;
  keyword: string;
  description: string;
}

const SUGGESTED_KEYWORDS = [
  { keyword: "Çmimi", description: "Price in Albanian Lek" },
  { keyword: "Ngjyra", description: "Color/colour of the product" },
  { keyword: "Madhësia", description: "Size of the product" },
  { keyword: "Materiali", description: "Material/fabric of the product" },
  { keyword: "Sasia", description: "Available quantity/stock" },
  { keyword: "Transporti", description: "Shipping/delivery information" },
  { keyword: "Ref", description: "Reference or model number" },
];

const Keywords = () => {
  const { setTitle } = usePageTitle();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setTitle("AI Keywords");
  }, [setTitle]);

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

  const handleAddSuggestion = async (suggestion: { keyword: string; description: string }) => {
    const alreadyExists = keywords.some(
      (k) => k.keyword.toLowerCase() === suggestion.keyword.toLowerCase()
    );
    if (alreadyExists) {
      showError(`"${suggestion.keyword}" is already in your keywords.`);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showError("You must be logged in."); return; }

    const { error } = await supabase.from("keywords").insert({ ...suggestion, user_id: user.id });
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
            <h1 className="text-2xl font-bold">AI Keywords</h1>
            <p className="text-muted-foreground max-w-2xl">
              Keywords teach the AI to recognise patterns in Instagram captions and extract structured
              product data automatically. For example:{" "}
              <code className="bg-muted px-1 rounded text-xs font-mono">Mat:</code>{" "}
              → "Material specification follows",{" "}
              <code className="bg-muted px-1 rounded text-xs font-mono">Çm:</code>{" "}
              → "Price in Albanian Lek follows",{" "}
              <code className="bg-muted px-1 rounded text-xs font-mono">Nr:</code>{" "}
              → "Reference/model number follows".
            </p>
          </div>
          <Button onClick={() => setIsEditorOpen(true)} className="shrink-0">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Keyword
          </Button>
        </div>

        {/* Stats bar */}
        {!isLoading && (
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {keywords.length === 0
                ? "No keywords defined yet"
                : keywords.length === 1
                ? "1 keyword defined"
                : `${keywords.length} keywords defined`}
            </span>
          </div>
        )}

        {/* Suggested keywords */}
        {!isLoading && availableSuggestions.length > 0 && (
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Suggested Keywords</CardTitle>
              </div>
              <CardDescription>
                Common Albanian/English abbreviations used in product captions. Click to add.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {availableSuggestions.map((s) => (
                  <button
                    key={s.keyword}
                    onClick={() => handleAddSuggestion(s)}
                    className="group flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm hover:border-primary hover:bg-primary/5 transition-colors"
                    title={s.description}
                  >
                    <span className="font-mono font-medium">{s.keyword}</span>
                    <span className="text-muted-foreground text-xs group-hover:text-primary transition-colors">
                      — {s.description}
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
                <CardTitle>Your Keywords</CardTitle>
                <CardDescription>
                  Click any keyword or description to edit it inline. The AI extracts the text
                  following the keyword based on your description.
                </CardDescription>
              </div>
              {!isLoading && keywords.length > 0 && (
                <div className="relative shrink-0 w-56">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search keywords…"
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
                    No keywords match <Badge variant="secondary">{search}</Badge>
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
