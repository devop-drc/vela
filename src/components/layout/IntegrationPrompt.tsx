import { useIntegration } from '@/contexts/IntegrationContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export const IntegrationPrompt = () => {
  const { isPromptOpen, closePrompt } = useIntegration();

  const handleConnect = () => {
    closePrompt();
    const origin = `${window.location.origin}/settings`;
    window.location.href = `https://ixiafbgaqszlokmzjjio.supabase.co/functions/v1/instagram-auth?origin=${encodeURIComponent(origin)}`;
  };

  return (
    <Dialog open={isPromptOpen} onOpenChange={closePrompt}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Connect Your Instagram Account
          </DialogTitle>
          <DialogDescription className="pt-2 text-left">
            This feature requires a connection to your Instagram Business account to function.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleConnect} className="w-full">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Connect Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};