import { useAppearance } from "@/contexts/AppearanceContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Helper to convert HSL string to HEX for color input
const hslToHex = (hslStr: string) => {
  const [h, s, l] = hslStr.split(' ').map(parseFloat);
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

export const AppearanceSettings = () => {
  const { settings, updateSetting, resetSettings, isLoading } = useAppearance();

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const radiusValue = parseFloat(settings['--radius']) * 16; // Convert rem to px for slider

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize the look and feel of your application. Changes are saved automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Colors</h3>
            <ColorInput label="Background" value={settings['--background']} onChange={(v) => updateSetting('--background', v)} />
            <ColorInput label="Foreground / Text" value={settings['--foreground']} onChange={(v) => updateSetting('--foreground', v)} />
            <ColorInput label="Card Background" value={settings['--card']} onChange={(v) => updateSetting('--card', v)} />
            <ColorInput label="Primary Button" value={settings['--primary']} onChange={(v) => updateSetting('--primary', v)} />
            <ColorInput label="Primary Button Text" value={settings['--primary-foreground']} onChange={(v) => updateSetting('--primary-foreground', v)} />
          </div>
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Borders & Radius</h3>
            <div className="space-y-2">
              <Label>Corner Radius: {radiusValue.toFixed(0)}px</Label>
              <Input
                type="range"
                min="0"
                max="48"
                step="1"
                value={radiusValue}
                onChange={(e) => updateSetting('--radius', `${parseFloat(e.target.value) / 16}rem`)}
              />
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={resetSettings}>Reset to Defaults</Button>
      </CardContent>
    </Card>
  );
};