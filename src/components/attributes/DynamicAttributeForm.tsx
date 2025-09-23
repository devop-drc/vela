import { useEffect, useState } from 'react';
import { Controller } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TagInput } from '@/components/TagInput';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface DynamicAttributeFormProps {
  categoryId: string | null;
  control: any; // from react-hook-form
}

export const DynamicAttributeForm = ({ categoryId, control }: DynamicAttributeFormProps) => {
  const [attributes, setAttributes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchAttributes = async () => {
      if (!categoryId) {
        setAttributes([]);
        return;
      }
      setIsLoading(true);
      const { data, error } = await supabase
        .from('category_attributes')
        .select('attributes(*, attribute_options(*))')
        .eq('category_id', categoryId);
      
      if (error) {
        console.error("Failed to fetch attributes for category", error);
        setAttributes([]);
      } else {
        setAttributes(data.map(d => d.attributes));
      }
      setIsLoading(false);
    };
    fetchAttributes();
  }, [categoryId]);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;
  }

  if (!categoryId) {
    return <p className="text-sm text-muted-foreground text-center py-4">Select a category to see its attributes.</p>;
  }
  
  if (attributes.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No attributes linked to this category.</p>;
  }

  const renderInput = (attribute: any, field: any) => {
    switch (attribute.input_type) {
      case 'number':
        return <Input type="number" {...field} />;
      case 'textarea':
        return <Textarea {...field} />;
      case 'dropdown':
        return (
          <Select onValueChange={field.onChange} value={field.value}>
            <SelectTrigger><SelectValue placeholder={`Select ${attribute.name}...`} /></SelectTrigger>
            <SelectContent>
              {attribute.attribute_options.map((opt: any) => <SelectItem key={opt.id} value={opt.value}>{opt.value}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      case 'tags':
        return <TagInput {...field} />;
      case 'color':
        return <Input type="color" {...field} className="w-16 h-10" />;
      case 'text':
      default:
        return <Input type="text" {...field} />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
      {attributes.map(attr => (
        <div key={attr.id} className="space-y-2">
          <Label htmlFor={`attribute-${attr.id}`}>{attr.name} {attr.unit && `(${attr.unit})`}</Label>
          <Controller
            name={`attributes.${attr.id}`}
            control={control}
            render={({ field }) => renderInput(attr, field)}
          />
        </div>
      ))}
    </div>
  );
};