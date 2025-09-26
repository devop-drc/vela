import { useState } from "react";
import { useAppearance } from "@/contexts/AppearanceContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const curatedImages = [
  { src: 'https://images.unsplash.com/photo-1553095066-5014bc7b7f2d?q=80&w=2400', author: 'Daniel Leone' },
  { src: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2400', author: 'Gradienta' },
  { src: 'https://images.unsplash.com/photo-1500964757637-c85e8a162699?q=80&w=2400', author: 'John Fowler' },
  { src: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?q=80&w=2400', author: 'Alin Rusu' },
  { src: 'https://images.unsplash.com/photo-1536566482680-fca31930a0bd?q=80&w=2400', author: 'Dawid Zawiła' },
  { src: 'https://images.unsplash.com/photo-1554034483-043a35442025?q=80&w=2400', author: 'Javier Miranda' },
  { src: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=2400', author: 'Scott Webb' },
  { src: 'https://images.unsplash.com/photo-1507525428034-b723a996f329?q=80&w=2400', author: 'Sean O.' },
  { src: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=2400', author: 'John Towner' },
  { src: 'https://images.unsplash.com/photo-1604079628040-94301bb21b91?q=80&w=2400', author: 'Gradienta' },
];

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
          Upload a custom image or select one from our curated gallery.
        </p>
      </div>
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload Custom</TabsTrigger>
          <TabsTrigger value="gallery">Browse Gallery</TabsTrigger>
        </TabsList>
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