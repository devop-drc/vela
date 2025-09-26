import { useAppearance, presetThemes, CustomTheme } from "@/contexts/AppearanceContext";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

export const ThemeSelector = () => {
  const { settings, setTheme, deleteCustomTheme } = useAppearance();
  const customThemes = settings.customThemes || [];

  const renderTheme = (theme: { name: string, light: any }, isCustom = false) => (
    <div key={theme.name} className="space-y-2">
      <div className="relative group">
        <button
          onClick={() => setTheme(theme.name)}
          className={cn(
            "w-full rounded-lg border-2 p-1 transition-all",
            settings.themeName === theme.name ? "border-primary" : "border-transparent hover:border-muted-foreground/50"
          )}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-5 h-16">
                <div style={{ backgroundColor: `hsl(${theme.light['--background']})` }} />
                <div style={{ backgroundColor: `hsl(${theme.light['--card']})` }} />
                <div style={{ backgroundColor: `hsl(${theme.light['--foreground']})` }} />
                <div style={{ backgroundColor: `hsl(${theme.light['--primary']})` }} />
                <div style={{ backgroundColor: `hsl(${theme.light['--accent']})` }} />
              </div>
            </CardContent>
          </Card>
        </button>
        {isCustom && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => deleteCustomTheme((theme as CustomTheme).id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="flex items-center justify-center gap-2">
        {settings.themeName === theme.name && <CheckCircle className="h-4 w-4 text-primary" />}
        <p className="text-sm font-medium">{theme.name}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {customThemes.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Your Themes</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {customThemes.map(theme => renderTheme(theme, true))}
          </div>
        </div>
      )}
      <div className="space-y-4">
        <h3 className="font-semibold">Preset Palettes</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {presetThemes.map(theme => renderTheme(theme))}
        </div>
      </div>
    </div>
  );
};