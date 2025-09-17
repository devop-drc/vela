import { useAppearance, presetThemes } from "@/contexts/AppearanceContext";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const ThemeSelector = () => {
  const { settings, setTheme } = useAppearance();

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Color Palette</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {presetThemes.map((theme) => (
          <div key={theme.name} className="space-y-2">
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
                    <div style={{ backgroundColor: `hsl(${theme.light['--primary-foreground']})` }} />
                  </div>
                </CardContent>
              </Card>
            </button>
            <div className="flex items-center justify-center gap-2">
              {settings.themeName === theme.name && <CheckCircle className="h-4 w-4 text-primary" />}
              <p className="text-sm font-medium">{theme.name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};