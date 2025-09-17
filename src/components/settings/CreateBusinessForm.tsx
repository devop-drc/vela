import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useBusiness } from '@/contexts/BusinessContext';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(3, 'Business name must be at least 3 characters long.'),
});

export const CreateBusinessForm = () => {
  const { createBusiness } = useBusiness();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ name: string }>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: { name: string }) => {
    try {
      await createBusiness(data.name);
      showSuccess('Your business has been created!');
    } catch (error: any) {
      showError(`Failed to create business: ${error.message}`);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Welcome!</CardTitle>
        <CardDescription>Let's get your business set up. What is the name of your business?</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Business Name</Label>
            <Input id="name" placeholder="e.g., Acme Inc." {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Business
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};