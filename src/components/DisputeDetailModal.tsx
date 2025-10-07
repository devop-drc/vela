import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageSquareWarning, User, Mail, Calendar, Hash, MessageSquareText, Reply } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Dispute {
  id: string;
  order_id: string;
  customer_email: string;
  reason: string;
  message: string | null;
  status: 'Open' | 'In Review' | 'Resolved' | 'Closed';
  reply_message: string | null;
  created_at: string;
  updated_at: string;
}

interface DisputeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispute: Dispute;
  onUpdate: () => void;
}

export const DisputeDetailModal = ({ isOpen, onClose, dispute, onUpdate }: DisputeDetailModalProps) => {
  const [currentStatus, setCurrentStatus] = useState(dispute.status);
  const [replyMessage, setReplyMessage] = useState(dispute.reply_message || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setCurrentStatus(dispute.status);
    setReplyMessage(dispute.reply_message || '');
  }, [dispute]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('order_disputes').update({
        status: currentStatus,
        reply_message: replyMessage,
      }).eq('id', dispute.id);

      if (error) throw error;

      showSuccess("Dispute updated successfully!");
      onUpdate();
      onClose();
    } catch (err: any) {
      console.error("Failed to update dispute:", err);
      showError(`Failed to update dispute: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: Dispute['status']) => {
    switch (status) {
      case 'Open': return 'bg-amber-500';
      case 'In Review': return 'bg-blue-500';
      case 'Resolved': return 'bg-emerald-500';
      case 'Closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareWarning className="h-6 w-6" />
            Dispute for Order #{dispute.order_id.substring(0, 8)}
          </DialogTitle>
          <DialogDescription>
            Review and respond to the customer's reported issue.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Hash className="h-4 w-4" /> Dispute ID</div><p>{dispute.id.substring(0, 8)}</p></div>
              <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><User className="h-4 w-4" /> Customer</div><p>{dispute.customer_email}</p></div>
              <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" /> Reported On</div><p>{new Date(dispute.created_at).toLocaleString()}</p></div>
              <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><MessageSquareText className="h-4 w-4" /> Reason</div><p className="font-medium">{dispute.reason}</p></div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Customer's Message</Label>
              <p className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50 min-h-[80px]">{dispute.message || "No additional message provided."}</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="replyMessage" className="flex items-center gap-2"><Reply className="h-4 w-4" /> Your Reply</Label>
              <Textarea id="replyMessage" rows={5} value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Type your response to the customer here..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Dispute Status</Label>
              <Select value={currentStatus} onValueChange={(value: Dispute['status']) => setCurrentStatus(value)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Change Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Review">In Review</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="pt-4 flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-sm">Current Status:</span>
            <Badge className={cn("text-white", getStatusColor(currentStatus))}>{currentStatus}</Badge>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};