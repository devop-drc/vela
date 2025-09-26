import { useAppearance, fontCategories } from "@/contexts/AppearanceContext";
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

const getRandomItem = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export const FontSelector = () => {
  const { settings, updateSetting } = useAppearance();

  const generateFontPairing = (category: keyof typeof fontCategories) => {
    const { headings, body } = fontCategories[category];
    let headingFont = getRandomItem(headings);
    let bodyFont = getRandomItem(body);

    // Avoid same font for heading/body unless it's minimalist
    if (category !== 'Minimalist') {
      while (headingFont === bodyFont) {
        bodyFont = getRandomItem(body);
      }
    }

    updateSetting('fontHeading', headingFont);
    updateSetting('fontSans', bodyFont);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.keys(fontCategories).map(category => (
          <Button key={category} variant="outline" onClick={() => generateFontPairing(category as keyof typeof fontCategories)}>
            <Sparkles className="mr-2 h-4 w-4 text-amber-400" />
            {category}
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