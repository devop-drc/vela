import { useState } from "react";
import { useAppearance } from "@/contexts/AppearanceContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Upload, Trash2 } from "lucide-react";

export const BackgroundImageSelector = () => {
  const { settings, updateSetting } = useAppearance();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("You must be logged in to upload an image.");
      setIsUploading(false);
      return;
    }

    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('design-assets').upload(filePath, file);

    if (error) {
      showError(`Upload failed: ${error.message}`);
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('design-assets').getPublicUrl(filePath);
    updateSetting('backgroundImageUrl', publicUrl);
    showSuccess("Background updated!");
    setIsUploading(false);
  };

  const removeImage = () => {
    updateSetting('backgroundImageUrl', '');
  };

  return (
    <div className="space-y-6 pt-8 border-t">
      <div>
        <h3 className="font-semibold mb-3">Background Image</h3>
        <p className="text-sm text-muted-foreground">
          Upload an image to use as a global background for your dashboard.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Button asChild variant="outline">
          <label htmlFor="bg-upload">
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload Image
          </label>
        </Button>
        <Input id="bg-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={isUploading} />
        {settings.backgroundImageUrl && (
          <Button variant="destructive" onClick={removeImage}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        )}
      </div>
      {settings.backgroundImageUrl && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Brightness</Label>
            <Input
              type="range"
              min="25"
              max="125"
              step="1"
              value={settings.backgroundBrightness}
              onChange={(e) => updateSetting('backgroundBrightness', parseInt(e.target.value, 10))}
            />
          </div>
          <div className="space-y-2">
            <Label>Image Fit</Label>
            <RadioGroup
              value={settings.backgroundSize}
              onValueChange={(v) => updateSetting('backgroundSize', v as 'cover' | 'contain')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2"><RadioGroupItem value="cover" id="cover" /><Label htmlFor="cover">Cover</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="contain" id="contain" /><Label htmlFor="contain">Contain</Label></div>
            </RadioGroup>
          </div>
        </div>
      )}
    </div>
  );
};