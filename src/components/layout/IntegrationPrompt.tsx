import { useIntegration } from '@/contexts/IntegrationContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, UserCircle, Mail, FileText } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useReveal } from '@/lib/anim';
import { showError } from '@/utils/toast'; // Import showError
import { useTranslation } from "react-i18next";

export const IntegrationPrompt = () => {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const permissions = [
    {
      icon: UserCircle,
      name: t("integrations.perm_profile"),
      description: t("integrations.perm_profile_desc"),
    },
    {
      icon: Mail,
      name: t("integrations.perm_email"),
      description: t("integrations.perm_email_desc"),
    },
    {
      icon: FileText,
      name: t("integrations.perm_media"),
      description: t("integrations.perm_media_desc"),
    },
  ];
  const { isPromptOpen, closePrompt } = useIntegration();
  const revealRef = useReveal<HTMLDivElement>({}, [isPromptOpen]);

  const handleConnect = () => {
    if (!userId) {
      showError(t("integrations.not_authenticated"));
      return;
    }
    closePrompt();
    const origin = `${window.location.origin}/dashboard`; // Redirect back to dashboard
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

    // Pass user ID and apikey to the Instagram auth function
    window.location.href = `${supabaseUrl}/functions/v1/instagram-auth?origin=${encodeURIComponent(origin)}&userId=${userId}&apikey=${apikey}`;
  };

  return (
    <Dialog open={isPromptOpen} onOpenChange={closePrompt}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading font-bold tracking-tight text-center">{t("integrations.prompt_title")}</DialogTitle>
          <DialogDescription className="pt-2 text-center text-base">
            {t("integrations.prompt_desc")}
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 space-y-4">
          <h3 className="font-semibold text-center">{t("integrations.permissions_intro")}</h3>
          <div ref={revealRef} className="space-y-4 rounded-lg border p-4">
            {permissions.map((permission) => (
              <div key={permission.name} data-reveal className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-2">
                  <permission.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium">{permission.name}</p>
                  <p className="text-sm text-muted-foreground">{permission.description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {t("integrations.permissions_note")}
          </p>
        </div>
        <DialogFooter>
          <Button onClick={handleConnect} className="w-full" size="lg" disabled={!userId}>
            <ShieldCheck className="mr-2 h-5 w-5" />
            {t("integrations.secure_connect")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};