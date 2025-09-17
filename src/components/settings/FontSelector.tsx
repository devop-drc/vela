import { useAppearance } from "@/contexts/AppearanceContext";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const googleFonts = [
  "Inter",
  "Poppins",
  "Roboto",
  "Lato",
  "Montserrat",
  "Open Sans",
  "Playfair Display",
  "Merriweather",
  "Lora",
  "Source Sans Pro",
];

export const FontSelector = () => {
  const { settings, updateSetting } = useAppearance();

  return (
    <div className="space-y-4 pt-8 border-t">
      <h3 className="font-semibold">Typography</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="font-heading">Headings</Label>
          <Select value={settings.fontHeading} onValueChange={(value) => updateSetting('fontHeading', value)}>
            <SelectTrigger id="font-heading">
              <SelectValue placeholder="Select a font" />
            </SelectTrigger>
            <SelectContent>
              {googleFonts.map(font => (
                <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="font-sans">Body & Paragraphs</Label>
          <Select value={settings.fontSans} onValueChange={(value) => updateSetting('fontSans', value)}>
            <SelectTrigger id="font-sans">
              <SelectValue placeholder="Select a font" />
            </SelectTrigger>
            <SelectContent>
              {googleFonts.map(font => (
                <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};