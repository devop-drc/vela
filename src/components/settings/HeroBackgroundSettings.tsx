import { useState } from "react";
import { useAppearance, curatedImages } from "@/contexts/AppearanceContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Upload, Trash2, Image as ImageIcon, Video, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Switch } from "../ui/switch";
import { MediaItem } from "../MediaItem";

export const HeroBackgroundSettings = () => {
  const { settings, updateSetting } = useAppearance();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("You must be logged in to upload media.");
      setIsUploading(false);
      return;
    }

    const fileType = file.type.startsWith('video') ? 'video' : 'image';
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('hero-media').upload(filePath, file);

    if (error) {
      showError(`Upload failed: ${error.message}`);
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('hero-media').getPublicUrl(filePath);
    updateSetting('heroBackgroundMediaUrl', publicUrl);
    updateSetting('heroBackgroundMediaType', fileType);
    showSuccess("Hero background updated!");
    setIsUploading(false);
  };

  const removeMedia = () => {
    updateSetting('heroBackgroundMediaUrl', undefined);
    updateSetting('heroBackgroundMediaType', undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base">Show Blob Animation</Label>
          <p className="text-sm text-muted-foreground">Adds a subtle, animated background effect to the hero section.</p>
        </div>
        <Switch checked={settings.showHeroBlobAnimation} onCheckedChange={(checked) => updateSetting('showHeroBlobAnimation', checked)} />
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload Custom</TabsTrigger>
          <TabsTrigger value="gallery">Browse Gallery</TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="pt-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline">
              <label htmlFor="hero-media-upload" className="cursor-pointer">
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload Image/Video
              </label>
            </Button>
            <Input id="hero-media-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*,video/*" disabled={isUploading} />
            {settings.heroBackgroundMediaUrl && (
              <Button variant="destructive" onClick={removeMedia}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
          {settings.heroBackgroundMediaUrl && (
            <div className="mt-4 p-2 border rounded-lg bg-muted/50 flex items-center justify-center h-48 overflow-hidden">
              <MediaItem 
                src={settings.heroBackgroundMediaUrl} 
                alt="Hero background preview" 
                type={settings.heroBackgroundMediaType} 
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
        </TabsContent>
        <TabsContent value="gallery" className="pt-4">
          <ScrollArea className="h-48 w-full">
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-1">
              {curatedImages.map(img => (
                <button 
                  key={img.src} 
                  onClick={() => {
                    updateSetting('heroBackgroundMediaUrl', img.src);
                    updateSetting('heroBackgroundMediaType', 'image');
                  }}
                  className={cn(
                    "aspect-video rounded-md overflow-hidden focus:outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    settings.heroBackgroundMediaUrl === img.src && "ring-2 ring-primary"
                  )}
                >
                  <img src={`${img.src}&h=200&fit=crop`} alt={`by ${img.author}`} className="w-full h-full object-cover" />
                </button>
              ))}
              {/* Add curated videos here if available */}
              <button 
                onClick={() => {
                  updateSetting('heroBackgroundMediaUrl', 'https://assets.mixkit.co/videos/preview/mixkit-abstract-liquid-background-4942-large.mp4');
                  updateSetting('heroBackgroundMediaType', 'video');
                }}
                className={cn(
                  "aspect-video rounded-md overflow-hidden focus:outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  settings.heroBackgroundMediaUrl === 'https://assets.mixkit.co/videos/preview/mixkit-abstract-liquid-background-4942-large.mp4' && "ring-2 ring-primary"
                )}
              >
                <Video className="absolute inset-0 h-full w-full text-primary/50 bg-black/30 flex items-center justify-center" />
                <video src="https://assets.mixkit.co/videos/preview/mixkit-abstract-liquid-background-4942-large.mp4" muted loop playsInline className="w-full h-full object-cover" />
              </button>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};