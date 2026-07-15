import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Facebook, ExternalLink, Languages, Bell, Trash2, User, Mail, Phone, CheckCircle2, XCircle, Info } from 'lucide-react';
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui-app";
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { IntegrationSettings } from './IntegrationSettings';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { showError, showSuccess, toFriendlyError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { useReveal } from "@/lib/anim";

const PreferenceRow = ({ id, title, description, defaultChecked = false, comingSoon = false, comingSoonLabel }: { id: string, title: string, description: string, defaultChecked?: boolean, comingSoon?: boolean, comingSoonLabel?: string }) => (
  <div className="flex items-center justify-between p-3 border rounded-lg">
    <div>
      <Label htmlFor={id} className="font-medium flex items-center gap-2">
        {title}
        {comingSoon && <Badge variant="secondary" className="text-[10px] font-normal">{comingSoonLabel}</Badge>}
      </Label>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <Switch id={id} defaultChecked={defaultChecked} disabled={comingSoon} />
  </div>
);

export const AccountSettings = () => {
  const { user, userId } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [integration, setIntegration] = useState<any | null>(null);
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Facebook identity is available instantly from the cached session user.
  const facebookId = user?.identities?.find(i => i.provider === 'facebook')?.id ?? null;

  const revealRef = useReveal({}, [isLoading]);

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await supabase.auth.signOut();
      showSuccess(t("settings.account_deleted"));
      window.location.href = '/login';
    } catch (err) {
      showError(toFriendlyError(err, t("settings.delete_account_failed")));
      setIsDeletingAccount(false);
      setDeleteConfirmOpen(false);
    }
  };

  // Fetch profile + the (single) integration row once, using the cached user id
  // from AuthContext — no getUser() round-trip. IntegrationSettings receives the
  // same integration via props so the two connection surfaces can't diverge.
  const fetchProfileAndIntegration = async (uid: string) => {
    setIsLoading(true);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url, phone_number')
      .eq('id', uid)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    } else {
      setProfile(profileData);
    }

    const { data: integrationData } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', uid)
      .eq('provider', 'facebook')
      .maybeSingle();

    setIntegration(integrationData);
    setIsLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    fetchProfileAndIntegration(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, searchParams.get('integration_success')]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || t("settings.no_name");
  const avatarSrc = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const initials = (profile?.first_name?.[0] || user?.user_metadata?.first_name?.[0] || '?').toUpperCase();

  return (
    <div ref={revealRef} className="space-y-6">
      {/* Profile hero card */}
      <Card data-reveal>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <Avatar className="h-20 w-20 ring-2 ring-border flex-shrink-0">
              <AvatarImage src={avatarSrc || undefined} alt={t("settings.user_avatar")} />
              <AvatarFallback className="text-2xl font-semibold">
                {avatarSrc ? <User className="h-10 w-10" /> : initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left space-y-1">
              <h3 className="text-xl font-semibold">{displayName}</h3>
              <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="h-4 w-4" />
                {user?.email}
              </p>
              {profile?.phone_number && (
                <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
                  <Phone className="h-4 w-4" />
                  {profile.phone_number}
                </p>
              )}
              {/* Integration status pill — at-a-glance summary (actions live in the card below) */}
              <div className="pt-2 flex justify-center sm:justify-start">
                {integration ? (
                  <StatusBadge tone="success" icon={<CheckCircle2 />}>
                    {t("settings.connected_ig")}
                    {integration.metadata?.username && (
                      <span className="ml-1 font-normal opacity-80">@{integration.metadata.username}</span>
                    )}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="neutral" icon={<XCircle />}>
                    {t("settings.not_connected_ig")}
                  </StatusBadge>
                )}
              </div>
            </div>
          </div>

          {facebookId && (
            <Alert className="mt-5">
              <Facebook className="h-4 w-4" />
              <AlertTitle>{t("settings.synced_fb")}</AlertTitle>
              <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
                <span>{t("settings.synced_fb_desc")}</span>
                <Button asChild variant="outline" size="sm">
                  <a href={`https://facebook.com/${facebookId}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t("settings.view_fb")}
                  </a>
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Profile fields — read-only info */}
      <Card data-reveal>
        <CardHeader>
          <CardTitle>{t("settings.profile_details")}</CardTitle>
          <CardDescription>{t("settings.profile_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 p-3 rounded-lg bg-muted/50">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {t("settings.first_name")}</Label>
              <p className="font-medium">{profile?.first_name || <span className="text-muted-foreground italic">{t("settings.not_set")}</span>}</p>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-muted/50">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {t("settings.last_name")}</Label>
              <p className="font-medium">{profile?.last_name || <span className="text-muted-foreground italic">{t("settings.not_set")}</span>}</p>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-muted/50">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {t("settings.email")}</Label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-muted/50">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {t("settings.phone")}</Label>
              <p className="font-medium">{profile?.phone_number || <span className="text-muted-foreground italic">{t("settings.not_set")}</span>}</p>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>{t("settings.profile_readonly_hint")}</span>
          </p>
        </CardContent>
      </Card>

      {/* Integrations — owns the connect/disconnect action, driven by the shared fetch */}
      <div data-reveal>
        <IntegrationSettings integration={integration} isLoading={isLoading} onDisconnected={() => setIntegration(null)} />
      </div>

      {/* Preferences + Danger in a 2-col layout on larger screens */}
      <div data-reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.preferences")}</CardTitle>
            <CardDescription>{t("settings.preferences_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Languages className="h-4 w-4" /> {t("settings.language")}</Label>
              <Select value={i18n.language} onValueChange={(v) => i18n.changeLanguage(v)}>
                <SelectTrigger><SelectValue placeholder={t("settings.select_language")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sq">Albanian (Shqip)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> {t("settings.email_notif")}</h3>
              <div className="space-y-3">
                <PreferenceRow id="new-sale" title={t("settings.new_sale_notif")} description={t("settings.new_sale_notif_desc")} comingSoon comingSoonLabel={t("settings.coming_soon")} />
                <PreferenceRow id="weekly-summary" title={t("settings.weekly_summary")} description={t("settings.weekly_summary_desc")} defaultChecked comingSoon comingSoonLabel={t("settings.coming_soon")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> {t("settings.danger_zone")}
            </CardTitle>
            <CardDescription>{t("settings.danger_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" className="w-full" onClick={() => setDeleteConfirmOpen(true)}>{t("settings.delete_account")}</Button>
            <p className="text-xs text-muted-foreground mt-2">{t("settings.delete_warning")}</p>
            <AlertDialog open={deleteConfirmOpen} onOpenChange={(o) => { if (!isDeletingAccount) setDeleteConfirmOpen(o); }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("settings.delete_account_title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("settings.delete_account_desc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingAccount}>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }} disabled={isDeletingAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {isDeletingAccount && <Spinner className="mr-2 h-4 w-4" />}
                    {t("settings.delete_account_confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
