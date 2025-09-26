import { useAppearance } from "@/contexts/AppearanceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

export const LayoutSettings = () => {
  const { settings, updateSetting } = useAppearance();
  const radiusValue = parseFloat(settings['--radius'] || '0') * 16;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Layout & Effects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
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
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Glassmorphism</Label>
              <p className="text-xs text-muted-foreground">Apply a frosted glass effect.</p>
            </div>
            <Switch checked={settings.blurEnabled} onCheckedChange={(checked) => updateSetting('blurEnabled', checked)} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sidebar & Header</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Style</Label>
            <RadioGroup 
              value={settings.sidebarStyle} 
              onValueChange={(value) => updateSetting('sidebarStyle', value as 'primary' | 'card')}
              className="grid grid-cols-1 gap-3"
            >
              <Label className="flex items-center gap-3 border rounded-md p-3 cursor-pointer has-[input:checked]:border-primary flex-1">
                <RadioGroupItem value="primary" id="sidebar-primary" />
                <div>
                  <p className="font-medium text-sm">Vibrant</p>
                  <p className="text-xs text-muted-foreground">Uses your primary brand color.</p>
                </div>
              </Label>
              <Label className="flex items-center gap-3 border rounded-md p-3 cursor-pointer has-[input:checked]:border-primary flex-1">
                <RadioGroupItem value="card" id="sidebar-card" />
                <div>
                  <p className="font-medium text-sm">Subtle</p>
                  <p className="text-xs text-muted-foreground">Blends with the content area.</p>
                </div>
              </Label>
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
    </div>
  );
};