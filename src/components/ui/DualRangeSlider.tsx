import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";
import { useAppearance } from "@/contexts/AppearanceContext";

interface DualRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  label?: string;
  formatLabel?: (value: number) => string;
}

export const DualRangeSlider = ({
  min,
  max,
  value,
  onValueChange,
  label,
  formatLabel = (v) => String(v),
}: DualRangeSliderProps) => {
  const [minVal, setMinVal] = useState(value[0]);
  const [maxVal, setMaxVal] = useState(value[1]);
  const minValRef = useRef<HTMLInputElement>(null);
  const maxValRef = useRef<HTMLInputElement>(null);
  const range = useRef<HTMLDivElement>(null);
  const { settings } = useAppearance();

  // Calculate percentage for filling the track
  const getPercent = useCallback(
    (val: number) => Math.round(((val - min) / (max - min)) * 100),
    [min, max]
  );

  // Set width of the range to indicate selected area
  useEffect(() => {
    if (maxValRef.current && range.current) {
      const percent1 = getPercent(minVal);
      const percent2 = getPercent(maxVal);
      range.current.style.left = `${percent1}%`;
      range.current.style.width = `${percent2 - percent1}%`;
    }
  }, [minVal, maxVal, getPercent]);

  // Get primary color from CSS variables
  const getPrimaryColor = useCallback(() => {
    if (typeof document === 'undefined') return '#000000';
    const root = document.documentElement;
    const primaryHsl = root.style.getPropertyValue('--primary').trim();
    if (!primaryHsl) return '#000000'; // Fallback
    
    // Convert HSL to RGB for easier use in background-color
    const [h, s, l] = primaryHsl.split(' ').map(parseFloat);
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

    const to255 = (val: number) => Math.round((val + m) * 255);
    return `rgb(${to255(r)}, ${to255(g)}, ${to255(b)})`;
  }, []);

  const primaryColor = getPrimaryColor();

  // Update parent component's value when minVal or maxVal change
  useEffect(() => {
    onValueChange([minVal, maxVal]);
  }, [minVal, maxVal, onValueChange]);

  // Sync internal state with external value prop
  useEffect(() => {
    setMinVal(value[0]);
    setMaxVal(value[1]);
  }, [value]);

  const blurEnabled = settings.blurEnabled;

  return (
    <div className="relative w-full">
      {label && <Label className="mb-4 block">{label}</Label>}
      <div className="flex justify-between items-center mb-4 text-sm font-medium">
        <span>{formatLabel(minVal)}</span>
        <span>{formatLabel(maxVal)}</span>
      </div>

      <div className="relative h-1.5 bg-muted rounded-full">
        <div
          ref={range}
          className="absolute h-full rounded-full"
          style={{ backgroundColor: primaryColor }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={minVal}
          ref={minValRef}
          onChange={(event) => {
            const value = Math.min(Number(event.target.value), maxVal - 1);
            setMinVal(value);
            event.target.value = String(value);
          }}
          className={cn(
            "absolute w-full h-0 appearance-none bg-transparent pointer-events-none",
            "z-30 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:duration-200",
            "hover:[&::-webkit-slider-thumb]:bg-primary/80",
            blurEnabled && "[&::-webkit-slider-thumb]:bg-primary/70 hover:[&::-webkit-slider-thumb]:bg-primary/90"
          )}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={maxVal}
          ref={maxValRef}
          onChange={(event) => {
            const value = Math.max(Number(event.target.value), minVal + 1);
            setMaxVal(value);
            event.target.value = String(value);
          }}
          className={cn(
            "absolute w-full h-0 appearance-none bg-transparent pointer-events-none",
            "z-40 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:duration-200",
            "hover:[&::-webkit-slider-thumb]:bg-primary/80",
            blurEnabled && "[&::-webkit-slider-thumb]:bg-primary/70 hover:[&::-webkit-slider-thumb]:bg-primary/90"
          )}
        />
      </div>
    </div>
  );
};