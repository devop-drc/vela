import { useEffect, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      showError("You must be logged in.");
      setSaving(false);
      return;
    }

    const payload = {
      category_name: categoryName,
      type_name: typeName.trim(),
      default_specifications: specs.filter((s) => s.key.trim()),
      default_options: options.filter((o) => o.name.trim()),
      is_system: false,
      user_id: user.id,
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
      showError(`Failed to save type: ${error.message}`);
    } else {
      showSuccess(`Type "${typeName}" ${template && !template.is_system ? "updated" : "added"} successfully!`);
      onSave();
      onClose();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {template && !template.is_system ? "Edit Type" : "New Type"}
          </DialogTitle>
          <DialogDescription>
            {template && !template.is_system
              ? `Edit the "${template.type_name}" type in "${categoryName}".`
              : `Add a new type to the "${categoryName}" category.`}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pt-4 pb-2">
            <div className="space-y-2">
              <Label htmlFor="type-name">Type Name</Label>
              <Input
                id="type-name"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                placeholder="e.g. Smartphone"
              />
            </div>
            <SpecificationEditor specs={specs} onChange={setSpecs} />
            <OptionEditor options={options} onChange={setOptions} />
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !typeName.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Type
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
