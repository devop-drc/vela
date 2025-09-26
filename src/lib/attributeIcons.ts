import { Palette, Ruler, Frame, ScanText, Cog, Weight, Layers, Cpu, HardDrive, Camera, Wifi, Battery, Fingerprint } from "lucide-react";

export const getAttributeIcon = (key: string) => {
  const lowerKey = key.toLowerCase().replace(/_/g, ' ');
  if (lowerKey.includes('color')) return Palette;
  if (lowerKey.includes('size')) return Ruler;
  if (lowerKey.includes('material')) return Layers;
  if (lowerKey.includes('weight')) return Weight;
  if (lowerKey.includes('dimension')) return Frame;
  if (lowerKey.includes('processor') || lowerKey.includes('chip')) return Cpu;
  if (lowerKey.includes('storage') || lowerKey.includes('memory')) return HardDrive;
  if (lowerKey.includes('camera')) return Camera;
  if (lowerKey.includes('connectivity') || lowerKey.includes('wifi')) return Wifi;
  if (lowerKey.includes('battery')) return Battery;
  if (lowerKey.includes('security') || lowerKey.includes('biometric')) return Fingerprint;
  if (lowerKey.includes('screen') || lowerKey.includes('display')) return ScanText;
  return Cog;
};