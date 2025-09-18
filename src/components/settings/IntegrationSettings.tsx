import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, Facebook, CheckCircle, XCircle } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { User } from '@supabase/supabase-js';

export const IntegrationSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [integration, setIntegration] = useState<any | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const checkIntegration = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'facebook')
        .maybeSingle();
      
      if (error) {
        showError("Failed to check integration status.");
      } else {
        setIntegration(data);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    checkIntegration();
  }, []);

  const handleConnect = () => {
    const origin = `${window.location.origin}/settings`;
    window.location.href = `https://ixiafbgaqszlokmzjjio.supabase.co/functions/v1/instagram-auth?origin=${encodeURIComponent(origin)}`;
  };

  const handleDisconnect = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'facebook');

    if (error) {
      showError(`Failed to disconnect: ${error.message}`);
    } else {
      showSuccess("Successfully disconnected from Facebook.");
      setIntegration(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>Connect your social accounts to import content and enable features.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : integration ? (
          <div className="flex items-center justify-between p-4 border rounded-lg bg-accent text-accent-foreground">
            <div className="flex items-center gap-3">
              <Facebook className="h-6 w-6" />
              <div>
                <p className="font-semibold">Facebook & Instagram</p>
                <div className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Connected</span>
                </div>
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={handleDisconnect}>
              <XCircle className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Facebook className="h-6 w-6" />
              <div>
                <p className="font-semibold">Facebook & Instagram</p>
                <p className="text-sm text-muted-foreground">Not connected</p>
              </div>
            </div>
            <Button onClick={handleConnect}>
              Connect
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};