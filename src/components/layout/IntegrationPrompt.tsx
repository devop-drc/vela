import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

const SESSION_STORAGE_KEY = 'integration_prompt_dismissed';

export const IntegrationPrompt = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkIntegration = async () => {
      const dismissed = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (dismissed) {
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('integrations')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'facebook')
        .maybeSingle();

      if (error) {
        console.error("Error checking integration status:", error);
        return;
      }

      if (!data) {
        setIsOpen(true);
      }
    };

    const timer = setTimeout(checkIntegration, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  const handleConnect = () => {
    setIsOpen(false);
    const origin = `${window.location.origin}/settings`;
    window.location.href = `https://ixiafbgaqszlokmzjjio.supabase.co/functions/v1/instagram-auth?origin=${encodeURIComponent(origin)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Connect Your Instagram Account
          </DialogTitle>
          <DialogDescription className="pt-2 text-left">
            To import posts and create products, we need your permission to access your Instagram Business account via Facebook. We only request the permissions essential for the app to function:
            <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground text-sm">
              <li><strong>Find Your Pages:</strong> To identify the Instagram Business account linked to your Facebook Page.</li>
              <li><strong>Read Your Content:</strong> To access your posts, media, and captions for product creation.</li>
              <li><strong>Business Management:</strong> Required by Facebook to ensure the app can interact with your business assets securely.</li>
            </ul>
            <br />
            Without these permissions, the app's core features will not be available.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={handleDismiss}>Remind Me Later</Button>
          <Button onClick={handleConnect}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Accept Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};