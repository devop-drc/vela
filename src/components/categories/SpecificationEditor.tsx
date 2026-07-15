import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpecTemplate {
  key: string;
  label: string;
  unit: string | null;
  common_values: string[] | null;
}

interface SpecificationEditorProps {
  specs: SpecTemplate[];
  onChange: (specs: SpecTemplate[]) => void;
}

/** Derive a machine key from a human label (material, screen_size, …). */
const slugify = (label: string) =>
  label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const SpecificationEditor = ({ specs, onChange }: SpecificationEditorProps) => {
  const { t } = useTranslation();
  // Raw text buffer per row for the comma field, so typing isn't normalized
  // (split→trim→join) on every keystroke — parsed into the array only on blur.
  const [valueBuffer, setValueBuffer] = useState<Record<number, string>>({});

  const handleField = (index: number, field: "label" | "unit", value: string) => {
    const updated = [...specs];
    if (field === "label") {
      updated[index] = { ...updated[index], label: value, key: slugify(value) };
    } else {
      updated[index] = { ...updated[index], unit: value || null };
    }
    onChange(updated);
  };

  const commitValues = (index: number) => {
    const raw = valueBuffer[index];
    if (raw === undefined) return;
    const parsed = raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const updated = [...specs];
    updated[index] = { ...updated[index], common_values: parsed.length ? parsed : null };
    onChange(updated);
    setValueBuffer((b) => {
      const next = { ...b };
      delete next[index];
      return next;
    });
  };

  const handleAdd = () => {
    setValueBuffer({});
    onChange([...specs, { key: "", label: "", unit: null, common_values: null }]);
  };

  const handleRemove = (index: number) => {
    setValueBuffer({});
    onChange(specs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{t("categories.specifications")}</Label>
        <p className="text-xs text-muted-foreground">{t("categories.specs_hint")}</p>
      </div>
      {specs.length === 0 && (
        <p className="text-xs text-muted-foreground/70">{t("categories.no_specs_yet")}</p>
      )}
      {specs.map((spec, index) => (
        <div
          key={index}
          className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_80px_1.5fr_auto] sm:items-end"
        >
          <div className="space-y-1">
            <Label className={cn("text-xs text-muted-foreground", index !== 0 && "sm:hidden")}>
              {t("categories.field_label")}
            </Label>
            <Input
              value={spec.label}
              onChange={(e) => handleField(index, "label", e.target.value)}
              placeholder={t("categories.spec_label_placeholder")}
            />
          </div>
          <div className="space-y-1">
            <Label className={cn("text-xs text-muted-foreground", index !== 0 && "sm:hidden")}>
              {t("categories.field_unit")}
            </Label>
            <Input
              value={spec.unit ?? ""}
              onChange={(e) => handleField(index, "unit", e.target.value)}
              placeholder={t("categories.spec_unit_placeholder")}
            />
          </div>
          <div className="space-y-1">
            <Label className={cn("text-xs text-muted-foreground", index !== 0 && "sm:hidden")}>
              {t("categories.field_common_values")}
            </Label>
            <Input
              value={valueBuffer[index] ?? spec.common_values?.join(", ") ?? ""}
              onChange={(e) => setValueBuffer((b) => ({ ...b, [index]: e.target.value }))}
              onBlur={() => commitValues(index)}
              placeholder={t("categories.spec_values_placeholder")}
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
        {t("categories.add_specification")}
      </Button>
    </div>
  );
};
