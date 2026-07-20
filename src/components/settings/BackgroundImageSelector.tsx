import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppearance, curatedImages } from "@/contexts/AppearanceContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Trash2, Sun, Contrast, Droplets, Palette } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Slider } from "../ui/slider";
import { hexToHsl, hslToHex } from "@/utils/colors";

export const BackgroundImageSelector = () => {
  const { t } = useTranslation();
  const { settings, updateSetting } = useAppearance();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError(t('studio_panels.login_to_upload_image'));
      setIsUploading(false);
      return;
    }

    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('design-assets').upload(filePath, file);

    if (error) {
      showError(t('studio_panels.upload_failed', { message: error.message }));
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('design-assets').getPublicUrl(filePath);
    updateSetting('backgroundImageUrl', publicUrl);
    showSuccess(t('studio_panels.background_updated'));
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
          <TabsTrigger value="color">{t('studio_panels.solid_color')}</TabsTrigger>
          <TabsTrigger value="upload">{t('studio_panels.upload_custom')}</TabsTrigger>
          <TabsTrigger value="gallery">{t('studio_panels.browse_gallery')}</TabsTrigger>
        </TabsList>
        <TabsContent value="color" className="pt-4">
          <div className="flex items-center gap-4">
            <Label>{t('studio_panels.select_a_color')}</Label>
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
                {isUploading ? <Spinner className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                {t('studio_panels.upload_image')}
              </label>
            </Button>
            <Input id="bg-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={isUploading} />
            {settings.backgroundImageUrl && (
              <Button variant="destructive" onClick={removeImage}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t('common.remove')}
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
                  <img src={`${img.src}&h=200&fit=crop`} alt={t('studio_panels.photo_by', { author: img.author })} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Sun className="h-4 w-4" /> {t('studio_panels.brightness', { value: settings.backgroundBrightness || 100 })}</Label>
          <Slider min={0} max={200} step={1} value={[settings.backgroundBrightness || 100]} onValueChange={(v) => updateSetting('backgroundBrightness', v[0])} />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Contrast className="h-4 w-4" /> {t('studio_panels.contrast', { value: (settings.backgroundContrast || 100) - 100 })}</Label>
          <Slider min={0} max={200} step={1} value={[settings.backgroundContrast || 100]} onValueChange={(v) => updateSetting('backgroundContrast', v[0])} />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Droplets className="h-4 w-4" /> {t('studio_panels.saturation', { value: (settings.backgroundSaturation || 100) - 100 })}</Label>
          <Slider min={0} max={200} step={1} value={[settings.backgroundSaturation || 100]} onValueChange={(v) => updateSetting('backgroundSaturation', v[0])} />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Palette className="h-4 w-4" /> {t('studio_panels.hue', { value: settings.backgroundHue || 0 })}</Label>
          <Slider min={0} max={360} step={1} value={[settings.backgroundHue || 0]} onValueChange={(v) => updateSetting('backgroundHue', v[0])} />
        </div>
        {settings.backgroundImageUrl && (
          <div className="space-y-2 md:col-span-2">
            <Label>{t('studio_panels.image_fit')}</Label>
            <RadioGroup value={settings.backgroundSize} onValueChange={(v) => updateSetting('backgroundSize', v as 'cover' | 'contain')} className="flex gap-4">
              <div className="flex items-center space-x-2"><RadioGroupItem value="cover" id="cover" /><Label htmlFor="cover">{t('studio_panels.fit_cover')}</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="contain" id="contain" /><Label htmlFor="contain">{t('studio_panels.fit_contain')}</Label></div>
            </RadioGroup>
          </div>
        )}
      </div>
    </div>
  );
};