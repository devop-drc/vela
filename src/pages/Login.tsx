"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ShoppingBag, Facebook, Instagram, ExternalLink, CheckCircle, AlertCircle, Mail, Lock } from "lucide-react";
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
import { Loader2 } from 'lucide-react';

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
          <Instagram className="h-5 w-5 text-pink-600" />
          Instagram Business Setup Required
        </DialogTitle>
        <DialogDescription>
          To use InstantShop, you need to connect an Instagram Business or Creator account to your Facebook page.
          This is a common step that sometimes requires specific actions within Instagram and Facebook.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Step 1: Convert to Business/Creator Account
          </h4>
          <p className="text-sm text-muted-foreground pl-6">
            In your Instagram mobile app, go to **Settings and privacy &gt; Account type and tools &gt; Switch to professional account**.
            Choose either "Business" or "Creator".
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Step 2: Link to a Facebook Page
          </h4>
          <p className="text-sm text-muted-foreground pl-6">
            During the professional account setup, you'll be prompted to connect to a Facebook Page.
            If you skipped it, go to **Instagram Profile &gt; Edit Profile &gt; Page** and select the Facebook Page you manage.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Step 3: Grant All Permissions
          </h4>
          <p className="text-sm text-muted-foreground pl-6">
            When you click "Connect with Facebook" below, a popup will ask for permissions.
            **Crucially, click "Edit Settings" and ensure ALL requested permissions are granted** for both your Facebook Page and your Instagram account.
            Without all permissions, the integration will fail.
          </p>
        </div>

        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md mt-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">Need More Help?</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
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
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang: "sq" | "en" = i18n.language?.startsWith("sq") ? "sq" : "en";

  // Already signed in? Go straight to the dashboard — re-authenticating over a
  // live session can wedge the auth client mid-refresh.
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session) navigate('/dashboard', { replace: true });
    });
    return () => { mounted = false; };
  }, [navigate]);

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
    if (!email) {
      showError("Enter your email above first, then tap “Forgot password?”.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) showError(toFriendlyError(error, "Couldn't send the reset email."));
    else showSuccess("Password reset link sent — check your email.");
  };

  return (
    <AuthLayout
      lang={lang}
      title={lang === "sq" ? "Mirë se u ktheve" : "Welcome back"}
      subtitle={lang === "sq" ? "Hyr në llogarinë tënde të InstantShop." : "Sign in to your InstantShop account."}
      points={lang === "sq"
        ? ["Produktet nga postimet, me AI", "Pagesa me kartë, në Lekë", "Porositë në një panel"]
        : ["Products from posts, with AI", "Card payments, in Lek", "Orders in one panel"]}
    >
      <InstagramSetupGuide open={showSetupGuide} onOpenChange={setShowSetupGuide} />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="email" type="email" placeholder="ti@dyqani.al" {...register('email')} className="h-11 rounded-xl pl-10" />
          </div>
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{lang === "sq" ? "Fjalëkalimi" : "Password"}</Label>
            <button type="button" onClick={handleForgotPassword} className="text-xs text-fuchsia-600 hover:underline">
              {lang === "sq" ? "Harrove fjalëkalimin?" : "Forgot password?"}
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="password" type="password" {...register('password')} className="h-11 rounded-xl pl-10" />
          </div>
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" disabled={isSubmitting}
          className="h-11 w-full rounded-xl brand-gradient text-white hover:opacity-90">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {lang === "sq" ? "Hyr" : "Sign in"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {lang === "sq" ? "S'ke llogari?" : "Don't have an account?"}{" "}
          <Link to="/register" className="font-medium text-fuchsia-600 hover:underline">
            {lang === "sq" ? "Regjistrohu falas" : "Register free"}
          </Link>
        </p>
        <button type="button" onClick={() => setShowSetupGuide(true)}
          className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <Instagram className="h-3.5 w-3.5" />
          {lang === "sq" ? "Udhëzuesi i Instagram Business" : "Instagram Business setup guide"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Login;