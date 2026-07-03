"use client";

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { ShoppingBag, Lock, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess, toFriendlyError } from "@/utils/toast";
import { Link, useNavigate } from "react-router-dom";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const resetSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords don't match",
  path: ['confirm'],
});

type ResetFormData = z.infer<typeof resetSchema>;

const ResetPassword = () => {
  const navigate = useNavigate();
  // Supabase fires PASSWORD_RECOVERY when the user arrives from the reset email
  // link; until we have a recovery session we can't update the password.
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  useEffect(() => {
    // The link may already have established a session by the time we mount.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasRecoverySession(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setHasRecoverySession(true);
      }
    });
    // Give the SDK a moment to process the recovery token from the URL.
    const t = setTimeout(() => setHasRecoverySession((v) => (v === null ? false : v)), 2500);
    return () => { subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const onSubmit = async (data: ResetFormData) => {
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) {
      showError(toFriendlyError(error, "Couldn't update your password. Please request a new reset link."));
      return;
    }
    setDone(true);
    showSuccess('Password updated. You can now sign in.');
    setTimeout(() => navigate('/login'), 1500);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <ShoppingBag className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold">Reset password</CardTitle>
          </div>
          <CardDescription>Choose a new password for your InstantShop account.</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
              <p className="text-muted-foreground">Your password has been updated. Redirecting you to sign in…</p>
            </div>
          ) : hasRecoverySession === false ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-muted-foreground">
                This password reset link is invalid or has expired. Please request a new one from the login page.
              </p>
              <Button asChild variant="outline"><Link to="/login">Back to login</Link></Button>
            </div>
          ) : hasRecoverySession === null ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" className="pl-9" placeholder="At least 8 characters" {...register('password')} />
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="confirm" type="password" className="pl-9" {...register('confirm')} />
                </div>
                {errors.confirm && <p className="text-sm text-destructive">{errors.confirm.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update password
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Back to login</Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ResetPassword;
