import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Instagram, AlertTriangle } from 'lucide-react';

const SESSION_STORAGE_KEY = 'integration_prompt_dismissed';

export const IntegrationPrompt = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

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
    navigate('/settings', { state: { focus: 'integrations' } });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Connect Your Instagram Account
          </DialogTitle>
          <DialogDescription className="pt-2">
            To start importing posts and creating products, you need to connect your Instagram Business account. This allows the app to securely access your media.
            <br /><br />
            Without this connection, most of the app's features will not be available.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={handleDismiss}>Remind Me Later</Button>
          <Button onClick={handleConnect}>
            <Instagram className="mr-2 h-4 w-4" />
            Go to Settings to Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};