import type { DesignSettings } from "@/contexts/AppearanceContext";

// One-click full-design starting points for the customisable /shop storefront.
// Each preset sets colors + fonts + radius + blur + homepage template, themed
// for a business type and design style.

type SchemeInput = {
  bg: string; fg: string; card: string; cardFg?: string;
  primary: string; primaryFg: string;
  secondary: string; secondaryFg?: string;
  accent: string; accentFg?: string;
  muted: string; mutedFg: string; border: string;
};

const scheme = (o: SchemeInput): Partial<DesignSettings> => ({
  "--background": o.bg,
  "--foreground": o.fg,
  "--card": o.card,
  "--card-foreground": o.cardFg ?? o.fg,
  "--popover": o.card,
  "--popover-foreground": o.cardFg ?? o.fg,
  "--primary": o.primary,
  "--primary-foreground": o.primaryFg,
  "--secondary": o.secondary,
  "--secondary-foreground": o.secondaryFg ?? o.fg,
  "--accent": o.accent,
  "--accent-foreground": o.accentFg ?? o.fg,
  "--muted": o.muted,
  "--muted-foreground": o.mutedFg,
  "--border": o.border,
  "--input": o.border,
  "--ring": o.primary,
  "--destructive": "0 72% 51%",
  "--destructive-foreground": "0 0% 100%",
  "--warning": "38 92% 50%",
  "--warning-foreground": "0 0% 100%",
  "--info": "210 90% 50%",
  "--info-foreground": "0 0% 100%",
});

export type StorefrontPreset = {
  id: string;
  name: string;
  businessType: string;
  style: string;
  /** Small swatch colors for the gallery card (CSS hsl triplets). */
  swatch: { bg: string; primary: string; accent: string };
  settings: Partial<DesignSettings>;
};

const preset = (
  id: string, name: string, businessType: string, style: string,
  s: SchemeInput,
  fontHeading: string, fontSans: string, radius: string, blur: boolean,
  homepageTemplate: DesignSettings["homepageTemplate"],
): StorefrontPreset => ({
  id, name, businessType, style,
  swatch: { bg: s.bg, primary: s.primary, accent: s.accent },
  settings: {
    ...scheme(s),
    themeName: name,
    fontHeading, fontSans,
    "--radius": radius,
    blurEnabled: blur,
    homepageTemplate,
    layoutStyle: "floating",
  },
});

export const storefrontPresets: StorefrontPreset[] = [
  // ── Flowers ──
  preset("flower-vintage", "Bloom & Vine", "Flower Shop", "Vintage",
    { bg: "40 30% 96%", fg: "20 14% 25%", card: "40 30% 99%", primary: "345 40% 55%", primaryFg: "0 0% 100%", secondary: "120 20% 90%", accent: "120 22% 78%", muted: "40 20% 90%", mutedFg: "20 10% 45%", border: "40 20% 85%" },
    "Cormorant Garamond", "Lato", "1rem", false, "magazine"),
  preset("flower-clean", "Petal Studio", "Flower Shop", "Clean",
    { bg: "0 0% 100%", fg: "150 12% 18%", card: "0 0% 100%", primary: "152 45% 38%", primaryFg: "0 0% 100%", secondary: "150 20% 94%", accent: "90 40% 70%", muted: "150 14% 94%", mutedFg: "150 8% 42%", border: "150 12% 88%" },
    "DM Sans", "Inter", "0.75rem", false, "showcase"),

  // ── Electronics ──
  preset("electronics-modern", "Voltcore", "Electronics", "Modern",
    { bg: "222 22% 11%", fg: "210 20% 92%", card: "222 18% 15%", primary: "210 100% 56%", primaryFg: "0 0% 100%", secondary: "222 16% 20%", accent: "190 90% 50%", muted: "222 14% 22%", mutedFg: "215 15% 65%", border: "222 14% 24%" },
    "Space Grotesk", "Inter", "0.5rem", true, "showcase"),
  preset("electronics-brutalist", "Circuit", "Electronics", "Brutalist",
    { bg: "0 0% 100%", fg: "0 0% 5%", card: "0 0% 100%", primary: "0 0% 5%", primaryFg: "0 0% 100%", secondary: "0 0% 94%", accent: "54 100% 50%", accentFg: "0 0% 5%", muted: "0 0% 92%", mutedFg: "0 0% 35%", border: "0 0% 5%" },
    "Space Grotesk", "Work Sans", "0rem", false, "minimal"),

  // ── Clothing ──
  preset("clothing-glass", "Atelier", "Clothing", "Glassmorphic",
    { bg: "250 40% 97%", fg: "250 20% 20%", card: "0 0% 100%", primary: "262 60% 55%", primaryFg: "0 0% 100%", secondary: "250 30% 93%", accent: "300 60% 65%", muted: "250 30% 92%", mutedFg: "250 10% 45%", border: "250 25% 88%" },
    "Syne", "Manrope", "1.5rem", true, "showcase"),
  preset("clothing-elegant", "Maison Noir", "Clothing", "Elegant",
    { bg: "40 10% 97%", fg: "0 0% 10%", card: "0 0% 100%", primary: "0 0% 10%", primaryFg: "43 60% 70%", secondary: "40 10% 92%", accent: "43 74% 49%", muted: "40 10% 90%", mutedFg: "0 0% 40%", border: "0 0% 88%" },
    "Playfair Display", "Lato", "0.75rem", false, "magazine"),

  // ── Shoes ──
  preset("shoes-bold", "Stride", "Shoes", "Bold",
    { bg: "0 0% 100%", fg: "0 0% 10%", card: "0 0% 100%", primary: "14 90% 53%", primaryFg: "0 0% 100%", secondary: "0 0% 95%", accent: "45 100% 51%", muted: "0 0% 95%", mutedFg: "0 0% 40%", border: "0 0% 88%" },
    "Syne", "DM Sans", "1.25rem", false, "showcase"),
  preset("shoes-street", "Soled Out", "Shoes", "Streetwear",
    { bg: "0 0% 7%", fg: "0 0% 95%", card: "0 0% 10%", primary: "84 81% 44%", primaryFg: "0 0% 5%", secondary: "0 0% 14%", accent: "84 81% 44%", accentFg: "0 0% 5%", muted: "0 0% 16%", mutedFg: "0 0% 60%", border: "0 0% 20%" },
    "Space Grotesk", "Work Sans", "0rem", false, "minimal"),

  // ── Jewelry ──
  preset("jewelry-vintage", "Lustre", "Jewelry", "Vintage",
    { bg: "40 20% 96%", fg: "160 30% 15%", card: "0 0% 100%", primary: "160 40% 25%", primaryFg: "40 40% 90%", secondary: "40 18% 92%", accent: "345 30% 70%", muted: "40 15% 90%", mutedFg: "160 10% 40%", border: "40 15% 86%" },
    "Cormorant Garamond", "Nunito Sans", "0.75rem", false, "magazine"),

  // ── Beauty / Cosmetics ──
  preset("beauty-glass", "Glow", "Beauty & Cosmetics", "Glassmorphic",
    { bg: "350 50% 97%", fg: "340 20% 25%", card: "0 0% 100%", primary: "340 70% 60%", primaryFg: "0 0% 100%", secondary: "350 35% 93%", accent: "20 90% 70%", muted: "350 30% 93%", mutedFg: "340 10% 45%", border: "350 25% 88%" },
    "Playfair Display", "Raleway", "1.5rem", true, "showcase"),

  // ── Home Decor ──
  preset("home-clean", "Hearth", "Home Decor", "Clean",
    { bg: "30 20% 97%", fg: "25 15% 22%", card: "0 0% 100%", primary: "18 50% 50%", primaryFg: "0 0% 100%", secondary: "30 18% 92%", accent: "40 30% 70%", muted: "30 15% 92%", mutedFg: "25 10% 45%", border: "30 15% 87%" },
    "Lora", "Karla", "0.5rem", false, "minimal"),

  // ── Cafe / Bakery ──
  preset("cafe-vintage", "Daily Grind", "Cafe & Bakery", "Vintage",
    { bg: "35 35% 94%", fg: "25 30% 20%", card: "35 35% 98%", primary: "25 45% 35%", primaryFg: "35 40% 92%", secondary: "35 28% 90%", accent: "15 60% 55%", muted: "35 25% 88%", mutedFg: "25 15% 40%", border: "35 20% 82%" },
    "Playfair Display", "PT Sans", "0.75rem", false, "classic"),
];

export const PRESET_BUSINESS_TYPES = Array.from(new Set(storefrontPresets.map((p) => p.businessType)));
export const PRESET_STYLES = Array.from(new Set(storefrontPresets.map((p) => p.style)));
