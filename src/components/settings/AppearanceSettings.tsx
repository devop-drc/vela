import { useState } from "react";
import { useAppearance } from "@/contexts/AppearanceContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ThemeSelector } from "./ThemeSelector";
import { FontSelector } from "./FontSelector";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

// Helper to convert HSL string to HEX for color input
const hslToHex = (hslStr: string) => {
  if (!hslStr) return '#000000';
  const [h, s, l] = hslStr.split(' ').map(val => parseFloat(val.replace('%', '')));
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { [r, g, b] = [c, x, 0]; }
  else if (h >= 60 && h < 120) { [r, g, b] = [x, c, 0]; }
  else if (h >= 120 && h < 180) { [r, g, b] = [0, c, x]; }
  else if (h >= 180 && h < 240) { [r, g, b] = [0, x, c]; }
  else if (h >= 240 && h < 300) { [r, g, b] = [x, 0, c]; }
  else if (h >= 300 && h < 360) { [r, g, b] = [c, 0, x]; }

  const toHex = (val: number) => Math.round((val + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Helper to convert HEX to HSL string
const hexToHsl = (hex: string) => {
  let r = parseInt(hex.substring(1, 3), 16) / 255;
  let g = parseInt(hex.substring(3, 5), 16) / 255;
  let b = parseInt(hex.substring(5, 7), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <div className="flex items-center gap-2">
      <Input
        type="color"
        value={hslToHex(value)}
        onChange={(e) => onChange(hexToHsl(e.target.value))}
        className="w-12 h-10 p-1"
      />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono text-sm"
      />
    </div>
  </div>
);

const AdvancedCustomization = () => {
    const { settings, updateSetting } = useAppearance();

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8 pt-8"
        >
            <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold">Custom Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ColorInput label="Background" value={settings['--background']} onChange={(v) => updateSetting('--background', v)} />
                    <ColorInput label="Foreground / Text" value={settings['--foreground']} onChange={(v) => updateSetting('--foreground', v)} />
                    <ColorInput label="Card Background" value={settings['--card']} onChange={(v) => updateSetting('--card', v)} />
                    <ColorInput label="Primary Button" value={settings['--primary']} onChange={(v) => updateSetting('--primary', v)} />
                    <ColorInput label="Primary Button Text" value={settings['--primary-foreground']} onChange={(v) => updateSetting('--primary-foreground', v)} />
                </div>
            </div>
        </motion.div>
    );
};

export const AppearanceSettings = () => {
  const { settings, updateSetting, resetSettings, isLoading, isAdvanced, setAdvanced, randomizeTheme } = useAppearance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const radiusValue = parseFloat(settings['--radius']) * 16;

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the look and feel of your application. Changes are saved automatically.
          </CardDescription>
        </div>
        <Button onClick={randomizeTheme} variant="outline">
          <Sparkles className="mr-2 h-4 w-4 text-amber-400" />
          Inspire Me
        </Button>
      </CardHeader>
      <CardContent className="space-y-8">
        <ThemeSelector />
        
        <div className="space-y-8 pt-8 border-t">
          <div className="space-y-4">
            <h3 className="font-semibold">Sidebar Style</h3>
            <RadioGroup 
                value={settings.sidebarStyle} 
                onValueChange={(value) => updateSetting('sidebarStyle', value as 'primary' | 'card')}
                className="flex gap-4"
            >
                <Label className="flex items-center gap-2 border rounded-lg p-4 cursor-pointer has-[input:checked]:border-primary flex-1">
                    <RadioGroupItem value="primary" id="sidebar-primary" />
                    <div>
                        <p className="font-medium">Vibrant</p>
                        <p className="text-sm text-muted-foreground">Uses your primary brand color for a bold look.</p>
                    </div>
                </Label>
                <Label className="flex items-center gap-2 border rounded-lg p-4 cursor-pointer has-[input:checked]:border-primary flex-1">
                    <RadioGroupItem value="card" id="sidebar-card" />
                     <div>
                        <p className="font-medium">Subtle</p>
                        <p className="text-sm text-muted-foreground">A clean, minimal style that blends with the content.</p>
                    </div>
                </Label>
            </RadioGroup>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold">Corner Radius</h3>
            <div className="space-y-2">
                <Label>Radius: {radiusValue.toFixed(0)}px</Label>
                <Input
                    type="range"
                    min="0"
                    max="32"
                    step="1"
                    value={radiusValue}
                    onChange={(e) => updateSetting('--radius', `${parseFloat(e.target.value) / 16}rem`)}
                />
            </div>
          </div>
        </div>

        <FontSelector />

        <div className="flex items-center gap-4 pt-8 border-t">
            <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" onClick={() => isAdvanced ? setAdvanced(false) : setIsModalOpen(true)}>
                        {isAdvanced ? "Disable Advanced Mode" : "Advanced Customization"}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Enable Advanced Customization?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will allow you to override the preset theme with your own custom values. You can always reset to the default themes later if you change your mind.
                        </Description>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => setAdvanced(true)}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost" onClick={resetSettings}>Reset to Defaults</Button>
        </div>
        <AnimatePresence>
            {isAdvanced && <AdvancedCustomization />}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};