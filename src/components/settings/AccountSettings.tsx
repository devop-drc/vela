import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Facebook, ExternalLink, Languages, Bell, Trash2, User, Mail, Phone, CheckCircle2, XCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { IntegrationSettings } from './IntegrationSettings';
import { useSearchParams } from 'react-router-dom';

const PreferenceRow = ({ id, title, description, defaultChecked = false }: { id: string, title: string, description: string, defaultChecked?: boolean }) => (
  <div className="flex items-center justify-between p-3 border rounded-lg">
    <div>
      <Label htmlFor={id} className="font-medium">{title}</Label>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <Switch id={id} defaultChecked={defaultChecked} />
  </div>
);

export const AccountSettings = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [facebookId, setFacebookId] = useState<string | null>(null);
  const [integration, setIntegration] = useState<any | null>(null);
  const [searchParams] = useSearchParams();

  const fetchUserAndProfile = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, phone_number')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else {
        setProfile(profileData);
      }

      const facebookIdentity = user.identities?.find(i => i.provider === 'facebook');
      if (facebookIdentity) {
        setFacebookId(facebookIdentity.id);
      }

      const { data: integrationData } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'facebook')
        .maybeSingle();

      setIntegration(integrationData);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUserAndProfile();
  }, [searchParams.get('integration_success')]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'No name set';
  const avatarSrc = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const initials = (profile?.first_name?.[0] || user?.user_metadata?.first_name?.[0] || '?').toUpperCase();

  return (
    <div className="space-y-6">
      {/* Profile hero card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <Avatar className="h-20 w-20 ring-2 ring-border flex-shrink-0">
              <AvatarImage src={avatarSrc || undefined} alt="User avatar" />
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
              {/* Integration status pill */}
              <div className="pt-2">
                {integration ? (
                  <Badge variant="secondary" className="gap-1.5 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connected to Instagram
                    {integration.metadata?.username && (
                      <span className="text-muted-foreground font-normal">· @{integration.metadata.username}</span>
                    )}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5" />
                    Instagram not connected
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {facebookId && (
            <Alert className="mt-5">
              <Facebook className="h-4 w-4" />
              <AlertTitle>Synced from Facebook</AlertTitle>
              <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
                <span>Some profile details may be synced from your connected Facebook account.</span>
                <Button asChild variant="outline" size="sm">
                  <a href={`https://facebook.com/${facebookId}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View on Facebook
                  </a>
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Profile fields — read-only info */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Your personal information on this account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 p-3 rounded-lg bg-muted/50">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> First Name</Label>
              <p className="font-medium">{profile?.first_name || <span className="text-muted-foreground italic">Not set</span>}</p>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-muted/50">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Last Name</Label>
              <p className="font-medium">{profile?.last_name || <span className="text-muted-foreground italic">Not set</span>}</p>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-muted/50">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</Label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-muted/50">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Phone</Label>
              <p className="font-medium">{profile?.phone_number || <span className="text-muted-foreground italic">Not set</span>}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <IntegrationSettings />

      {/* Preferences + Danger in a 2-col layout on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your dashboard experience.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Languages className="h-4 w-4" /> Language</Label>
              <Select defaultValue="en">
                <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sq">Albanian (Shqip)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> Email Notifications</h3>
              <div className="space-y-3">
                <PreferenceRow id="new-sale" title="New Sale" description="Get an email every time you make a sale." />
                <PreferenceRow id="weekly-summary" title="Weekly Summary" description="Receive a summary of your weekly performance." defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Danger Zone
            </CardTitle>
            <CardDescription>Irreversible account actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" className="w-full">Delete Account</Button>
            <p className="text-xs text-muted-foreground mt-2">This action is permanent and cannot be undone.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
