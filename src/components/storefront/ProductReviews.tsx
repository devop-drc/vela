import { useState } from "react";
import { Star, Loader2, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

interface LeaveReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  productId: string;
  productName: string;
  customerEmail: string;
  onSubmitted?: (productId: string) => void;
}

/**
 * Lets a customer leave a star rating + comment for a purchased product. Submits
 * to the `submit-review` edge function, which validates the order server-side
 * (must belong to the email and be Fulfilled) before inserting into product_reviews.
 */
export const LeaveReviewDialog = ({
  isOpen,
  onClose,
  orderId,
  productId,
  productName,
  customerEmail,
  onSubmitted,
}: LeaveReviewDialogProps) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setRating(0);
    setHover(0);
    setComment("");
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      showError("Please select a star rating.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-review", {
        body: { orderId, productId, customerEmail, rating, comment },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      showSuccess(data?.message || "Thanks for your review!");
      onSubmitted?.(productId);
      reset();
      onClose();
    } catch (err: any) {
      showError(err.message || "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review “{productName}”</DialogTitle>
          <DialogDescription>Share your experience with this product.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-1 py-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="p-1"
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  "h-8 w-8 transition-colors",
                  (hover || rating) >= star ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                )}
              />
            </button>
          ))}
        </div>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell others what you liked (optional)…"
          rows={4}
          maxLength={2000}
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || rating < 1}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : <><Send className="mr-2 h-4 w-4" /> Submit Review</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveReviewDialog;
