import { useWatch, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TagInput } from '@/components/TagInput';

export const GenericDetailsForm = ({ control }: { control: any }) => {
  const details = useWatch({ control, name: 'details' });

  if (!details) return <p className="text-sm text-muted-foreground text-center py-4">No specific details for this category.</p>;

  const detailKeys = Object.keys(details).filter(key => key !== 'type');

  if (detailKeys.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No specific details for this category.</p>;
  }

  return (
    <div className="space-y-4">
      {detailKeys.map(key => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        return (
          <div key={key} className="space-y-2">
            <Label>{label}</Label>
            <Controller
              name={`details.${key}`}
              control={control}
              render={({ field }) => {
                if (Array.isArray(field.value)) {
                  return <TagInput {...field} placeholder={`Add ${label}...`} />;
                }
                return <Input {...field} value={field.value || ''} className="border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" />;
              }}
            />
          </div>
        );
      })}
    </div>
  );
};