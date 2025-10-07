import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  customerEmail: string;
  onIssueReported: () => void;
}

export const ReportIssueModal = ({ isOpen, onClose, orderId, customerEmail, onIssueReported }: ReportIssueModalProps) => {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!reason) {
      showError("Please select a reason for the issue.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from('order_disputes').insert({
        order_id: orderId,
        customer_email: customerEmail,
        reason,
        message,
        status: 'Open',
      });

      if (error) throw error;

      showSuccess("Issue reported successfully! We will get back to you soon.");
      onIssueReported();
      onClose();
    } catch (err: any) {
      console.error("Failed to report issue:", err);
      showError(`Failed to report issue: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report an Issue with Order #{orderId.substring(0, 8)}</DialogTitle>
          <DialogDescription>
            Please tell us what went wrong with your order. We'll review it and get back to you.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Issue</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Delivery Late">Delivery Late</SelectItem>
                <SelectItem value="Product Missing">Product Missing</SelectItem>
                <SelectItem value="Product Damaged">Product Damaged</SelectItem>
                <SelectItem value="Incorrect Product">Incorrect Product</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Your Message (Optional)</Label>
            <Textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Provide more details about the issue..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !reason}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};