"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError, showSuccess, toFriendlyError } from '@/utils/toast';
import { Loader2, User, Mail, Lock, Phone, Gift } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AuthLayout from '@/components/auth/AuthLayout';

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
  const { i18n } = useTranslation();
  const lang: "sq" | "en" = i18n.language?.startsWith("sq") ? "sq" : "en";
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
        showSuccess(`Almost there! We sent a confirmation link to ${data.email}. Click it to finish setting up your shop.`);
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

        showSuccess('Registration successful! Welcome to InstantShop.');
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      showError(toFriendlyError(error, "Couldn't create your account. Please try again."));
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500/10 to-amber-400/10 px-3 py-1 text-xs font-medium text-fuchsia-600">
          <Gift className="h-3.5 w-3.5" /> {lang === "sq" ? "7 ditë falas — anulo kurdo" : "7 days free — cancel anytime"}
        </span>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">{lang === "sq" ? "Emri" : "First name"}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="firstName" {...register('firstName')} className="h-11 rounded-xl pl-10" />
            </div>
            {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{lang === "sq" ? "Mbiemri" : "Last name"}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="lastName" {...register('lastName')} className="h-11 rounded-xl pl-10" />
            </div>
            {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="email" type="email" placeholder="ti@dyqani.al" {...register('email')} className="h-11 rounded-xl pl-10" />
          </div>
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{lang === "sq" ? "Fjalëkalimi" : "Password"}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="password" type="password" {...register('password')} className="h-11 rounded-xl pl-10" />
          </div>
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">{lang === "sq" ? "Telefoni (opsional)" : "Phone (optional)"}</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="phoneNumber" type="tel" {...register('phoneNumber')} className="h-11 rounded-xl pl-10" />
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting}
          className="h-11 w-full rounded-xl brand-gradient text-white hover:opacity-90">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {lang === "sq" ? "Krijo llogarinë" : "Create account"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {lang === "sq" ? "Ke llogari?" : "Already have an account?"}{" "}
          <Link to="/login" className="font-medium text-fuchsia-600 hover:underline">
            {lang === "sq" ? "Hyr" : "Sign in"}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default Register;