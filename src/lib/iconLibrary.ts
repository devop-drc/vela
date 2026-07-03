// Curated, tree-shakeable icon set for user-selectable icons (marquee /
// announcements). Importing only these named icons keeps the bundle small —
// `import * as LucideIcons` pulls in all ~1,500 icons (~780 KB).
import {
  Sparkles, MessageSquareText, Gift, Percent, DollarSign, Truck,
  Star, Heart, Package, Tag, Info, CheckCircle, XCircle,
  Bell, Megaphone, Award, Zap, Flame, Leaf, Gem, Crown,
  ShoppingCart, Wallet, CreditCard, MapPin, User, Calendar,
  Clock, Settings, Palette, Ruler, Layers, Weight, Cpu,
  Camera, Wifi, Battery, Fingerprint, ScanText, Home, Book,
  Monitor, Utensils, Car, Gamepad2, Tent, PawPrint, Music,
  Plane, FlaskConical, Hammer, Lamp, Globe, Rocket, Scissors,
  ScrollText, Shield, Snowflake, ToyBrick, TreePine, Watch, Wrench,
  Grid3X3,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  Sparkles, MessageSquareText, Gift, Percent, DollarSign, Truck,
  Star, Heart, Package, Tag, Info, CheckCircle, XCircle,
  Bell, Megaphone, Award, Zap, Flame, Leaf, Gem, Crown,
  ShoppingCart, Wallet, CreditCard, MapPin, User, Calendar,
  Clock, Settings, Palette, Ruler, Layers, Weight, Cpu,
  Camera, Wifi, Battery, Fingerprint, ScanText, Home, Book,
  Monitor, Utensils, Car, Gamepad2, Tent, PawPrint, Music,
  Plane, FlaskConical, Hammer, Lamp, Globe, Rocket, Scissors,
  ScrollText, Shield, Snowflake, ToyBrick, TreePine, Watch, Wrench,
  Grid3X3,
};

// Names offered in icon pickers (excludes the UI-only Grid3X3).
export const ICON_NAMES: string[] = Object.keys(ICONS).filter((n) => n !== "Grid3X3");

/** Resolve a stored icon name to a component, falling back to Sparkles. */
export const getIcon = (name: string | null | undefined): LucideIcon =>
  (name && ICONS[name]) || Sparkles;
