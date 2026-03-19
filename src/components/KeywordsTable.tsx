import { useState, useRef, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Check, X } from "lucide-react";
import { Keyword } from "@/pages/Keywords";

interface KeywordsTableProps {
  keywords: Keyword[];
  onInlineUpdate: (keyword: Keyword) => Promise<void>;
  onDelete: (keywordId: string) => void;
}

interface EditState {
  id: string;
  field: "keyword" | "description";
  value: string;
}

export const KeywordsTable = ({ keywords, onInlineUpdate, onDelete }: KeywordsTableProps) => {
  const [editState, setEditState] = useState<EditState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editState && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editState]);

  const startEdit = (kw: Keyword, field: "keyword" | "description") => {
    setEditState({ id: kw.id, field, value: kw[field] });
  };

  const commitEdit = async (kw: Keyword) => {
    if (!editState) return;
    const trimmed = editState.value.trim();
    if (!trimmed) {
      setEditState(null);
      return;
    }
    if (trimmed === kw[editState.field]) {
      setEditState(null);
      return;
    }
    await onInlineUpdate({ ...kw, [editState.field]: trimmed });
    setEditState(null);
  };

  const cancelEdit = () => setEditState(null);

  const handleKeyDown = (e: React.KeyboardEvent, kw: Keyword) => {
    if (e.key === "Enter") commitEdit(kw);
    if (e.key === "Escape") cancelEdit();
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[180px]">Keyword</TableHead>
          <TableHead>Description (How the AI uses it)</TableHead>
          <TableHead className="text-right w-[80px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keywords.length > 0 ? (
          keywords.map((kw) => {
            const isEditingKeyword = editState?.id === kw.id && editState.field === "keyword";
            const isEditingDesc = editState?.id === kw.id && editState.field === "description";

            return (
              <TableRow key={kw.id} className="group">
                {/* Keyword cell */}
                <TableCell>
                  {isEditingKeyword ? (
                    <div className="flex items-center gap-1">
                      <Input
                        ref={inputRef}
                        value={editState.value}
                        onChange={(e) => setEditState({ ...editState, value: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, kw)}
                        className="h-7 text-sm font-mono"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-green-600 hover:text-green-700" onClick={() => commitEdit(kw)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={cancelEdit}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <span
                      className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted/80 transition-colors"
                      title="Click to edit"
                      onClick={() => startEdit(kw, "keyword")}
                    >
                      {kw.keyword}
                    </span>
                  )}
                </TableCell>

                {/* Description cell */}
                <TableCell>
                  {isEditingDesc ? (
                    <div className="flex items-center gap-1">
                      <Input
                        ref={inputRef}
                        value={editState.value}
                        onChange={(e) => setEditState({ ...editState, value: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, kw)}
                        className="h-7 text-sm"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-green-600 hover:text-green-700" onClick={() => commitEdit(kw)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={cancelEdit}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <span
                      className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      title="Click to edit"
                      onClick={() => startEdit(kw, "description")}
                    >
                      {kw.description}
                    </span>
                  )}
                </TableCell>

                {/* Actions cell */}
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDelete(kw.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
              No keywords added yet. Add one above or pick from the suggestions.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
