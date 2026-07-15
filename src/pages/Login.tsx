"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle, AlertCircle, Mail, Lock, Instagram, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess, toFriendlyError } from "@/utils/toast";
import { Link, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import AuthLayout from '@/components/auth/AuthLayout';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from '@/contexts/AuthContext';
import { useReveal } from '@/lib/anim';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const INSTAGRAM_SETUP_GUIDE_URL = 'https://help.instagram.com/502981923235522';

const InstagramSetupGuide = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Instagram className="h-5 w-5 text-primary" />
          Instagram Business Setup Required
        </DialogTitle>
        <DialogDescription>
          To use Vela, you need to connect an Instagram Business or Creator account to your Facebook page.
          This is a common step that sometimes requires specific actions within Instagram and Facebook.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            Step 1: Convert to Business/Creator Account
          </h4>
          <p className="text-sm text-muted-foreground pl-6">
            In your Instagram mobile app, go to <strong className="font-medium text-foreground">Settings and privacy &gt; Account type and tools &gt; Switch to professional account</strong>.
            Choose either "Business" or "Creator".
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            Step 2: Link to a Facebook Page
          </h4>
          <p className="text-sm text-muted-foreground pl-6">
            During the professional account setup, you'll be prompted to connect to a Facebook Page.
            If you skipped it, go to <strong className="font-medium text-foreground">Instagram Profile &gt; Edit Profile &gt; Page</strong> and select the Facebook Page you manage.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            Step 3: Grant All Permissions
          </h4>
          <p className="text-sm text-muted-foreground pl-6">
            When you click "Connect with Facebook" below, a popup will ask for permissions.
            <strong className="font-medium text-foreground"> Crucially, click "Edit Settings" and ensure ALL requested permissions are granted</strong> for both your Facebook Page and your Instagram account.
            Without all permissions, the integration will fail.
          </p>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-md border border-warning/20 bg-warning/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
          <div>
            <p className="font-medium text-foreground">Need More Help?</p>
            <p className="text-sm text-muted-foreground">
              If you're still having trouble, Instagram's official guide can walk you through it.
            </p>
          </div>
        </div>
      </div>

      <DialogFooter className="sm:justify-between">
        <Button variant="outline" asChild>
          <a href={INSTAGRAM_SETUP_GUIDE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            View Official Guide
          </a>
        </Button>
        <Button onClick={() => onOpenChange(false)}>I've Completed Setup</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const Login = () => {
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang: "sq" | "en" = i18n.language?.startsWith("sq") ? "sq" : "en";

  // Already signed in? Go straight to the dashboard — re-authenticating over a
  // live session can wedge the auth client mid-refresh. The shared AuthProvider
  // resolves the session once, so reuse it instead of a fresh getSession().
  const { session, loading } = useAuth();
  useEffect(() => {
    if (!loading && session) navigate('/dashboard', { replace: true });
  }, [loading, session, navigate]);

  const formRef = useReveal<HTMLFormElement>();

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw error;
      }

      showSuccess('Welcome back! Taking you to your dashboard…');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      showError(toFriendlyError(error, "Couldn't sign you in. Please try again."));
    }
  };

  const handleForgotPassword = async () => {
    const email = getValues('email');
    const parsed = loginSchema.shape.email.safeParse(email);
    if (!parsed.success) {
      showError("Enter a valid email above first, then tap “Forgot password?”.");
      return;
    }
    setIsSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) showError(toFriendlyError(error, "Couldn't send the reset email."));
      else showSuccess("Password reset link sent — check your email.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AuthLayout
      lang={lang}
      title={lang === "sq" ? "Mirë se u ktheve" : "Welcome back"}
      subtitle={lang === "sq" ? "Hyr në llogarinë tënde të Vela." : "Sign in to your Vela account."}
      points={lang === "sq"
        ? ["Produktet nga postimet, me AI", "Pagesa me kartë, në Lekë", "Porositë në një panel"]
        : ["Products from posts, with AI", "Card payments, in Lek", "Orders in one panel"]}
    >
      <InstagramSetupGuide open={showSetupGuide} onOpenChange={setShowSetupGuide} />
      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2" data-reveal>
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="ti@dyqani.al" {...register('email')} className="h-11 rounded-xl pl-10" />
          </div>
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2" data-reveal>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{lang === "sq" ? "Fjalëkalimi" : "Password"}</Label>
            <button type="button" onClick={handleForgotPassword} disabled={isSending}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-60">
              {isSending && <Spinner className="h-3 w-3" />}
              {lang === "sq" ? "Harrove fjalëkalimin?" : "Forgot password?"}
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" {...register('password')} className="h-11 rounded-xl pl-10 pr-10" />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" disabled={isSubmitting} data-reveal
          className="h-11 w-full rounded-xl brand-gradient text-white hover:opacity-90">
          {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
          {lang === "sq" ? "Hyr" : "Sign in"}
        </Button>

        <p className="text-center text-sm text-muted-foreground" data-reveal>
          {lang === "sq" ? "S'ke llogari?" : "Don't have an account?"}{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            {lang === "sq" ? "Regjistrohu falas" : "Register free"}
          </Link>
        </p>
        <button type="button" onClick={() => setShowSetupGuide(true)} data-reveal
          className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <Instagram className="h-3.5 w-3.5" />
          {lang === "sq" ? "Udhëzuesi i Instagram Business" : "Instagram Business setup guide"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Login;
