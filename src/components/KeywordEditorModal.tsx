import { useEffect } from "react";
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
import { Loader2 } from "lucide-react";
import { Keyword } from "@/pages/Keywords";

const keywordSchema = z.object({
  keyword: z.string().min(1, "Keyword is required"),
  description: z.string().min(1, "Description is required"),
});

type KeywordFormData = z.infer<typeof keywordSchema>;

interface KeywordEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  keyword: Keyword | null;
}

export const KeywordEditorModal = ({ isOpen, onClose, onSave, keyword }: KeywordEditorModalProps) => {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("You must be logged in.");
      return;
    }

    const payload = { ...data, user_id: user.id };
    let error;

    if (keyword) {
      ({ error } = await supabase.from("keywords").update(payload).eq("id", keyword.id));
    } else {
      ({ error } = await supabase.from("keywords").insert(payload));
    }

    if (error) {
      showError(`Failed to save keyword: ${error.message}`);
    } else {
      showSuccess(`Keyword ${keyword ? 'updated' : 'added'} successfully!`);
      onSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{keyword ? "Edit Keyword" : "Add New Keyword"}</DialogTitle>
          <DialogDescription>
            Define a keyword and tell the AI how to interpret the information that follows it in a caption.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="keyword">Keyword</Label>
            <Input id="keyword" {...register("keyword")} placeholder="e.g., Material, Sizes, Color" />
            {errors.keyword && <p className="text-sm text-destructive mt-1">{errors.keyword.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description for AI</Label>
            <Textarea id="description" {...register("description")} placeholder="e.g., The fabric or substance the product is made of." />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Keyword
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};