import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Keyword } from "@/pages/Keywords";

interface KeywordsTableProps {
  keywords: Keyword[];
  onEdit: (keyword: Keyword) => void;
  onDelete: (keywordId: string) => void;
}

export const KeywordsTable = ({ keywords, onEdit, onDelete }: KeywordsTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Keyword</TableHead>
          <TableHead>Description (How the AI uses it)</TableHead>
          <TableHead className="text-right w-[120px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keywords.length > 0 ? (
          keywords.map((keyword) => (
            <TableRow key={keyword.id}>
              <TableCell className="font-medium">{keyword.keyword}</TableCell>
              <TableCell>{keyword.description}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(keyword)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(keyword.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={3} className="h-24 text-center">
              No keywords added yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};