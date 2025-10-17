import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Settings, Package, DollarSign, XCircle, CheckCircle, MoveVertical, Edit, Minus, Plus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TagInput } from '../TagInput';
import { useShop } from '@/contexts/ShopContext';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatCurrency } from '@/lib/formatters';
import { Reorder } from 'framer-motion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';

// --- Types ---
interface Option {
  id: string;
  name: string;
  values: string[];
}

interface Variant {
  id: string;
  name: string; // e.g., "Red / Small"
  optionValues: string[]; // e.g., ["Red", "Small"]
  priceDifference: number; // Difference from base price
  inventory: number;
  sku: string;
  disabled: boolean;
}

interface VariantManagerProps {
  initialOptions: Option[];
  initialVariants: Variant[];
  basePrice: number; // In shop's display currency
  baseInventory: number;
  onUpdate: (options: Option[], variants: Variant[]) => void;
}

// Helper function to generate all combinations
const generateCombinations = (options: Option[]): { name: string, optionValues: string[] }[] => {
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
  
  return combinations.map(combo => ({
    name: combo.join(' / '),
    optionValues: combo,
  }));
};

// Helper to convert snake_case to Title Case for display
const toTitleCase = (str: string) => str.replace(/_/g, ' ').replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

// --- Bulk Edit Modals ---

const bulkPriceSchema = z.object({
  priceAction: z.enum(['set', 'add', 'subtract']),
  priceValue: z.coerce.number(),
});

const BulkPriceModal = ({ isOpen, onClose, onApply, currencyCode }: { isOpen: boolean, onClose: () => void, onApply: (data: z.infer<typeof bulkPriceSchema>) => void, currencyCode: string }) => {
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm({
    resolver: zodResolver(bulkPriceSchema),
    defaultValues: { priceAction: 'set', priceValue: 0 },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bulk Price Edit</DialogTitle>
          <p className="text-sm text-muted-foreground">Apply a price adjustment to all selected variants.</p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onApply)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Action</Label>
            <div className="flex gap-2">
              <select {...register('priceAction')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="set">Set Difference To</option>
                <option value="add">Increase Difference By</option>
                <option value="subtract">Decrease Difference By</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Value ({currencyCode})</Label>
            <Input type="number" step="0.01" {...register('priceValue', { valueAsNumber: true })} />
            {errors.priceValue && <p className="text-sm text-destructive">{errors.priceValue.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>Apply</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const bulkStockSchema = z.object({
  stockAction: z.enum(['set', 'add', 'subtract']),
  stockValue: z.coerce.number().int().min(0, "Stock must be non-negative"),
});

const BulkStockModal = ({ isOpen, onClose, onApply }: { isOpen: boolean, onClose: () => void, onApply: (data: z.infer<typeof bulkStockSchema>) => void }) => {
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm({
    resolver: zodResolver(bulkStockSchema),
    defaultValues: { stockAction: 'set', stockValue: 0 },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bulk Stock Edit</DialogTitle>
          <p className="text-sm text-muted-foreground">Adjust the inventory quantity for all selected variants.</p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onApply)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Action</Label>
            <div className="flex gap-2">
              <select {...register('stockAction')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="set">Set Stock To</option>
                <option value="add">Increase Stock By</option>
                <option value="subtract">Decrease Stock By</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Value</Label>
            <Input type="number" step="1" {...register('stockValue', { valueAsNumber: true })} />
            {errors.stockValue && <p className="text-sm text-destructive">{errors.stockValue.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>Apply</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


// --- Main Component ---

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
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  const [isBulkStockModalOpen, setIsBulkStockModalOpen] = useState(false);

  const isMounted = useRef(false); // Ref to track if component has mounted

  const currencyCode = shopDetails?.currency || 'USD';
  
  const displayBasePrice = basePrice; 

  // --- Option Management ---
  const handleAddOption = () => {
    if (newOptionName && !options.some(o => o.name.toLowerCase() === newOptionName.toLowerCase())) {
      const newOptions = [...options, { id: crypto.randomUUID(), name: toTitleCase(newOptionName), values: [] }];
      setOptions(newOptions);
      setNewOptionName('');
      onUpdate(newOptions, variants); // Immediate update to parent
    }
  };

  const handleRemoveOption = (id: string) => {
    const newOptions = options.filter(o => o.id !== id);
    setOptions(newOptions);
    onUpdate(newOptions, variants); // Immediate update to parent
  };

  const handleOptionValuesChange = (id: string, newValues: string[]) => {
    const newOptions = options.map(opt => opt.id === id ? { ...opt, values: newValues } : opt);
    setOptions(newOptions);
    onUpdate(newOptions, variants); // Immediate update to parent
  };

  const handleOptionNameChange = (id: string, newName: string) => {
    const newOptions = options.map(opt => opt.id === id ? { ...opt, name: toTitleCase(newName) } : opt);
    setOptions(newOptions);
    onUpdate(newOptions, variants); // Immediate update to parent
  };

  const handleReorderOptions = (newOrder: Option[]) => {
    setOptions(newOrder);
    onUpdate(newOrder, variants); // Immediate update to parent
  };

  // --- Variant Generation & Sync ---
  const combinations = useMemo(() => generateCombinations(options), [options]);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return; // Skip initial run to prevent calling onUpdate during render
    }

    setVariants(prevVariants => {
      const existingMap = new Map(prevVariants.map(v => [v.name, v]));
      const newVariants: Variant[] = [];

      combinations.forEach(combo => {
        const existingVariant = existingMap.get(combo.name);
        
        if (existingVariant) {
          // Keep existing variant data, but update optionValues array if options were reordered
          newVariants.push({ ...existingVariant, optionValues: combo.optionValues });
        } else {
          // Create new variant with default values
          newVariants.push({
            id: crypto.randomUUID(),
            name: combo.name,
            optionValues: combo.optionValues,
            priceDifference: 0, // Default to 0 difference
            inventory: baseInventory,
            sku: combo.name.toUpperCase().replace(/[^A-Z0-9]/g, '-').substring(0, 20),
            disabled: false,
          });
        }
      });
      
      // Filter out old variants that no longer match combinations
      const finalVariants = newVariants.filter(v => combinations.some(c => c.name === v.name));
      
      // Update parent form/state
      onUpdate(options, finalVariants);
      return finalVariants;
    });
  }, [options, baseInventory, combinations]); // Removed onUpdate from dependencies as it's called inside setVariants

  // --- Variant Table Handlers ---
  const handleVariantUpdate = (id: string, key: keyof Variant, value: any) => {
    setVariants(prev => {
      const newVariants = prev.map(v => v.id === id ? { ...v, [key]: value } : v);
      onUpdate(options, newVariants);
      return newVariants;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedVariantIds(prev => 
      prev.includes(id) ? prev.filter(vId => vId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVariantIds(variants.map(v => v.id));
    } else {
      setSelectedVariantIds([]);
    }
  };

  const handleBulkAction = (action: 'disable' | 'enable' | 'delete') => {
    if (action === 'delete') {
      setVariants(prev => {
        const newVariants = prev.filter(v => !selectedVariantIds.includes(v.id));
        onUpdate(options, newVariants);
        return newVariants;
      });
    } else {
      setVariants(prev => {
        const newVariants = prev.map(v => 
          selectedVariantIds.includes(v.id) ? { ...v, disabled: action === 'disable' } : v
        );
        onUpdate(options, newVariants);
        return newVariants;
      });
    }
    setSelectedVariantIds([]);
  };

  const handleApplyBulkPrice = (data: z.infer<typeof bulkPriceSchema>) => {
    setVariants(prev => {
      const newVariants = prev.map(v => {
        if (selectedVariantIds.includes(v.id)) {
          let newDiff = v.priceDifference;
          switch (data.priceAction) {
            case 'set':
              newDiff = data.priceValue;
              break;
            case 'add':
              newDiff += data.priceValue;
              break;
            case 'subtract':
              newDiff -= data.priceValue;
              break;
          }
          return { ...v, priceDifference: newDiff };
        }
        return v;
      });
      onUpdate(options, newVariants);
      return newVariants;
    });
    setSelectedVariantIds([]);
    setIsBulkPriceModalOpen(false);
  };

  const handleApplyBulkStock = (data: z.infer<typeof bulkStockSchema>) => {
    setVariants(prev => {
      const newVariants = prev.map(v => {
        if (selectedVariantIds.includes(v.id)) {
          let newStock = v.inventory;
          switch (data.stockAction) {
            case 'set':
              newStock = data.stockValue;
              break;
            case 'add':
              newStock += data.stockValue;
              break;
            case 'subtract':
              newStock = Math.max(0, newStock - data.stockValue);
              break;
          }
          return { ...v, inventory: newStock };
        }
        return v;
      });
      onUpdate(options, newVariants);
      return newVariants;
    });
    setSelectedVariantIds([]);
    setIsBulkStockModalOpen(false);
  };

  const isAllSelected = variants.length > 0 && selectedVariantIds.length === variants.length;
  const hasSelection = selectedVariantIds.length > 0;

  return (
    <>
      <BulkPriceModal isOpen={isBulkPriceModalOpen} onClose={() => setIsBulkPriceModalOpen(false)} onApply={handleApplyBulkPrice} currencyCode={currencyCode} />
      <BulkStockModal isOpen={isBulkStockModalOpen} onClose={() => setIsBulkStockModalOpen(false)} onApply={handleApplyBulkStock} />

      <div className="space-y-6">
        {/* --- 1. Option Management --- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Define Product Options
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Define customer-selectable options (e.g., Color, Size). Changing options automatically updates the variants table below.
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
                        onChange={(e) => handleOptionNameChange(option.id, e.target.value)}
                        className="font-semibold text-base border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent"
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveOption(option.id)} className="h-6 w-6 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <TagInput
                    value={option.values}
                    onChange={(newValues) => handleOptionValuesChange(option.id, newValues)}
                    placeholder={`Enter values for ${option.name} (e.g., Red, Blue)`}
                  />
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

        {/* --- 2. Variant Management Table --- */}
        {combinations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Variants ({variants.filter(v => !v.disabled).length} active of {variants.length})
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsBulkPriceModalOpen(true)} disabled={!hasSelection}>
                    <DollarSign className="mr-2 h-4 w-4" /> Bulk Price
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsBulkStockModalOpen(true)} disabled={!hasSelection}>
                    <Package className="mr-2 h-4 w-4" /> Bulk Stock
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={!hasSelection}>
                        <Edit className="mr-2 h-4 w-4" /> Bulk Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleBulkAction('enable')} disabled={!hasSelection}>
                        <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" /> Mark as Available
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction('disable')} disabled={!hasSelection}>
                        <XCircle className="mr-2 h-4 w-4 text-amber-600" /> Mark as Unavailable
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction('delete')} disabled={!hasSelection} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Base Price: <span className="font-semibold">{formatCurrency(displayBasePrice, currencyCode)}</span>. Price adjustments are relative to this base price.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <input type="checkbox" checked={isAllSelected} onChange={(e) => handleSelectAll(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                      </TableHead>
                      <TableHead className="w-[250px]">Variant Preview</TableHead>
                      <TableHead className="w-[120px]">Price Diff ({currencyCode})</TableHead>
                      <TableHead className="w-[120px]">Final Price</TableHead>
                      <TableHead className="w-[100px]">Stock</TableHead>
                      <TableHead className="w-[120px]">SKU</TableHead>
                      <TableHead className="w-[50px] text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((variant) => {
                      const finalPrice = displayBasePrice + variant.priceDifference;
                      const isSelected = selectedVariantIds.includes(variant.id);
                      
                      return (
                        <TableRow key={variant.id} className={cn(variant.disabled && "opacity-50 bg-muted/50", isSelected && "bg-accent/50")}>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(variant.id)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                          </TableCell>
                          <TableCell className="font-medium">{variant.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={variant.priceDifference}
                                onChange={(e) => handleVariantUpdate(variant.id, 'priceDifference', parseFloat(e.target.value) || 0)}
                                className="h-8 w-full text-sm"
                                disabled={variant.disabled}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={cn("font-semibold text-sm", finalPrice < displayBasePrice && "text-destructive", finalPrice > displayBasePrice && "text-emerald-600")}>
                              {formatCurrency(finalPrice, currencyCode)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="1"
                              value={variant.inventory}
                              onChange={(e) => handleVariantUpdate(variant.id, 'inventory', parseInt(e.target.value) || 0)}
                              className="h-8 w-full text-sm"
                              disabled={variant.disabled}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              value={variant.sku}
                              onChange={(e) => handleVariantUpdate(variant.id, 'sku', e.target.value)}
                              className="h-8 w-full text-sm"
                              disabled={variant.disabled}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" className={cn(variant.disabled ? "bg-gray-500 text-white" : "bg-emerald-500 text-white")}>
                              {variant.disabled ? 'Unavailable' : 'Available'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};