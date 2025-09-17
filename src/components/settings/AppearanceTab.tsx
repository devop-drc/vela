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
import { AdvancedSettings } from "./AdvancedSettings";
import { AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

export const AppearanceTab = () => {
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
            {isAdvanced && <AdvancedSettings />}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};