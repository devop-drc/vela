import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Settings, Package, DollarSign, XCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TagInput } from '../TagInput';
import { useShop } from '@/contexts/ShopContext';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

interface Option {
  name: string;
  values: string[];
}

interface Variant {
  id: string;
  name: string; // e.g., "Red / Small"
  price: number;
  inventory: number;
  sku: string;
  disabled: boolean;
}

interface VariantManagerProps {
  initialOptions: Option[];
  initialVariants: Variant[];
  basePrice: number;
  baseInventory: number;
  onUpdate: (options: Option[], variants: Variant[]) => void;
}

// Helper function to generate all combinations
const generateCombinations = (options: Option[]): string[] => {
  const activeOptions = options.filter(opt => opt.values.length > 0);
  if (activeOptions.length === 0) return [];
  
  const combinations: string[][] = [];
  const helper = (index: number, current: string[]) => {
    if (index === activeOptions.length) {
      combinations.push(current);
      return;
    }
    activeOptions[index].values.forEach(value => {
      helper(index + 1, [...current, value]);
    });
  };
  helper(0, []);
  
  return combinations.map(combo => combo.join(' / '));
};

export const VariantManager: React.FC<VariantManagerProps> = ({
  initialOptions,
  initialVariants,
  basePrice,
  baseInventory,
  onUpdate,
}) => {
  const { shopDetails, convertCurrency } = useShop();
  
  const [options, setOptions] = useState<Option[]>(initialOptions);
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [newOptionName, setNewOptionName] = useState('');
  
  const currencyCode = shopDetails?.currency || 'USD';
  const displayBasePrice = convertCurrency(basePrice, 'ALL', currencyCode);

  // --- Option Management ---
  const handleAddOption = () => {
    if (newOptionName && !options.some(o => o.name.toLowerCase() === newOptionName.toLowerCase())) {
      setOptions(prev => [...prev, { name: newOptionName, values: [] }]);
      setNewOptionName('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleOptionValuesChange = (index: number, newValues: string[]) => {
    setOptions(prev => prev.map((opt, i) => i === index ? { ...opt, values: newValues } : opt));
  };

  // --- Variant Generation & Sync ---
  useEffect(() => {
    const combinations = generateCombinations(options);
    
    setVariants(prevVariants => {
      const existingMap = new Map(prevVariants.map(v => [v.name, v]));
      const newVariants: Variant[] = [];

      combinations.forEach(comboName => {
        const existingVariant = existingMap.get(comboName);
        
        if (existingVariant) {
          // Keep existing variant data
          newVariants.push(existingVariant);
        } else {
          // Create new variant with default values
          newVariants.push({
            id: crypto.randomUUID(),
            name: comboName,
            price: displayBasePrice,
            inventory: baseInventory,
            sku: comboName.toUpperCase().replace(/[^A-Z0-9]/g, '-').substring(0, 20),
            disabled: false,
          });
        }
      });
      
      // Filter out old variants that no longer match combinations
      const finalVariants = newVariants.filter(v => combinations.includes(v.name));
      
      // Update parent form/state
      onUpdate(options, finalVariants);
      return finalVariants;
    });
  }, [options, basePrice, baseInventory, displayBasePrice, onUpdate]);

  // --- Variant Table Handlers ---
  const handleVariantUpdate = (index: number, key: keyof Variant, value: any) => {
    setVariants(prev => {
      const newVariants = prev.map((v, i) => i === index ? { ...v, [key]: value } : v);
      onUpdate(options, newVariants);
      return newVariants;
    });
  };

  const handleVariantDelete = (index: number) => {
    setVariants(prev => {
      const newVariants = prev.filter((_, i) => i !== index);
      onUpdate(options, newVariants);
      return newVariants;
    });
  };

  const handleToggleDisable = (index: number) => {
    setVariants(prev => {
      const newVariants = prev.map((v, i) => i === index ? { ...v, disabled: !v.disabled } : v);
      onUpdate(options, newVariants);
      return newVariants;
    });
  };

  const hasActiveOptions = options.some(opt => opt.values.length > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Define Options
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Define customer-selectable options (e.g., Color, Size). Combinations will automatically generate variants.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {options.map((option, index) => (
              <div key={option.name} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold capitalize">{option.name}</Label>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveOption(index)} className="h-6 w-6 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <TagInput
                  value={option.values}
                  onChange={(newValues) => handleOptionValuesChange(index, newValues)}
                  placeholder={`Enter values for ${option.name} (e.g., Red, Blue, Green)`}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
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

      {hasActiveOptions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Variants ({variants.filter(v => !v.disabled).length} active)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Total combinations: {generateCombinations(options).length}. Set unique price and stock.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Variant Name</TableHead>
                    <TableHead className="w-[120px]">Price ({currencyCode})</TableHead>
                    <TableHead className="w-[100px]">Stock</TableHead>
                    <TableHead className="w-[120px]">SKU</TableHead>
                    <TableHead className="w-[50px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((variant, index) => (
                    <TableRow key={variant.id} className={cn(variant.disabled && "opacity-50 bg-muted/50")}>
                      <TableCell className="font-medium">
                        {variant.name}
                        {variant.disabled && <Badge variant="secondary" className="ml-2">Disabled</Badge>}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={variant.price}
                          onChange={(e) => handleVariantUpdate(index, 'price', parseFloat(e.target.value) || 0)}
                          className="h-8 w-full text-sm"
                          disabled={variant.disabled}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="1"
                          value={variant.inventory}
                          onChange={(e) => handleVariantUpdate(index, 'inventory', parseInt(e.target.value) || 0)}
                          className="h-8 w-full text-sm"
                          disabled={variant.disabled}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={variant.sku}
                          onChange={(e) => handleVariantUpdate(index, 'sku', e.target.value)}
                          className="h-8 w-full text-sm"
                          disabled={variant.disabled}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleToggleDisable(index)} className="h-8 w-8">
                            {variant.disabled ? <CheckCircle className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleVariantDelete(index)} className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};