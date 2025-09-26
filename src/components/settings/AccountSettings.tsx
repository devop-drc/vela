import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from '@supabase/supabase-js';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Facebook, ExternalLink, Languages, Bell, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { IntegrationSettings } from './IntegrationSettings';

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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [facebookId, setFacebookId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const facebookIdentity = user.identities?.find(i => i.provider === 'facebook');
        if (facebookIdentity) {
          setFacebookId(facebookIdentity.id);
        }
      }
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>This is your personal information, synced from your connected social account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Facebook className="h-4 w-4" />
              <AlertTitle>Synced from Facebook</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                To update your profile details, please make the changes directly on your Facebook account.
                {facebookId && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`https://facebook.com/${facebookId}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View on Facebook
                    </a>
                  </Button>
                )}
              </AlertDescription>
            </Alert>
            <div className="flex items-center gap-4 pt-2">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.user_metadata.avatar_url} alt="User avatar" />
                <AvatarFallback>{user?.user_metadata.first_name?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <div className="space-y-1">
                  <Label>First Name</Label>
                  <p className="text-lg font-medium">{user?.user_metadata.first_name || 'Not set'}</p>
                </div>
                <div className="space-y-1">
                  <Label>Last Name</Label>
                  <p className="text-lg font-medium">{user?.user_metadata.last_name || 'Not set'}</p>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email Address</Label>
              <p className="text-lg font-medium">{user?.email}</p>
            </div>
          </CardContent>
        </Card>
        <IntegrationSettings />
      </div>
      <div className="space-y-8">
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
            <CardTitle className="text-destructive flex items-center gap-2"><Trash2 className="h-5 w-5" /> Danger Zone</CardTitle>
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