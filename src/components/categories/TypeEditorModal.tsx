import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { showError, showSuccess } from "@/utils/toast";
import { SpecificationEditor, SpecTemplate } from "./SpecificationEditor";
import { OptionEditor, OptionTemplate } from "./OptionEditor";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TypeEditorModalProps {
  open: boolean;
  onClose: () => void;
  categoryName: string;
  template?: any | null;
  onSave: () => void;
}

export const TypeEditorModal = ({
  open,
  onClose,
  categoryName,
  template,
  onSave,
}: TypeEditorModalProps) => {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const [typeName, setTypeName] = useState("");
  const [specs, setSpecs] = useState<SpecTemplate[]>([]);
  const [options, setOptions] = useState<OptionTemplate[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setTypeName(template.type_name ?? "");
      setSpecs(template.default_specifications ?? []);
      setOptions(template.default_options ?? []);
    } else {
      setTypeName("");
      setSpecs([]);
      setOptions([]);
    }
  }, [template, open]);

  const handleSave = async () => {
    if (!typeName.trim()) return;
    if (!userId) {
      showError(t("categories.must_login"));
      return;
    }
    setSaving(true);

    const payload = {
      category_name: categoryName,
      type_name: typeName.trim(),
      default_specifications: specs.filter((s) => s.key.trim()),
      default_options: options.filter((o) => o.name.trim()),
      is_system: false,
      user_id: userId,
    };

    let error;
    if (template && !template.is_system) {
      ({ error } = await supabase
        .from("category_templates")
        .update(payload)
        .eq("id", template.id));
    } else {
      ({ error } = await supabase.from("category_templates").insert(payload));
    }

    if (error) {
      showError(t("categories.save_type_failed", { message: error.message }));
    } else {
      showSuccess(
        template && !template.is_system
          ? t("categories.type_updated", { name: typeName })
          : t("categories.type_added", { name: typeName })
      );
      onSave();
      onClose();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {template && !template.is_system ? t("categories.edit_type") : t("categories.new_type")}
          </DialogTitle>
          <DialogDescription>
            {template && !template.is_system
              ? t("categories.edit_type_desc", { type: template.type_name, category: categoryName })
              : t("categories.new_type_desc", { category: categoryName })}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pt-4 pb-2">
            <div className="space-y-2">
              <Label htmlFor="type-name">{t("categories.type_name")}</Label>
              <Input
                id="type-name"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                placeholder={t("categories.type_name_placeholder")}
              />
            </div>
            <SpecificationEditor specs={specs} onChange={setSpecs} />
            <OptionEditor options={options} onChange={setOptions} />
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || !typeName.trim()}>
            {saving && <Spinner className="mr-2 h-4 w-4" />}
            {t("categories.save_type")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
