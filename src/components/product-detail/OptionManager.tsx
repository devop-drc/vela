import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Settings, MoveVertical, Edit, DollarSign, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TagInput } from '../TagInput';
import { useShop } from '@/contexts/ShopContext';
import { ScrollArea } from '../ui/scroll-area';
import { formatCurrency } from '@/lib/formatters';
import { Reorder } from 'framer-motion';

// --- Types for Additive Options Model ---
interface OptionValue {
  value: string;
  priceDifference: number; // Price difference relative to the base product price
}

interface Option {
  id: string;
  name: string;
  values: OptionValue[];
}

interface OptionManagerProps {
  initialOptions: Option[];
  basePrice: number; // In shop's display currency
  onUpdate: (options: Option[]) => void;
}

// Helper to convert snake_case to Title Case for display
const toTitleCase = (str: string) => str.replace(/_/g, ' ').replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

export const OptionManager: React.FC<OptionManagerProps> = ({
  initialOptions,
  basePrice,
  onUpdate,
}) => {
  const { shopDetails } = useShop();
  const [options, setOptions] = useState<Option[]>(initialOptions);
  const [newOptionName, setNewOptionName] = useState('');
  const currencyCode = shopDetails?.currency || 'USD';

  useEffect(() => {
    setOptions(initialOptions);
  }, [initialOptions]);

  // --- Option Management ---
  const handleAddOption = () => {
    if (newOptionName && !options.some(o => o.name.toLowerCase() === newOptionName.toLowerCase())) {
      const newOptions = [...options, { id: crypto.randomUUID(), name: toTitleCase(newOptionName), values: [] }];
      setOptions(newOptions);
      setNewOptionName('');
      onUpdate(newOptions);
    }
  };

  const handleRemoveOption = (id: string) => {
    const newOptions = options.filter(o => o.id !== id);
    setOptions(newOptions);
    onUpdate(newOptions);
  };

  const handleReorderOptions = (newOrder: Option[]) => {
    setOptions(newOrder);
    onUpdate(newOrder);
  };

  // --- Option Value Management ---
  const handleOptionValuesChange = (optionId: string, newValues: string[]) => {
    setOptions(prevOptions => {
      const newOptions = prevOptions.map(opt => {
        if (opt.id === optionId) {
          const existingValuesMap = new Map(opt.values.map(v => [v.value, v]));
          
          const updatedValues: OptionValue[] = newValues.map(newValue => {
            const existing = existingValuesMap.get(newValue);
            return existing || { value: newValue, priceDifference: 0 };
          });

          return { ...opt, values: updatedValues };
        }
        return opt;
      });
      onUpdate(newOptions);
      return newOptions;
    });
  };

  const handlePriceDifferenceChange = (optionId: string, valueName: string, newDiff: number) => {
    setOptions(prevOptions => {
      const newOptions = prevOptions.map(opt => {
        if (opt.id === optionId) {
          const updatedValues = opt.values.map(v => 
            v.value === valueName ? { ...v, priceDifference: newDiff } : v
          );
          return { ...opt, values: updatedValues };
        }
        return opt;
      });
      onUpdate(newOptions);
      return newOptions;
    });
  };

  // --- Summary Calculation ---
  const totalOptionValues = options.reduce((sum, opt) => sum + opt.values.length, 0);
  
  const minPrice = options.reduce((min, opt) => {
    if (opt.values.length === 0) return min;
    const minDiff = Math.min(...opt.values.map(v => v.priceDifference));
    return min + minDiff;
  }, basePrice);

  const maxPrice = options.reduce((max, opt) => {
    if (opt.values.length === 0) return max;
    const maxDiff = Math.max(...opt.values.map(v => v.priceDifference));
    return max + maxDiff;
  }, basePrice);

  return (
    <div className="space-y-6">
      {/* --- 1. Option Management --- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Define Product Options
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Define customer-selectable options (e.g., Color, Size). Each option value can carry an additive price adjustment.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Reorder.Group axis="y" values={options} onReorder={handleReorderOptions} className="space-y-4">
            {options.map((option) => (
              <Reorder.Item key={option.id} value={option} className="p-3 border rounded-lg space-y-2 bg-background shadow-sm cursor-grab active:cursor-grabbing">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MoveVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      value={option.name}
                      onChange={(e) => setOptions(prev => prev.map(o => o.id === option.id ? { ...o, name: toTitleCase(e.target.value) } : o))}
                      onBlur={() => onUpdate(options)}
                      className="font-semibold text-base border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent"
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveOption(option.id)} className="h-6 w-6 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Label className="text-xs text-muted-foreground">Option Values (Enter values separated by Enter or comma)</Label>
                <TagInput
                  value={option.values.map(v => v.value)}
                  onChange={(newValues) => handleOptionValuesChange(option.id, newValues)}
                  placeholder={`Enter values for ${option.name} (e.g., Red, Blue)`}
                />
                
                {/* Price Difference Table for Values */}
                {option.values.length > 0 && (
                  <div className="pt-3">
                    <Label className="text-xs font-semibold text-muted-foreground">Price Adjustment per Value</Label>
                    <Table className="mt-1 border rounded-md">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-1/2">Value</TableHead>
                          <TableHead className="w-1/2">Price Diff ({currencyCode})</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {option.values.map(val => (
                          <TableRow key={val.value}>
                            <TableCell className="font-medium text-sm">{val.value}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={val.priceDifference}
                                onChange={(e) => handlePriceDifferenceChange(option.id, val.value, parseFloat(e.target.value) || 0)}
                                className="h-8 w-full text-sm"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="New Option Name (e.g., Material)"
              value={newOptionName}
              onChange={(e) => setNewOptionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
            />
            <Button type="button" onClick={handleAddOption} disabled={!newOptionName}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Option
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* --- 2. Price Summary --- */}
      {totalOptionValues > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Price Range Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Base Price:</span>
              <span className="font-semibold">{formatCurrency(basePrice, currencyCode)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Option Adjustments:</span>
              <span className="font-semibold">{formatCurrency(minPrice - basePrice, currencyCode, 'en-US', true)} to {formatCurrency(maxPrice - basePrice, currencyCode, 'en-US', true)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Final Price Range:</span>
              <span>{formatCurrency(minPrice, currencyCode)} - {formatCurrency(maxPrice, currencyCode)}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              The final price displayed on the storefront will be the lowest price in this range.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};