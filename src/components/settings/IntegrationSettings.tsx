import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, Facebook, CheckCircle, XCircle } from 'lucide-react';
import { showError, showSuccess, toFriendlyError } from '@/utils/toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { User } from '@supabase/supabase-js';
import { useTranslation } from "react-i18next";

export const IntegrationSettings = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [integration, setIntegration] = useState<any | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

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
        showError(t("integrations.check_failed"));
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
    if (!user) {
      showError(t("integrations.must_login_connect"));
      return;
    }
    const origin = `${window.location.origin}/settings`;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

    // Pass user ID and apikey to the Instagram auth function
    window.location.href = `${supabaseUrl}/functions/v1/instagram-auth?origin=${encodeURIComponent(origin)}&userId=${user.id}&apikey=${apikey}`;
  };

  const handleDisconnect = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'facebook');

    if (error) {
      showError(toFriendlyError(error, t("integrations.disconnect_failed")));
    } else {
      showSuccess(t("integrations.disconnected"));
      setIntegration(null);
    }
    setDisconnectOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("integrations.title")}</CardTitle>
        <CardDescription>{t("integrations.description")}</CardDescription>
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
                <p className="font-semibold">{t("integrations.fb_ig")}</p>
                <div className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>{t("integrations.connected")}</span>
                </div>
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setDisconnectOpen(true)}>
              <XCircle className="mr-2 h-4 w-4" />
              {t("integrations.disconnect")}
            </Button>
            <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("integrations.disconnect_title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("integrations.disconnect_desc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDisconnect(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("integrations.disconnect")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Facebook className="h-6 w-6" />
              <div>
                <p className="font-semibold">{t("integrations.fb_ig")}</p>
                <p className="text-sm text-muted-foreground">{t("integrations.not_connected")}</p>
              </div>
            </div>
            <Button onClick={handleConnect}>
              {t("integrations.connect")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};