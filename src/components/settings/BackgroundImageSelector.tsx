import { useState } from "react";
import { useAppearance, curatedImages } from "@/contexts/AppearanceContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Upload, Trash2, Sun, Contrast, Droplets, Palette } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Slider } from "../ui/slider";
import { hexToHsl, hslToHex } from "@/utils/colors";

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

  const handleSolidColorChange = (color: string) => {
    updateSetting('backgroundImageUrl', '');
    updateSetting('solidBackgroundColor', hexToHsl(color));
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="color" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="color">Solid Color</TabsTrigger>
          <TabsTrigger value="upload">Upload Custom</TabsTrigger>
          <TabsTrigger value="gallery">Browse Gallery</TabsTrigger>
        </TabsList>
        <TabsContent value="color" className="pt-4">
          <div className="flex items-center gap-4">
            <Label>Select a color:</Label>
            <Input
              type="color"
              value={hslToHex(settings.solidBackgroundColor || settings['--background'])}
              onChange={(e) => handleSolidColorChange(e.target.value)}
              className="w-16 h-10 p-1"
            />
          </div>
        </TabsContent>
        <TabsContent value="upload" className="pt-4">
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
        </TabsContent>
        <TabsContent value="gallery" className="pt-4">
          <ScrollArea className="h-48 w-full">
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-1">
              {curatedImages.map(img => (
                <button 
                  key={img.src} 
                  onClick={() => updateSetting('backgroundImageUrl', img.src)}
                  className={cn(
                    "aspect-video rounded-md overflow-hidden focus:outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    settings.backgroundImageUrl === img.src && "ring-2 ring-primary"
                  )}
                >
                  <img src={`${img.src}&h=200&fit=crop`} alt={`by ${img.author}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Sun className="h-4 w-4" /> Brightness: {settings.backgroundBrightness || 100}%</Label>
          <Slider min={0} max={200} step={1} value={[settings.backgroundBrightness || 100]} onValueChange={(v) => updateSetting('backgroundBrightness', v[0])} />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Contrast className="h-4 w-4" /> Contrast: {(settings.backgroundContrast || 100) - 100}%</Label>
          <Slider min={0} max={200} step={1} value={[settings.backgroundContrast || 100]} onValueChange={(v) => updateSetting('backgroundContrast', v[0])} />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Droplets className="h-4 w-4" /> Saturation: {(settings.backgroundSaturation || 100) - 100}%</Label>
          <Slider min={0} max={200} step={1} value={[settings.backgroundSaturation || 100]} onValueChange={(v) => updateSetting('backgroundSaturation', v[0])} />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Palette className="h-4 w-4" /> Hue: {settings.backgroundHue || 0}°</Label>
          <Slider min={0} max={360} step={1} value={[settings.backgroundHue || 0]} onValueChange={(v) => updateSetting('backgroundHue', v[0])} />
        </div>
        {settings.backgroundImageUrl && (
          <div className="space-y-2 md:col-span-2">
            <Label>Image Fit</Label>
            <RadioGroup value={settings.backgroundSize} onValueChange={(v) => updateSetting('backgroundSize', v as 'cover' | 'contain')} className="flex gap-4">
              <div className="flex items-center space-x-2"><RadioGroupItem value="cover" id="cover" /><Label htmlFor="cover">Cover</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="contain" id="contain" /><Label htmlFor="contain">Contain</Label></div>
            </RadioGroup>
          </div>
        )}
      </div>
    </div>
  );
};