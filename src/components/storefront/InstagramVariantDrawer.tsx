"use client";

import React, { useMemo } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";

export interface VariantOptionValue {
  id: string;
  value: string;
  price_difference: number;
  inventory: number;
  is_active: boolean;
  is_default: boolean;
}

export interface VariantOption {
  id: string;
  name: string;
  values: VariantOptionValue[];
}

interface InstagramVariantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  options: VariantOption[];
  selectedValues: Record<string, string>;
  setSelectedValues: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  quantity: number;
  setQuantity: (n: number) => void;
  currency?: string;
  basePrice: number | null;
  variants?: Array<{ combination_key: string; option_values: Record<string,string>; inventory: number; is_active: boolean }>;
  onConfirm: (action: "add" | "buy") => void;
}

export const InstagramVariantDrawer: React.FC<InstagramVariantDrawerProps> = ({
  isOpen,
  onClose,
  options,
  selectedValues,
  setSelectedValues,
  quantity,
  setQuantity,
  currency,
  basePrice,
  variants = [],
  onConfirm,
}) => {
  const priceDelta = useMemo(() => {
    if (!options.length) return 0;
    let delta = 0;
    options.forEach(opt => {
      const sel = selectedValues[opt.name];
      if (!sel) return;
      const v = opt.values.find(x => x.value === sel);
      if (v) delta += v.price_difference || 0;
    });
    return delta;
  }, [options, selectedValues]);

  const effectivePrice = basePrice != null ? basePrice + priceDelta : null;

  return (
    <Drawer open={isOpen} onOpenChange={onClose} shouldScaleBackground>
      <DrawerContent side="bottom" className="p-0 flex flex-col bg-white text-black rounded-t-xl" style={{ maxHeight: 'calc(100dvh - var(--sat))' }}>
        <DrawerHeader className="p-4 border-b border-gray-200 flex-row items-center justify-between flex-shrink-0">
          <DrawerTitle className="text-xl font-bold text-gray-800">Select Options</DrawerTitle>
        </DrawerHeader>
        <ScrollArea className="flex-1 px-4 py-4" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' as any }}>
          {options.map(opt => (
            <div key={opt.id} className="space-y-2 mb-4">
              <Label className="text-sm text-gray-700 capitalize">{opt.name}</Label>
              <div className="flex flex-wrap gap-2">
                {opt.values.map(val => {
                  // Disable if selecting this value with current selections cannot produce an active in-stock variant
                  const hypothetical = { ...selectedValues, [opt.name]: val.value };
                  const matches = variants.filter(v => v.is_active && (v.inventory||0) > 0).some(v =>
                    Object.entries(hypothetical).every(([k, sv]) => v.option_values?.[k] === sv)
                  );
                  const isOOS = val.inventory <= 0 || !val.is_active || !matches;
                  const isSelected = selectedValues[opt.name] === val.value;
                  const diffText = val.price_difference ? `(${val.price_difference > 0 ? '+' : ''}${formatCurrency(val.price_difference, currency)})` : '';
                  return (
                    <Button
                      key={val.id || val.value}
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => !isOOS && setSelectedValues(prev => ({ ...prev, [opt.name]: val.value }))}
                      disabled={isOOS}
                      className={cn(
                        "text-sm h-9 px-3",
                        isSelected ? "bg-red-500 text-white border-red-500 hover:bg-red-600" : "bg-gray-50 text-gray-800 border-gray-300 hover:bg-gray-100",
                        isOOS && "opacity-60 cursor-not-allowed"
                      )}
                      title={isOOS ? "Out of stock" : undefined}
                    >
                      <span className="capitalize">{val.value}</span>
                      {diffText && <span className="ml-1 text-xs opacity-80">{diffText}</span>}
                      {isOOS ? (
                        <span className="ml-2 text-[10px] px-1 rounded bg-gray-200 text-gray-700">Sold out</span>
                      ) : (
                        <span className="ml-2 text-[10px] opacity-70">{val.inventory}</span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </ScrollArea>
        <DrawerFooter className="p-4 border-t border-gray-200 flex-shrink-0" style={{ paddingBottom: 'calc(1rem + var(--sab))' }}>
          <div className="w-full">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="outline" className="text-base">
                {effectivePrice != null ? formatCurrency(effectivePrice, currency) : 'N/A'}
              </Badge>
              <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                <button className="h-9 w-9 text-gray-800 hover:bg-gray-100" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                <div className="px-3 text-sm select-none">{quantity}</div>
                <button className="h-9 w-9 text-gray-800 hover:bg-gray-100" onClick={() => setQuantity(Math.min(99, quantity + 1))}>+</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button className="w-full text-base bg-red-500 hover:bg-red-600 text-white" onClick={() => onConfirm("buy")}>Buy</Button>
              <Button variant="outline" className="w-full text-base border-red-600 text-red-600 hover:bg-red-50" onClick={() => onConfirm("add")}>Add to Cart</Button>
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
