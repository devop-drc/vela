import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Instagram, CheckCircle, CreditCard } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { AvatarUploader } from './AvatarUploader';

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  avatar_url: z.string().url().nullable(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const AccountSettings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [integrationStatus, setIntegrationStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const avatarUrl = watch('avatar_url');
  const firstName = watch('first_name');

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        reset({
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          avatar_url: profile?.avatar_url || null,
        });
      }
      setIsLoading(false);
    };
    fetchProfile();
  }, [reset]);

  useEffect(() => {
    const checkIntegration = async () => {
      if (!user) return;
      const { data } = await supabase.from('integrations').select('id').eq('user_id', user.id).eq('provider', 'facebook').maybeSingle();
      setIntegrationStatus(data ? 'connected' : 'disconnected');
    };
    checkIntegration();
  }, [user]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update(data).eq('id', user.id);
    if (error) {
      showError(`Failed to update profile: ${error.message}`);
    } else {
      showSuccess('Profile updated successfully!');
      reset(data);
    }
  };

  const handleAvatarUpload = (newUrl: string) => {
    setValue('avatar_url', newUrl, { shouldDirty: true });
  };

  const handleConnectInstagram = () => {
    const origin = `${window.location.origin}/settings`;
    window.location.href = `https://ixiafbgaqszlokmzjjio.supabase.co/functions/v1/instagram-auth?origin=${encodeURIComponent(origin)}`;
  };

  const handleDisconnectInstagram = async () => {
    if (!user) return;
    const { error } = await supabase.from('integrations').delete().eq('user_id', user.id).eq('provider', 'facebook');
    if (error) { showError("Failed to disconnect."); } 
    else { showSuccess("Successfully disconnected."); setIntegrationStatus('disconnected'); }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="space-y-8">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2 space-y-8">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>This is your personal information. It is not displayed publicly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AvatarUploader currentAvatarUrl={avatarUrl} userName={firstName} onUpload={handleAvatarUpload} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input id="first_name" {...register('first_name')} />
                  {errors.first_name && <p className="text-sm text-destructive">{errors.first_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" {...register('last_name')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email || ''} disabled />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Profile
              </Button>
            </CardFooter>
          </Card>
        </form>
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your dashboard experience and notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select defaultValue="en">
                <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select language" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sq">Albanian (Shqip)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Email Notifications</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div><Label htmlFor="new-sale" className="font-medium">New Sale</Label><p className="text-sm text-muted-foreground">Get an email every time you make a sale.</p></div>
                  <Switch id="new-sale" />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div><Label htmlFor="weekly-summary" className="font-medium">Weekly Summary</Label><p className="text-sm text-muted-foreground">Receive a summary of your weekly performance.</p></div>
                  <Switch id="weekly-summary" defaultChecked />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Connect your social accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            {integrationStatus === 'loading' && <Skeleton className="h-10 w-full" />}
            {integrationStatus === 'disconnected' && <Button onClick={handleConnectInstagram} className="w-full"><Instagram className="mr-2 h-4 w-4" />Connect with Facebook</Button>}
            {integrationStatus === 'connected' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center text-green-600"><CheckCircle className="mr-2 h-5 w-5" /><span className="font-medium">Connected to Facebook</span></div>
                <Button variant="outline" onClick={handleDisconnectInstagram}>Disconnect</Button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Manage your subscription.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg bg-accent/50">
              <div><h4 className="font-semibold">Pro Plan</h4><p className="text-sm text-muted-foreground">$25.00 per month</p></div>
              <Button variant="outline" size="sm">Manage</Button>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Payment Method</h4>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <CreditCard className="h-6 w-6" />
                <div><p className="font-medium">Visa ending in 1234</p><p className="text-sm text-muted-foreground">Expires 06/2025</p></div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="link" className="p-0 h-auto">View Billing History</Button>
          </CardFooter>
        </Card>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
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