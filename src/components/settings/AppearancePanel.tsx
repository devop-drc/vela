import { useState } from "react";
import { useAppearance } from "@/contexts/AppearanceContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ThemeSelector } from "./ThemeSelector";
import { FontSelector } from "./FontSelector";
import { AdvancedPanel } from "./AdvancedPanel";
import { BackgroundImageSelector } from "./BackgroundImageSelector";
import { AnimatePresence } from "framer-motion";
import { Sparkles, Bot, Save } from "lucide-react";
import { DashboardPreview } from "./DashboardPreview";
import { StorefrontPreview } from "./StorefrontPreview";
import { LayoutSettings } from "./LayoutSettings";

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
    <div className="p-4 mt-6 border rounded-lg bg-accent/50 space-y-3">
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
  const { isLoading, isAdvanced, setAdvanced, randomizeTheme, generateAIDesign, resetSettings } = useAppearance();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <DashboardPreview />
        <StorefrontPreview />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Theme & Palette</CardTitle>
            <CardDescription>
              Select a preset, or generate one with AI. Your changes are saved automatically.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={generateAIDesign} variant="outline">
              <Bot className="mr-2 h-4 w-4" />
              Generate with AI
            </Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Background</CardTitle>
            <CardDescription>Choose a solid color, upload an image, or browse our gallery.</CardDescription>
          </CardHeader>
          <CardContent>
            <BackgroundImageSelector />
          </CardContent>
        </Card>
        <LayoutSettings />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Typography</CardTitle>
          <CardDescription>Select fonts that match your brand's personality.</CardDescription>
        </CardHeader>
        <CardContent>
          <FontSelector />
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 pt-8 border-t">
        <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Button variant="outline" onClick={() => isAdvanced ? setAdvanced(false) : setIsModalOpen(true)}>
            {isAdvanced ? "Disable Advanced Mode" : "Advanced Color Editor"}
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Enable Advanced Color Editor?</AlertDialogTitle>
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