import { useAppearance } from "@/contexts/AppearanceContext";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FontCombobox } from "./FontCombobox";
import { Sparkles } from "lucide-react";

const googleFonts = [
  "Inter", "Poppins", "Roboto", "Lato", "Montserrat", "Open Sans", "Playfair Display",
  "Merriweather", "Lora", "Source Sans Pro", "Nunito Sans", "Raleway", "Oswald",
  "Roboto Condensed", "Work Sans", "Cormorant Garamond", "Libre Baskerville", "Arimo",
  "PT Sans", "Karla", "DM Sans", "Rubik", "Manrope", "Space Grotesk", "Syne",
].map(font => ({ value: font, label: font }));

const fontPairings = [
  { name: "Modern", heading: "Syne", body: "Inter" },
  { name: "Elegant", heading: "Playfair Display", body: "Lato" },
  { name: "Minimalist", heading: "Inter", body: "Inter" },
  { name: "Classic", heading: "Lora", body: "Source Sans Pro" },
];

export const FontSelector = () => {
  const { settings, updateSetting } = useAppearance();

  const setFontPairing = (heading: string, body: string) => {
    updateSetting('fontHeading', heading);
    updateSetting('fontSans', body);
  };

  return (
    <div className="space-y-6 pt-8 border-t">
      <div>
        <h3 className="font-semibold mb-3">Typography</h3>
        <p className="text-sm text-muted-foreground">
          Choose a recommended pairing or select individual fonts below.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {fontPairings.map(pair => (
          <Button key={pair.name} variant="outline" onClick={() => setFontPairing(pair.heading, pair.body)}>
            <Sparkles className="mr-2 h-4 w-4 text-amber-400" />
            {pair.name}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="font-heading">Headings</Label>
          <FontCombobox
            fonts={googleFonts}
            value={settings.fontHeading}
            onChange={(value) => updateSetting('fontHeading', value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="font-sans">Body & Paragraphs</Label>
          <FontCombobox
            fonts={googleFonts}
            value={settings.fontSans}
            onChange={(value) => updateSetting('fontSans', value)}
          />
        </div>
      </div>
    </div>
  );
};