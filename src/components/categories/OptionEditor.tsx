import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OptionTemplate {
  name: string;
  common_values: string[];
}

interface OptionEditorProps {
  options: OptionTemplate[];
  onChange: (options: OptionTemplate[]) => void;
}

export const OptionEditor = ({ options, onChange }: OptionEditorProps) => {
  const { t } = useTranslation();
  // Raw text buffer per row so the comma field isn't normalized mid-typing.
  const [valueBuffer, setValueBuffer] = useState<Record<number, string>>({});

  const handleName = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = { ...updated[index], name: value };
    onChange(updated);
  };

  const commitValues = (index: number) => {
    const raw = valueBuffer[index];
    if (raw === undefined) return;
    const parsed = raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const updated = [...options];
    updated[index] = { ...updated[index], common_values: parsed };
    onChange(updated);
    setValueBuffer((b) => {
      const next = { ...b };
      delete next[index];
      return next;
    });
  };

  const handleAdd = () => {
    setValueBuffer({});
    onChange([...options, { name: "", common_values: [] }]);
  };

  const handleRemove = (index: number) => {
    setValueBuffer({});
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{t("categories.options_variants")}</Label>
        <p className="text-xs text-muted-foreground">{t("categories.options_hint")}</p>
      </div>
      {options.length === 0 && (
        <p className="text-xs text-muted-foreground/70">{t("categories.no_options_yet")}</p>
      )}
      {options.map((option, index) => (
        <div
          key={index}
          className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
        >
          <div className="space-y-1">
            <Label className={cn("text-xs text-muted-foreground", index !== 0 && "sm:hidden")}>
              {t("categories.field_name")}
            </Label>
            <Input
              value={option.name}
              onChange={(e) => handleName(index, e.target.value)}
              placeholder={t("categories.option_name_placeholder")}
            />
          </div>
          <div className="space-y-1">
            <Label className={cn("text-xs text-muted-foreground", index !== 0 && "sm:hidden")}>
              {t("categories.field_common_values")}
            </Label>
            <Input
              value={valueBuffer[index] ?? option.common_values.join(", ")}
              onChange={(e) => setValueBuffer((b) => ({ ...b, [index]: e.target.value }))}
              onBlur={() => commitValues(index)}
              placeholder={t("categories.option_values_placeholder")}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="justify-self-end text-destructive hover:text-destructive"
            onClick={() => handleRemove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
        <PlusCircle className="mr-2 h-4 w-4" />
        {t("categories.add_option")}
      </Button>
    </div>
  );
};
