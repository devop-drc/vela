import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui-app";
import { Lock, Pencil, Trash2, Copy, Wrench, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

interface TypeCardProps {
  template: any;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const TypeCard = ({ template, onEdit, onDelete, onDuplicate }: TypeCardProps) => {
  const { t } = useTranslation();
  const specs: any[] = template.default_specifications ?? [];
  const options: any[] = template.default_options ?? [];

  return (
    <div className={cn(
      "rounded-lg border p-3 transition-colors",
      template.is_system ? "bg-muted/20" : "bg-card hover:bg-accent/30"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Type name + badges */}
          <div className="flex items-center gap-2 mb-2">
            {template.is_system && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
            <span className="font-medium text-sm">{template.type_name}</span>
            {!template.is_system && (
              <StatusBadge tone="brand" size="sm">{t("categories.custom")}</StatusBadge>
            )}
          </div>

          {/* Specs */}
          {specs.length > 0 && (
            <div className="flex items-start gap-1.5 mb-1.5">
              <Wrench className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex flex-wrap gap-1">
                {specs.slice(0, 8).map((spec: any, i: number) => (
                  <span key={i} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {spec.label || spec.key}
                    {spec.unit && <span className="opacity-50 ml-0.5">({spec.unit})</span>}
                  </span>
                ))}
                {specs.length > 8 && <span className="text-xs text-muted-foreground">+{specs.length - 8}</span>}
              </div>
            </div>
          )}

          {/* Options */}
          {options.length > 0 && (
            <div className="flex items-start gap-1.5">
              <Palette className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex flex-wrap gap-1">
                {options.map((opt: any, i: number) => (
                  <span key={i} className="text-xs text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                    {opt.name}
                    {opt.common_values?.length > 0 && <span className="opacity-60 ml-0.5">({opt.common_values.length})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {specs.length === 0 && options.length === 0 && (
            <p className="text-xs text-muted-foreground/60">{t("categories.no_specs_options")}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {template.is_system ? (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onDuplicate}>
              <Copy className="mr-1 h-3 w-3" />
              {t("categories.duplicate")}
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
