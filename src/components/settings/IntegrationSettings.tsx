import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Instagram, CheckCircle, XCircle } from 'lucide-react';
import { Spinner } from "@/components/ui/spinner";
import { showError, showSuccess, toFriendlyError } from '@/utils/toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { useAuth } from '@/contexts/AuthContext';

interface IntegrationSettingsProps {
  /** Integration row (provider 'instagram' or legacy 'facebook'), fetched once by the parent. */
  integration: any | null;
  /** True while the parent is still resolving the integration. */
  isLoading?: boolean;
  /** Called after a successful disconnect so the parent can clear its state. */
  onDisconnected?: () => void;
}

export const IntegrationSettings = ({ integration, isLoading = false, onDisconnected }: IntegrationSettingsProps) => {
  const { t } = useTranslation();
  const { user, userId } = useAuth();
  const [disconnectOpen, setDisconnectOpen] = useState(false);

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
    if (!userId) return;
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('user_id', userId)
      .in('provider', ['instagram', 'facebook']);

    if (error) {
      showError(toFriendlyError(error, t("integrations.disconnect_failed")));
    } else {
      showSuccess(t("integrations.disconnected"));
      onDisconnected?.();
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
            <Spinner className="h-8 w-8" />
          </div>
        ) : integration ? (
          <div className="flex items-center justify-between p-4 border border-success/25 rounded-lg bg-success/5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
                <Instagram className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">{t("integrations.fb_ig")}</p>
                <div className="flex items-center gap-1 text-sm text-success">
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
              <Instagram className="h-6 w-6" />
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
