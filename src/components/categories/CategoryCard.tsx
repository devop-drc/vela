import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronRight, PlusCircle, Layers, Lock, MoreHorizontal, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { TypeCard } from "./TypeCard";

interface CategoryCardProps {
  categoryName: string;
  templates: any[];
  onEditType: (template: any) => void;
  onDeleteType: (template: any) => void;
  onAddType: (categoryName: string) => void;
  onDuplicate: (template: any) => void;
  onRenameCategory?: (categoryName: string) => void;
  /** Controlled open override (search auto-expand / expand-all). */
  open?: boolean;
}

export const CategoryCard = ({
  categoryName,
  templates,
  onEditType,
  onDeleteType,
  onAddType,
  onDuplicate,
  onRenameCategory,
  open,
}: CategoryCardProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  // Sync from the controlled override only when it actually changes, so the
  // user can still toggle an individual card afterwards.
  useEffect(() => {
    if (open !== undefined) setIsOpen(open);
  }, [open]);

  const systemCount = templates.filter((tpl) => tpl.is_system).length;
  const allCustom = templates.every((tpl) => !tpl.is_system);
  const totalSpecs = templates.reduce((sum, tpl) => sum + (tpl.default_specifications?.length || 0), 0);
  const totalOptions = templates.reduce((sum, tpl) => sum + (tpl.default_options?.length || 0), 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center">
          <CollapsibleTrigger asChild>
            <button className="flex flex-1 min-w-0 items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors">
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                  isOpen && "rotate-90"
                )}
              />
              <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm">{categoryName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="text-xs h-5">
                  {templates.length === 1
                    ? t("categories.type_count", { count: templates.length })
                    : t("categories.type_count_plural", { count: templates.length })}
                </Badge>
                {totalSpecs > 0 && (
                  <span className="hidden sm:inline text-xs text-muted-foreground">{t("categories.specs_count", { count: totalSpecs })}</span>
                )}
                {totalOptions > 0 && (
                  <span className="hidden sm:inline text-xs text-muted-foreground">{t("categories.opts_count", { count: totalOptions })}</span>
                )}
                {systemCount > 0 && (
                  <Lock className="h-3 w-3 text-muted-foreground/50" />
                )}
              </div>
            </button>
          </CollapsibleTrigger>
          {allCustom && onRenameCategory && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-2 h-7 w-7 shrink-0 text-muted-foreground"
                  aria-label={t("categories.rename_category")}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onRenameCategory(categoryName)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  {t("categories.rename_category")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-2 border-t pt-3">
            {templates.map((template) => (
              <TypeCard
                key={template.id}
                template={template}
                onEdit={() => onEditType(template)}
                onDelete={() => onDeleteType(template)}
                onDuplicate={() => onDuplicate(template)}
              />
            ))}
            <button
              className="w-full rounded-lg border border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 py-2.5 text-center transition-colors flex items-center justify-center gap-2"
              onClick={() => onAddType(categoryName)}
            >
              <PlusCircle className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t("categories.add_type_to", { name: categoryName })}</span>
            </button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
