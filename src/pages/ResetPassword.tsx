"use client";

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess, toFriendlyError } from "@/utils/toast";
import { Link, useNavigate } from "react-router-dom";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import AuthLayout from '@/components/auth/AuthLayout';
import { useReveal } from '@/lib/anim';

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
  const { i18n } = useTranslation();
  const lang: "sq" | "en" = i18n.language?.startsWith("sq") ? "sq" : "en";
  // Supabase fires PASSWORD_RECOVERY when the user arrives from the reset email
  // link; until we have a recovery session we can't update the password.
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const branch = done ? 'done' : hasRecoverySession === false ? 'invalid' : hasRecoverySession === null ? 'loading' : 'form';
  // Re-run the reveal whenever the branch changes so state swaps cross-fade in
  // instead of hard-cutting.
  const contentRef = useReveal<HTMLDivElement>({ y: 8 }, [branch]);

  return (
    <AuthLayout
      lang={lang}
      title={lang === "sq" ? "Rivendos fjalëkalimin" : "Reset password"}
      subtitle={lang === "sq" ? "Zgjidh një fjalëkalim të ri për llogarinë tënde të Vela." : "Choose a new password for your Vela account."}
      points={lang === "sq"
        ? ["Produktet nga postimet, me AI", "Pagesa me kartë, në Lekë", "Porositë në një panel"]
        : ["Products from posts, with AI", "Card payments, in Lek", "Orders in one panel"]}
    >
      <div ref={contentRef}>
        {branch === 'done' ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center" data-reveal>
            <CheckCircle className="h-10 w-10 text-success" />
            <p className="text-muted-foreground">Your password has been updated. Redirecting you to sign in…</p>
          </div>
        ) : branch === 'invalid' ? (
          <div className="space-y-4 py-6 text-center" data-reveal>
            <p className="text-muted-foreground">
              This password reset link is invalid or has expired. Please request a new one from the login page.
            </p>
            <Button asChild variant="outline"><Link to="/login">Back to login</Link></Button>
          </div>
        ) : branch === 'loading' ? (
          <div className="flex justify-center py-10" data-reveal>
            <Spinner className="h-6 w-6 text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2" data-reveal>
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" {...register('password')} className="h-11 rounded-xl pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2" data-reveal>
              <Label htmlFor="confirm">Confirm new password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="confirm" type={showConfirm ? "text" : "password"} autoComplete="new-password" {...register('confirm')} className="h-11 rounded-xl pl-10 pr-10" />
                <button type="button" onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirm && <p className="text-sm text-destructive">{errors.confirm.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting} data-reveal
              className="h-11 w-full rounded-xl brand-gradient text-white hover:opacity-90">
              {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
              Update password
            </Button>
            <p className="text-center text-sm text-muted-foreground" data-reveal>
              <Link to="/login" className="font-medium text-primary hover:underline">Back to login</Link>
            </p>
          </form>
        )}
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;
