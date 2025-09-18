import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { hslToHex, hexToHsl } from "@/utils/colors";

export const ColorPickerInput = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
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