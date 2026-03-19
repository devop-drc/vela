import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Pencil, Trash2, Copy } from "lucide-react";

interface TypeCardProps {
  template: any;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const TypeCard = ({ template, onEdit, onDelete, onDuplicate }: TypeCardProps) => {
  const specs: any[] = template.default_specifications ?? [];
  const options: any[] = template.default_options ?? [];

  return (
    <div className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          {template.is_system && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          <span className="font-medium text-sm truncate">{template.type_name}</span>
        </div>

        {specs.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {specs.map((spec: any, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal">
                {spec.label || spec.key}
              </Badge>
            ))}
          </div>
        )}

        {options.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {options.map((opt: any, i: number) => (
              <Badge
                key={i}
                variant="outline"
                className="text-xs font-normal border-primary/30 text-primary"
              >
                {opt.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 ml-2 shrink-0">
        {template.is_system ? (
          <Button variant="outline" size="sm" onClick={onDuplicate}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Duplicate as Custom
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
