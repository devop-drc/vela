import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';

const onboardingSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const Onboarding = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setValue('firstName', user.user_metadata?.first_name || '');
        setValue('lastName', user.user_metadata?.last_name || '');
      } else {
        navigate('/login');
      }
      setIsLoading(false);
    };
    fetchUser();
  }, [navigate, setValue]);

  const onSubmit = async (data: OnboardingFormData) => {
    if (!user) return;

    // Update password and user metadata
    const { error: userError } = await supabase.auth.updateUser({
      password: data.password,
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
      }
    });

    if (userError) {
      showError(`Failed to update account: ${userError.message}`);
      return;
    }

    // Mark onboarding as complete
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        onboarding_complete: true,
        first_name: data.firstName,
        last_name: data.lastName,
      })
      .eq('id', user.id);

    if (profileError) {
      showError(`Failed to finalize setup: ${profileError.message}`);
      return;
    }

    showSuccess('Setup complete! Welcome.');
    navigate('/');
  };

  if (isLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to InstaShopify!</CardTitle>
          <CardDescription>Let's finalize your account setup. Please confirm your details and set a password.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.user_metadata?.avatar_url} alt="User avatar" />
                <AvatarFallback>{user.user_metadata?.first_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="grid grid-cols-2 gap-4 flex-1">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" {...register('firstName')} />
                  {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" {...register('lastName')} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Set a Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Setup
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Onboarding;