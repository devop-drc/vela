import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from "@/utils/toast";
import { KeywordEditorModal } from "@/components/KeywordEditorModal";
import { KeywordsTable } from "@/components/KeywordsTable";

export interface Keyword {
  id: string;
  keyword: string;
  description: string;
}

const Keywords = () => {
  const { setTitle } = usePageTitle();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null);

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

  const handleEdit = (keyword: Keyword) => {
    setSelectedKeyword(keyword);
    setIsEditorOpen(true);
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

  return (
    <>
      <KeywordEditorModal
        isOpen={isEditorOpen}
        onClose={() => { setIsEditorOpen(false); setSelectedKeyword(null); }}
        onSave={handleSave}
        keyword={selectedKeyword}
      />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Keywords</h1>
            <p className="text-muted-foreground">
              Teach the AI what to look for in your Instagram captions to improve product creation.
            </p>
          </div>
          <Button onClick={() => setIsEditorOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Keyword
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Your Keywords</CardTitle>
            <CardDescription>
              When the AI finds a keyword in a caption, it will extract the text that follows based on your description.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <KeywordsTable keywords={keywords} onEdit={handleEdit} onDelete={handleDelete} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Keywords;