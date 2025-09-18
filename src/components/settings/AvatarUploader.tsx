import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Input } from '../ui/input';

interface AvatarUploaderProps {
  currentAvatarUrl: string | null;
  userName: string;
  onUpload: (newUrl: string) => void;
}

export const AvatarUploader = ({ currentAvatarUrl, userName, onUpload }: AvatarUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("You must be logged in.");
      setIsUploading(false);
      return;
    }

    const filePath = `avatars/${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

    if (uploadError) {
      showError(`Upload failed: ${uploadError.message}`);
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
    onUpload(publicUrl);
    showSuccess("Avatar updated!");
    setIsUploading(false);
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20">
        <AvatarImage src={currentAvatarUrl || undefined} alt="User avatar" />
        <AvatarFallback>{userName?.[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div>
        <Button asChild variant="outline" size="sm">
          <label htmlFor="avatar-upload" className="cursor-pointer">
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload Photo
          </label>
        </Button>
        <Input id="avatar-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={isUploading} />
        <p className="text-xs text-muted-foreground mt-2">PNG, JPG, GIF up to 5MB.</p>
      </div>
    </div>
  );
};