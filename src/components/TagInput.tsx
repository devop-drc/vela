import { useState, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export const TagInput = forwardRef<HTMLDivElement, TagInputProps>(({ value = [], onChange, placeholder = "Add..." }, ref) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (!value.includes(newTag)) {
        onChange([...value, newTag]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  return (
    <div ref={ref} className={cn(
      "border-b-2 border-input bg-transparent rounded-none p-2 flex flex-wrap gap-2 items-center transition-all",
      "focus-within:bg-muted/50"
    )}>
      {value.map(tag => (
        <Badge key={tag} variant="secondary" className="flex items-center gap-1 text-sm py-1">
          {tag}
          <button onClick={() => removeTag(tag)} className="rounded-full hover:bg-muted-foreground/20">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Input
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 border-none shadow-none focus-visible:ring-0 h-auto py-0 px-1 bg-transparent"
      />
    </div>
  );
});
TagInput.displayName = "TagInput";