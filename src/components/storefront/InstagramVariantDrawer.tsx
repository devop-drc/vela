"use client";

import React, { useEffect, useMemo } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { useIsMobile } from "@/hooks/use-mobile";

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
  productName?: string;
  productMediaUrl?: string;
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
  productName,
  productMediaUrl,
}) => {
  const isMobile = useIsMobile();

  // Sort values: defaults first, then in-stock, then alphabetical
  const sortedOptions = useMemo(() => {
    return options.map(opt => ({
      ...opt,
      values: [...opt.values].sort((a, b) => {
        const defDiff = Number(b.is_default) - Number(a.is_default);
        if (defDiff !== 0) return defDiff;
        const stockDiff = Number((b.inventory||0) > 0) - Number((a.inventory||0) > 0);
        if (stockDiff !== 0) return stockDiff;
        return a.value.localeCompare(b.value);
      })
    }));
  }, [options]);

  // No preselection on open. User must choose; values are sorted so defaults appear first.
  useEffect(() => {
    if (isOpen) {
      // Clear any incoming selections when opening to avoid preselect
      setSelectedValues(() => ({} as Record<string, string>));
    }
  }, [isOpen, setSelectedValues]);

  const selectedVariant = useMemo(() => {
    if (!variants?.length) return null;
    return (
      variants.find(v =>
        v.is_active &&
        Object.entries(selectedValues).every(([k, sv]) => v.option_values?.[k] === sv)
      ) || null
    );
  }, [variants, selectedValues]);

  const allSelected = useMemo(() => {
    if (!sortedOptions.length) return false;
    return sortedOptions.every(opt => !!selectedValues[opt.name]);
  }, [sortedOptions, selectedValues]);

  const priceDelta = useMemo(() => {
    if (!sortedOptions.length) return 0;
    let delta = 0;
    sortedOptions.forEach(opt => {
      const sel = selectedValues[opt.name];
      if (!sel) return;
      const v = opt.values.find(x => x.value === sel);
      if (v) delta += v.price_difference || 0;
    });
    return delta;
  }, [sortedOptions, selectedValues]);

  const effectivePrice = basePrice != null ? basePrice + priceDelta : null;

  const inner = (
    <>
      <div className="p-4 border-b" style={{borderColor:'hsl(var(--border))'}}>
        <div className="flex items-center gap-3 min-w-0">
          {productMediaUrl && (
            <div className="h-8 w-8 rounded-md overflow-hidden bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex-shrink-0">
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img src={productMediaUrl} className="h-full w-full object-cover" />
            </div>
          )}
          <div className="text-xl font-bold truncate">
            Select options{productName ? ` for ${productName}` : ''}
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 px-4 py-4" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' as any }}>
          {sortedOptions.map(opt => (
            <div key={opt.id} className="space-y-2 mb-4">
              <Label className="text-sm capitalize text-[hsl(var(--foreground))] opacity-80">{opt.name}</Label>
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
                        isSelected ? "bg-red-500 text-white border-red-500 hover:bg-red-600" : "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]",
                        isOOS && "opacity-60 cursor-not-allowed"
                      )}
                      title={isOOS ? "Out of stock" : undefined}
                    >
                      <span className="capitalize">{val.value}</span>
                      {val.is_default && (
                        <span className="ml-2 text-[10px] px-1 rounded bg-[hsl(var(--muted))]">Default</span>
                      )}
                      {diffText && <span className="ml-1 text-xs opacity-80">{diffText}</span>}
                      {isOOS ? (
                        <span className="ml-2 text-[10px] px-1 rounded bg-[hsl(var(--muted))]">Sold out</span>
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
        <div className="p-4 border-t flex-shrink-0" style={{ paddingBottom: 'calc(1rem + var(--sab))', borderColor:'hsl(var(--border))' }}>
          <div className="w-full">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="outline" className="text-base">
                {effectivePrice != null ? formatCurrency(effectivePrice, currency) : 'N/A'}
              </Badge>
              <div className="flex items-center border rounded-md overflow-hidden" style={{borderColor:'hsl(var(--border))'}}>
                <button className="h-9 w-9 hover:bg-[hsl(var(--muted))]" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                <div className="px-3 text-sm select-none">{quantity}</div>
                <button className="h-9 w-9 hover:bg-[hsl(var(--muted))]" onClick={() => setQuantity(Math.min(99, quantity + 1))}>+</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="w-full text-base bg-red-500 hover:bg-red-600 text-white"
                onClick={() => onConfirm("buy")}
                disabled={!allSelected || !selectedVariant || (selectedVariant.inventory||0) <= 0}
              >
                Buy
              </Button>
              <Button
                variant="outline"
                className="w-full text-base border-red-600 text-red-600 hover:bg-red-50"
                onClick={() => onConfirm("add")}
                disabled={!allSelected || !selectedVariant || (selectedVariant.inventory||0) <= 0}
              >
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
    </>
  );

  return (
    isMobile ? (
      <Drawer open={isOpen} onOpenChange={onClose} shouldScaleBackground>
        <DrawerContent side="bottom" className="p-0 flex flex-col bg-[hsl(var(--card))] text-[hsl(var(--foreground))] rounded-t-xl" style={{ maxHeight: 'calc(100dvh - var(--sat))' }}>
          {inner}
        </DrawerContent>
      </Drawer>
    ) : (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="p-0 sm:max-w-[560px] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
          <DialogHeader className="sr-only">
            <DialogTitle>Select Options</DialogTitle>
          </DialogHeader>
          {inner}
        </DialogContent>
      </Dialog>
    )
  );
}
;
