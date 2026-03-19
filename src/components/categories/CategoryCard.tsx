import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TypeCard } from "./TypeCard";

interface CategoryCardProps {
  categoryName: string;
  templates: any[];
  onEditType: (template: any) => void;
  onDeleteType: (template: any) => void;
  onAddType: (categoryName: string) => void;
  onDuplicate: (template: any) => void;
}

export const CategoryCard = ({
  categoryName,
  templates,
  onEditType,
  onDeleteType,
  onAddType,
  onDuplicate,
}: CategoryCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasSystem = templates.some((t) => t.is_system);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border bg-card shadow-sm">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between p-4 text-left hover:bg-accent/50 rounded-t-lg transition-colors">
            <div className="flex items-center gap-3">
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isOpen && "rotate-90"
                )}
              />
              <span className="font-semibold">{categoryName}</span>
              <Badge variant="secondary" className="text-xs">
                {templates.length} type{templates.length !== 1 ? "s" : ""}
              </Badge>
              {hasSystem && (
                <Badge variant="outline" className="text-xs">
                  System
                </Badge>
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            {templates.map((template) => (
              <TypeCard
                key={template.id}
                template={template}
                onEdit={() => onEditType(template)}
                onDelete={() => onDeleteType(template)}
                onDuplicate={() => onDuplicate(template)}
              />
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-muted-foreground"
              onClick={() => onAddType(categoryName)}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Type
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
