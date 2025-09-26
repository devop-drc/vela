import { useState } from "react";
import { useAppearance } from "@/contexts/AppearanceContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ThemeSelector } from "./ThemeSelector";
import { FontSelector } from "./FontSelector";
import { AdvancedPanel } from "./AdvancedPanel";
import { BackgroundImageSelector } from "./BackgroundImageSelector";
import { AnimatePresence } from "framer-motion";
import { Sparkles, Save } from "lucide-react";
import { Switch } from "../ui/switch";
import { Slider } from "../ui/slider";

const CustomThemeManager = () => {
  const { settings, saveCustomTheme } = useAppearance();
  const [themeName, setThemeName] = useState("");
  const isCustom = settings.themeName === 'Custom' || settings.themeName === 'AI Generated';

  const handleSave = () => {
    if (themeName.trim()) {
      saveCustomTheme(themeName.trim());
      setThemeName("");
    }
  };

  if (!isCustom) return null;

  return (
    <div className="p-4 border rounded-lg bg-accent/50 space-y-3 mt-8">
      <p className="text-sm font-medium">You're using custom settings. Save them as a new theme!</p>
      <div className="flex items-center gap-2">
        <Input 
          placeholder="Enter theme name..." 
          value={themeName}
          onChange={(e) => setThemeName(e.target.value)}
        />
        <Button onClick={handleSave} disabled={!themeName.trim()}>
          <Save className="mr-2 h-4 w-4" />
          Save Theme
        </Button>
      </div>
    </div>
  );
};

export const AppearancePanel = () => {
  const { settings, updateSetting, resetSettings, isLoading, isAdvanced, setAdvanced, randomizeTheme } = useAppearance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const radiusValue = parseFloat(settings['--radius'] || '0') * 16;

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Branding & Palettes</CardTitle>
            <CardDescription>
              Get inspired with a random theme or choose from presets.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={randomizeTheme} variant="outline">
              <Sparkles className="mr-2 h-4 w-4 text-amber-400" />
              Inspire Me
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ThemeSelector />
          <CustomThemeManager />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Layout & Feel</CardTitle>
            <CardDescription>Control the structure and shape of the UI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Sidebar & Header Style</Label>
              <RadioGroup 
                  value={settings.sidebarStyle} 
                  onValueChange={(value) => updateSetting('sidebarStyle', value as 'primary' | 'card')}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                  <Label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer has-[input:checked]:border-primary flex-1">
                      <RadioGroupItem value="primary" id="sidebar-primary" />
                      <div>
                          <p className="font-medium">Vibrant</p>
                          <p className="text-sm text-muted-foreground">Uses your primary brand color.</p>
                      </div>
                  </Label>
                  <Label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer has-[input:checked]:border-primary flex-1">
                      <RadioGroupItem value="card" id="sidebar-card" />
                       <div>
                          <p className="font-medium">Subtle</p>
                          <p className="text-sm text-muted-foreground">Blends with the content area.</p>
                      </div>
                  </Label>
              </RadioGroup>
            </div>
            <div className="space-y-3">
              <Label>Layout Style</Label>
              <RadioGroup 
                value={settings.layoutStyle} 
                onValueChange={(value) => updateSetting('layoutStyle', value as 'floating' | 'docked')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2"><RadioGroupItem value="floating" id="floating" /><Label htmlFor="floating">Floating</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="docked" id="docked" /><Label htmlFor="docked">Docked</Label></div>
              </RadioGroup>
            </div>
            <div className="space-y-3">
              <Label>Sidebar Width</Label>
              <RadioGroup 
                value={settings.sidebarWidth} 
                onValueChange={(value) => updateSetting('sidebarWidth', value as 'compact' | 'default' | 'spacious')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2"><RadioGroupItem value="compact" id="compact" /><Label htmlFor="compact">Compact</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="default" id="default" /><Label htmlFor="default">Default</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="spacious" id="spacious" /><Label htmlFor="spacious">Spacious</Label></div>
              </RadioGroup>
            </div>
            <div className="space-y-3">
                <Label>Corner Radius: {radiusValue.toFixed(0)}px</Label>
                <Slider
                    min={0}
                    max={32}
                    step={1}
                    value={[radiusValue]}
                    onValueChange={(value) => updateSetting('--radius', `${value[0] / 16}rem`)}
                />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>Choose a font pairing that matches your brand's voice.</CardDescription>
          </CardHeader>
          <CardContent>
            <FontSelector />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Background & Effects</CardTitle>
          <CardDescription>Customize the application background and visual effects.</CardDescription>
        </CardHeader>
        <CardContent>
          <BackgroundImageSelector />
          <div className="flex items-center justify-between rounded-lg border p-4 mt-6">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Glassmorphism</Label>
              <p className="text-sm text-muted-foreground">Apply a frosted glass effect to UI elements.</p>
            </div>
            <Switch checked={settings.blurEnabled} onCheckedChange={(checked) => updateSetting('blurEnabled', checked)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 pt-4 border-t">
          <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <Button variant="outline" onClick={() => isAdvanced ? setAdvanced(false) : setIsModalOpen(true)}>
                  {isAdvanced ? "Disable Advanced Mode" : "Advanced Customization"}
              </Button>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Enable Advanced Customization?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This will allow you to override the preset theme with your own custom values. You can always reset to the default themes later if you change your mind.
                      </AlertDialogDescription>
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
          {isAdvanced && <AdvancedPanel />}
      </AnimatePresence>
    </div>
  );
};