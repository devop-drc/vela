"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError, showSuccess, toFriendlyError } from '@/utils/toast';
import { User, Mail, Lock, Phone, Gift, Eye, EyeOff } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from 'react-i18next';
import AuthLayout from '@/components/auth/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useReveal } from '@/lib/anim';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phoneNumber: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const Register = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang: "sq" | "en" = i18n.language?.startsWith("sq") ? "sq" : "en";
  const [showPassword, setShowPassword] = useState(false);

  // Already signed in? Send them to the dashboard so a logged-in user can't
  // re-run the profile/business bootstrap by re-submitting the signup form.
  const { session, loading } = useAuth();
  useEffect(() => {
    if (!loading && session) navigate('/dashboard', { replace: true });
  }, [loading, session, navigate]);

  const formRef = useReveal<HTMLFormElement>();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      // 1. Sign up the user with email and password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            full_name: `${data.firstName} ${data.lastName}`,
            phone_number: data.phoneNumber,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      // If email confirmation is enabled, there's a user but no active session yet.
      // We can't write profile rows under RLS without a session, and a DB trigger
      // sets up the business on confirmation — so guide the user to their inbox.
      if (authData.user && !authData.session) {
        showSuccess(t("misc.register_confirm_email", { defaultValue: "Almost there! We sent a confirmation link to {{email}}. Click it to finish setting up your shop.", email: data.email }));
        navigate('/login');
        return;
      }

      if (authData.user && authData.session) {
        const userId = authData.user.id;

        // 2. Create a profile entry (or update if it somehow exists)
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: userId,
          first_name: data.firstName,
          last_name: data.lastName,
          onboarding_complete: true, // Onboarding is complete as details are provided here
        }, { onConflict: 'id' }); // Conflict on 'id' (which is user_id)
        if (profileError) throw profileError;

        // 3. Create a business entry (or update if it somehow exists)
        const { data: businessData, error: businessError } = await supabase.from('businesses').upsert({
          user_id: userId,
          name: `${data.firstName}'s Business`,
        }, { onConflict: 'user_id' }).select('id').single(); // Conflict on 'user_id'
        if (businessError) throw businessError;

        // 4. Create a default shop_details entry (or update if it somehow exists)
        const { error: shopDetailsError } = await supabase.from('shop_details').upsert({
          business_id: businessData.id,
          shop_name: `${data.firstName}'s Shop`,
          slug: `${data.firstName.toLowerCase()}-shop`,
          currency: 'USD',
          contact_email: data.email,
        }, { onConflict: 'business_id' }); // Conflict on 'business_id'
        if (shopDetailsError) throw shopDetailsError;

        showSuccess(t("misc.register_success", "Registration successful! Welcome to Vela."));
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      showError(toFriendlyError(error, t("misc.register_failed", "Couldn't create your account. Please try again.")));
    }
  };

  return (
    <AuthLayout
      lang={lang}
      title={lang === "sq" ? "Krijo dyqanin tënd" : "Create your shop"}
      subtitle={lang === "sq" ? "Regjistrohu dhe nis provën falas 7-ditore." : "Register and start your 7-day free trial."}
      points={lang === "sq"
        ? ["Aktiv brenda minutash", "7 ditë provë falas", "Pa kod, pa dizajner"]
        : ["Live in minutes", "7-day free trial", "No code, no designer"]}
    >
      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary" data-reveal>
          <Gift className="h-3.5 w-3.5" /> {lang === "sq" ? "7 ditë falas — anulo kurdo" : "7 days free — cancel anytime"}
        </span>

        <div className="grid grid-cols-2 gap-3" data-reveal>
          <div className="space-y-2">
            <Label htmlFor="firstName">{lang === "sq" ? "Emri" : "First name"}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="firstName" autoComplete="given-name" {...register('firstName')} className="h-11 rounded-xl pl-10" />
            </div>
            {errors.firstName && <p className="text-sm text-destructive">{t("misc.first_name_required", "First name is required")}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{lang === "sq" ? "Mbiemri" : "Last name"}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="lastName" autoComplete="family-name" {...register('lastName')} className="h-11 rounded-xl pl-10" />
            </div>
            {errors.lastName && <p className="text-sm text-destructive">{t("misc.last_name_required", "Last name is required")}</p>}
          </div>
        </div>
        <div className="space-y-2" data-reveal>
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="ti@dyqani.al" {...register('email')} className="h-11 rounded-xl pl-10" />
          </div>
          {errors.email && <p className="text-sm text-destructive">{t("settings.invalid_email", "Enter a valid email address.")}</p>}
        </div>
        <div className="space-y-2" data-reveal>
          <Label htmlFor="password">{lang === "sq" ? "Fjalëkalimi" : "Password"}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" {...register('password')} className="h-11 rounded-xl pl-10 pr-10" />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t("misc.hide_password", "Hide password") : t("misc.show_password", "Show password")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-destructive">{t("misc.password_min", "Password must be at least 8 characters")}</p>}
        </div>
        <div className="space-y-2" data-reveal>
          <Label htmlFor="phoneNumber">{lang === "sq" ? "Telefoni (opsional)" : "Phone (optional)"}</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="phoneNumber" type="tel" autoComplete="tel" inputMode="tel" {...register('phoneNumber')} className="h-11 rounded-xl pl-10" />
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} data-reveal
          className="h-11 w-full rounded-xl brand-gradient text-white hover:opacity-90">
          {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
          {lang === "sq" ? "Krijo llogarinë" : "Create account"}
        </Button>

        <p className="text-center text-sm text-muted-foreground" data-reveal>
          {lang === "sq" ? "Ke llogari?" : "Already have an account?"}{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {lang === "sq" ? "Hyr" : "Sign in"}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default Register;
