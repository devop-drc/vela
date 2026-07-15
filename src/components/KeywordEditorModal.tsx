import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { Keyword } from "@/pages/Keywords";

const keywordSchema = z.object({
  keyword: z.string().min(1, "keywords.keyword_required"),
  description: z.string().min(1, "keywords.desc_required"),
});

type KeywordFormData = z.infer<typeof keywordSchema>;

interface KeywordEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  keyword: Keyword | null;
}

export const KeywordEditorModal = ({ isOpen, onClose, onSave, keyword }: KeywordEditorModalProps) => {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<KeywordFormData>({
    resolver: zodResolver(keywordSchema),
  });

  useEffect(() => {
    if (keyword) {
      reset(keyword);
    } else {
      reset({ keyword: "", description: "" });
    }
  }, [keyword, reset]);

  const onSubmit = async (data: KeywordFormData) => {
    if (!userId) {
      showError(t("keywords.must_login"));
      return;
    }

    const payload = { ...data, user_id: userId };
    let error;

    if (keyword) {
      ({ error } = await supabase.from("keywords").update(payload).eq("id", keyword.id));
    } else {
      ({ error } = await supabase.from("keywords").insert(payload));
    }

    if (error) {
      showError(t("keywords.save_failed", { message: error.message }));
    } else {
      showSuccess(keyword ? t("keywords.saved_updated") : t("keywords.saved_added"));
      onSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{keyword ? t("keywords.edit_keyword") : t("keywords.add_new_keyword")}</DialogTitle>
          <DialogDescription>
            {t("keywords.modal_desc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="keyword">{t("keywords.keyword_label")}</Label>
            <Input id="keyword" autoFocus {...register("keyword")} placeholder={t("keywords.keyword_placeholder")} />
            {errors.keyword && <p className="text-sm text-destructive mt-1">{t(errors.keyword.message)}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("keywords.desc_label")}</Label>
            <Textarea id="description" {...register("description")} placeholder={t("keywords.desc_placeholder")} />
            {errors.description && <p className="text-sm text-destructive mt-1">{t(errors.description.message)}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
              {t("keywords.save_keyword")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};