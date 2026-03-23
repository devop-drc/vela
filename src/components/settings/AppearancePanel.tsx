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
import { HeroBackgroundSettings } from "./HeroBackgroundSettings"; // Import new component
import { AnimatePresence } from "framer-motion";
import { Sparkles, Save } from "lucide-react";
import { Switch } from "../ui/switch";
import { Slider } from "../ui/slider";
import { useTranslation } from "react-i18next";

const CustomThemeManager = () => {
  const { settings, saveCustomTheme } = useAppearance();
  const { t } = useTranslation();
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
      <p className="text-sm font-medium">{t("appearance.custom_hint")}</p>
      <div className="flex items-center gap-2">
        <Input 
          placeholder={t("appearance.theme_name_placeholder")}
          value={themeName}
          onChange={(e) => setThemeName(e.target.value)}
        />
        <Button onClick={handleSave} disabled={!themeName.trim()}>
          <Save className="mr-2 h-4 w-4" />
          {t("appearance.save_theme")}
        </Button>
      </div>
    </div>
  );
};

export const AppearancePanel = () => {
  const { settings, updateSetting, resetSettings, isLoading, isAdvanced, setAdvanced, randomizeTheme } = useAppearance();
  const { t } = useTranslation();
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
            <CardTitle>{t("appearance.branding")}</CardTitle>
            <CardDescription>
              {t("appearance.branding_desc")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={randomizeTheme} variant="outline">
              <Sparkles className="mr-2 h-4 w-4 text-amber-400" />
              {t("appearance.inspire_me")}
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
            <CardTitle>{t("appearance.layout")}</CardTitle>
            <CardDescription>{t("appearance.layout_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>{t("appearance.sidebar_style")}</Label>
              <RadioGroup 
                  value={settings.sidebarStyle} 
                  onValueChange={(value) => updateSetting('sidebarStyle', value as 'primary' | 'card')}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                  <Label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer has-[input:checked]:border-primary flex-1">
                      <RadioGroupItem value="primary" id="sidebar-primary" />
                      <div>
                          <p className="font-medium">{t("appearance.vibrant")}</p>
                          <p className="text-sm text-muted-foreground">{t("appearance.vibrant_desc")}</p>
                      </div>
                  </Label>
                  <Label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer has-[input:checked]:border-primary flex-1">
                      <RadioGroupItem value="card" id="sidebar-card" />
                       <div>
                          <p className="font-medium">{t("appearance.subtle")}</p>
                          <p className="text-sm text-muted-foreground">{t("appearance.subtle_desc")}</p>
                      </div>
                  </Label>
              </RadioGroup>
            </div>
            <div className="space-y-3">
              <Label>{t("appearance.layout_style")}</Label>
              <RadioGroup 
                value={settings.layoutStyle} 
                onValueChange={(value) => updateSetting('layoutStyle', value as 'floating' | 'docked')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2"><RadioGroupItem value="floating" id="floating" /><Label htmlFor="floating">{t("appearance.floating")}</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="docked" id="docked" /><Label htmlFor="docked">{t("appearance.docked")}</Label></div>
              </RadioGroup>
            </div>
            <div className="space-y-3">
              <Label>{t("appearance.sidebar_width")}</Label>
              <RadioGroup 
                value={settings.sidebarWidth} 
                onValueChange={(value) => updateSetting('sidebarWidth', value as 'compact' | 'default' | 'spacious')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2"><RadioGroupItem value="compact" id="compact" /><Label htmlFor="compact">{t("appearance.compact")}</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="default" id="default" /><Label htmlFor="default">{t("appearance.default")}</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="spacious" id="spacious" /><Label htmlFor="spacious">{t("appearance.spacious")}</Label></div>
              </RadioGroup>
            </div>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t("appearance.corner_radius")}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{radiusValue.toFixed(0)}px</span>
                    <div
                      className="w-6 h-6 border-2 border-primary bg-primary/20 shrink-0"
                      style={{ borderRadius: `${radiusValue}px` }}
                    />
                  </div>
                </div>
                <Slider
                    min={0}
                    max={32}
                    step={1}
                    value={[radiusValue]}
                    onValueChange={(value) => updateSetting('--radius', `${value[0] / 16}rem`)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("appearance.sharp")}</span>
                  <span>{t("appearance.round")}</span>
                </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("appearance.typography")}</CardTitle>
            <CardDescription>{t("appearance.typography_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <FontSelector />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("appearance.bg_effects")}</CardTitle>
          <CardDescription>{t("appearance.bg_effects_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <BackgroundImageSelector />
          <div className="flex items-center justify-between rounded-lg border p-4 mt-6">
            <div className="space-y-0.5">
              <Label className="text-base">{t("appearance.glassmorphism")}</Label>
              <p className="text-sm text-muted-foreground">{t("appearance.glassmorphism_desc")}</p>
            </div>
            <Switch checked={settings.blurEnabled} onCheckedChange={(checked) => updateSetting('blurEnabled', checked)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("appearance.hero_bg")}</CardTitle>
          <CardDescription>{t("appearance.hero_bg_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <HeroBackgroundSettings />
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 pt-4 border-t">
          <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <Button variant="outline" onClick={() => isAdvanced ? setAdvanced(false) : setIsModalOpen(true)}>
                  {isAdvanced ? t("appearance.disable_advanced") : t("appearance.advanced")}
              </Button>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>{t("appearance.enable_advanced")}</AlertDialogTitle>
                      <AlertDialogDescription>
                          {t("appearance.enable_advanced_desc")}
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => setAdvanced(true)}>{t("appearance.continue")}</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
          <Button variant="ghost" onClick={resetSettings}>{t("appearance.reset_defaults")}</Button>
      </div>
      <AnimatePresence>
          {isAdvanced && <AdvancedPanel />}
      </AnimatePresence>
    </div>
  );
};