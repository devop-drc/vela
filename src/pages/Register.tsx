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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, ShoppingBag, User, Mail, Lock, Phone } from 'lucide-react';

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

      if (authData.user) {
        const userId = authData.user.id;

        // 2. Create a profile entry
        const { error: profileError } = await supabase.from('profiles').insert({
          id: userId,
          first_name: data.firstName,
          last_name: data.lastName,
          onboarding_complete: true, // Onboarding is complete as details are provided here
        });
        if (profileError) throw profileError;

        // 3. Create a business entry
        const { data: businessData, error: businessError } = await supabase.from('businesses').insert({
          user_id: userId,
          name: `${data.firstName}'s Business`,
        }).select('id').single();
        if (businessError) throw businessError;

        // 4. Create a default shop_details entry
        const { error: shopDetailsError } = await supabase.from('shop_details').insert({
          business_id: businessData.id,
          shop_name: `${data.firstName}'s Shop`,
          slug: `${data.firstName.toLowerCase()}-shop`,
          currency: 'USD',
          contact_email: data.email,
        });
        if (shopDetailsError) throw shopDetailsError;

        showSuccess('Registration successful! Welcome to InstaShopify.');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      showError(`Registration failed: ${error.message}`);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <ShoppingBag className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold">Register</CardTitle>
          </div>
          <CardDescription>Create your owner account to get started.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="firstName" {...register('firstName')} className="pl-10" />
                </div>
                {errors.firstName && <p className="text-sm text-destructive mt-1">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="lastName" {...register('lastName')} className="pl-10" />
                </div>
                {errors.lastName && <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" {...register('email')} className="pl-10" />
              </div>
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" {...register('password')} className="pl-10" />
              </div>
              {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phoneNumber" type="tel" {...register('phoneNumber')} className="pl-10" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Register;