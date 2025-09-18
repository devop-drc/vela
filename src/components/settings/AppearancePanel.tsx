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
import { Sparkles, Bot } from "lucide-react";

export const AppearancePanel = () => {
  const { settings, updateSetting, resetSettings, isLoading, isAdvanced, setAdvanced, randomizeTheme, generateAIDesign } = useAppearance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const radiusValue = parseFloat(settings['--radius'] || '0') * 16;

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
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
          <div className="lg:col-span-3">
            <ThemeSelector />
          </div>
          <div className="lg:col-span-2 space-y-4 border-t lg:border-t-0 lg:border-r lg:pr-8 pt-8 lg:pt-0">
             <h3 className="font-semibold">Sidebar Style</h3>
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
          <div className="space-y-4 border-t lg:border-t-0 pt-8 lg:pt-0">
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

        <BackgroundImageSelector />

        <div className="flex items-center gap-4 pt-8 border-t">
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
      </CardContent>
    </Card>
  );
};