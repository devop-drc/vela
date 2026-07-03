import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

/**
 * Controlled numeric quantity input. Allows free typing (including a temporarily
 * empty field) and commits a clamped integer on blur / valid entry.
 */
export const QuantityInput = ({ value, onChange, min = 1, max = 99, className }: QuantityInputProps) => {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    if (isNaN(n)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, n));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={draft}
      onChange={(e) => {
        // Only update the local draft while typing — don't commit intermediate
        // values to the cart (typing "50" would otherwise commit "5" first).
        setDraft(e.target.value.replace(/[^0-9]/g, ""));
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={cn(className)}
      aria-label="Quantity"
    />
  );
};

export default QuantityInput;
