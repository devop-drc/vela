import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Banknote, Package, Settings, ChevronDown, ChevronUp, CheckCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShop } from '@/contexts/ShopContext';
import { formatCurrency } from '@/lib/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { currencies } from '@/lib/currencies';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Skeleton } from '../ui/skeleton';

// Define internal types for state management
interface OptionValue {
  id?: string; // UUID from DB
  value: string;
  price_difference: number; // Converted for display
  inventory: number;
  is_active: boolean;
  is_default: boolean;
  is_deleted?: boolean; // For tracking deletions before saving
  is_new?: boolean; // For tracking new records
  isSelected?: boolean; // UI state
}

interface ProductOption {
  id?: string; // UUID from DB
  name: string;
  display_order: number;
  values: OptionValue[];
  is_deleted?: boolean; // For tracking deletions
  is_new?: boolean; // For tracking new records
}

interface OptionsManagerProps {
  productId: string;
  productCurrency: string; // The currency the product price is stored in (ALL)
  displayCurrency: string; // The currency the shop uses for display
  convertCurrency: (amount: number | null | undefined, fromCurrency?: string, toCurrency?: string) => number;
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  onUpdate: () => void;
}

const statusOptions = [
  { value: 'Active', label: 'Active', icon: CheckCircle, isActive: true, inventory: 10, color: "text-emerald-600" },
  { value: 'Draft', label: 'Draft', icon: Eye, isActive: false, inventory: 10, color: "text-amber-600" },
  { value: 'Out of Stock', label: 'Out of Stock', icon: Package, isActive: true, inventory: 0, color: "text-slate-600" },
];

// Helper to convert DB data to UI state
const mapDbToUi = (dbOptions: any[], productCurrency: string, displayCurrency: string, convertCurrency: (amount: number | null | undefined, fromCurrency?: string, toCurrency?: string) => number): ProductOption[] => {
  return dbOptions.map(opt => ({
    id: opt.id,
    name: opt.name,
    display_order: opt.display_order,
    values: (opt.option_values || []).map((val: any) => ({
      id: val.id,
      value: val.value,
      // Convert price difference from ALL (DB storage) to display currency
      price_difference: convertCurrency(val.price_difference, 'ALL', displayCurrency),
      inventory: val.inventory,
      is_active: val.is_active,
      is_default: val.is_default,
      isSelected: false,
    })),
  }));
};

// Helper to convert UI state to DB payload
const mapUiToDb = (uiOptions: ProductOption[], displayCurrency: string, convertCurrency: (amount: number | null | undefined, fromCurrency?: string, toCurrency?: string) => number, userId: string, productId: string) => {
  const optionsToUpsert: any[] = [];
  const valuesToUpsert: any[] = [];
  const optionsToDelete: string[] = [];
  const valuesToDelete: string[] = [];

  uiOptions.forEach((opt, optIndex) => {
    if (opt.is_deleted && opt.id) {
      optionsToDelete.push(opt.id);
      return;
    }
    if (opt.is_deleted) return;

    // Prepare option payload (insert/update)
    const optionPayload = {
      id: opt.id,
      product_id: productId,
      user_id: userId,
      name: opt.name,
      display_order: optIndex,
    };
    optionsToUpsert.push(optionPayload);

    opt.values.forEach(val => {
      if (val.is_deleted && val.id) {
        valuesToDelete.push(val.id);
        return;
      }
      if (val.is_deleted) return;

      // Convert price difference from display currency back to ALL (DB storage)
      const priceDiffInALL = convertCurrency(val.price_difference, displayCurrency, 'ALL');

      // Prepare value payload (insert/update)
      const valuePayload = {
        id: val.id,
        option_id: opt.id, // This will be null for new options, handled by the save logic
        user_id: userId,
        value: val.value,
        price_difference: priceDiffInALL,
        inventory: val.inventory,
        is_active: val.is_active,
        is_default: val.is_default,
      };
      valuesToUpsert.push(valuePayload);
    });
  });

  return { optionsToUpsert, valuesToUpsert, optionsToDelete, valuesToDelete };
};


// --- OptionValueRow Component ---
const OptionValueRow = ({ optionIndex, valueIndex, optionName, value, setOptions, currencyCode, convertCurrency }: any) => {
  const currencySymbol = useMemo(() => {
    return currencies.find(c => c.code === currencyCode)?.symbol || currencyCode;
  }, [currencyCode]);

  const currentStatus = useMemo(() => {
    if (!value.is_active) return statusOptions.find(s => s.value === 'Draft')!;
    if (value.inventory <= 0) return statusOptions.find(s => s.value === 'Out of Stock')!;
    return statusOptions.find(s => s.value === 'Active')!;
  }, [value.is_active, value.inventory]);

  const updateValue = useCallback((key: keyof OptionValue, newValue: any) => {
    setOptions((prev: ProductOption[]) => prev.map((opt, i) => {
      if (i === optionIndex) {
        return {
          ...opt,
          values: opt.values.map((val, j) => {
            if (j === valueIndex) {
              return { ...val, [key]: newValue };
            }
            // Handle default toggle: ensure only one is default
            if (key === 'is_default' && newValue && val.is_default) {
              return { ...val, is_default: false };
            }
            return val;
          }),
        };
      }
      return opt;
    }));
  }, [optionIndex, valueIndex, setOptions]);

  const handleStatusChange = useCallback((statusValue: string) => {
    const status = statusOptions.find(s => s.value === statusValue);
    if (status) {
      updateValue('is_active', status.isActive);
      updateValue('inventory', status.inventory);
    }
  }, [updateValue]);

  const handleRemove = useCallback(() => {
    setOptions((prev: ProductOption[]) => prev.map((opt, i) => {
      if (i === optionIndex) {
        const newValues = opt.values.map((val, j) => j === valueIndex ? { ...val, is_deleted: true, isSelected: false } : val);
        
        // If deleting the default value, set the next available value as default
        if (value.is_default) {
          const remainingValues = newValues.filter(val => !val.is_deleted);
          if (remainingValues.length > 0 && !remainingValues.some(val => val.is_default)) {
            remainingValues[0].is_default = true;
          }
        }
        return { ...opt, values: newValues };
      }
      return opt;
    }));
  }, [optionIndex, valueIndex, setOptions, value.is_default]);

  return (
    <div
      className="grid grid-cols-12 gap-2 items-center py-3 px-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
    >
      {/* Bulk Select Checkbox (Col 1) */}
      <div className="col-span-1 flex justify-center">
        <Checkbox
          checked={value.isSelected}
          onCheckedChange={(checked) => updateValue('isSelected', checked)}
          className="h-4 w-4"
        />
      </div>

      {/* Default Badge (Col 2) - Toggleable */}
      <div className="col-span-1 flex justify-center">
        <Badge
          type="button"
          variant="outline"
          className={cn(
            "text-xs font-semibold cursor-pointer transition-colors h-6 px-2 py-0",
            value.is_default ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-muted-foreground/50 hover:bg-primary/10 hover:text-primary"
          )}
          onClick={() => updateValue('is_default', true)}
          title={value.is_default ? "Default" : "Click to set as default"}
        >
          {value.is_default ? 'Default' : 'Set'}
        </Badge>
      </div>

      {/* Value Name (Col 3-5) */}
      <div className="col-span-3">
        <Input
          value={value.value}
          onChange={(e) => updateValue('value', e.target.value)}
          placeholder={`${optionName} value`}
          className="h-9 text-sm pl-3"
        />
      </div>

      {/* Price Difference (Col 6-8) */}
      <div className="col-span-3 flex items-center">
        <div className="relative w-full">
          <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            className="h-9 text-sm text-right pl-9 pr-14"
            value={value.price_difference === 0 ? '0' : value.price_difference}
            onChange={(e) => updateValue('price_difference', parseFloat(e.target.value) || 0)}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currencySymbol}</span>
        </div>
      </div>

      {/* Inventory & Status (Col 9-11) */}
      <div className="col-span-3 flex items-center gap-1">
        <div className="relative flex-1">
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            step="1"
            placeholder="0"
            className={cn(
              "h-9 text-sm text-right pl-9 pr-3",
              currentStatus.value === 'Out of Stock' && 'border-destructive/50 bg-destructive/5'
            )}
            min={0}
            value={value.inventory === 0 ? '0' : value.inventory}
            onChange={(e) => updateValue('inventory', parseInt(e.target.value) || 0)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8", currentStatus.color)} title={`Change Status: ${currentStatus.label}`}>
              <currentStatus.icon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {statusOptions.map(status => (
              <DropdownMenuItem key={status.value} onClick={() => handleStatusChange(status.value)} className={cn("flex items-center gap-2", status.color)}>
                <status.icon className="h-4 w-4" />
                {status.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Actions (Col 12) - Delete Button */}
      <div className="col-span-1 flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRemove}
          className="h-8 w-8 text-destructive hover:bg-destructive/10"
          title="Delete Value"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
OptionValueRow.displayName = 'OptionValueRow';

// --- OptionSection Component ---
const OptionSection = ({ option, index, setOptions, currencyCode, convertCurrency, isSubmitting }: any) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [bulkStockInput, setBulkStockInput] = useState('');

  const visibleValues = useMemo(() => option.values.filter((v: OptionValue) => !v.is_deleted), [option.values]);
  const selectedCount = useMemo(() => visibleValues.filter((v: OptionValue) => v.isSelected).length, [visibleValues]);
  const isAllSelected = useMemo(() => visibleValues.length > 0 && selectedCount === visibleValues.length, [visibleValues.length, selectedCount]);

  const updateOption = useCallback((key: keyof ProductOption, newValue: any) => {
    setOptions((prev: ProductOption[]) => prev.map((opt, i) => i === index ? { ...opt, [key]: newValue } : opt));
  }, [index, setOptions]);

  const handleToggleBulkSelectAll = () => {
    const newState = !isAllSelected;
    setOptions((prev: ProductOption[]) => prev.map((opt, i) => {
      if (i === index) {
        return {
          ...opt,
          values: opt.values.map(val => val.is_deleted ? val : { ...val, isSelected: newState }),
        };
      }
      return opt;
    }));
  };

  const handleBulkAction = (action: 'activate' | 'deactivate' | 'delete') => {
    setOptions((prev: ProductOption[]) => prev.map((opt, i) => {
      if (i === index) {
        const newValues = opt.values.map(val => {
          if (val.isSelected && !val.is_deleted) {
            if (action === 'delete') {
              return { ...val, is_deleted: true, isSelected: false };
            } else {
              const isActive = action === 'activate';
              return { 
                ...val, 
                is_active: isActive, 
                inventory: isActive && val.inventory === 0 ? 10 : val.inventory,
                isSelected: false 
              };
            }
          }
          return val;
        });

        // If deleting the default value, set the next available value as default
        if (action === 'delete' && opt.values.some(v => v.is_default && v.isSelected)) {
          const remainingValues = newValues.filter(v => !v.is_deleted);
          if (remainingValues.length > 0 && !remainingValues.some(v => v.is_default)) {
            remainingValues[0].is_default = true;
          }
        }
        return { ...opt, values: newValues };
      }
      return opt;
    }));
  };

  const handleBulkStockUpdate = (stockValue: number) => {
    setOptions((prev: ProductOption[]) => prev.map((opt, i) => {
      if (i === index) {
        return {
          ...opt,
          values: opt.values.map(val => {
            if (val.isSelected && !val.is_deleted) {
              return { 
                ...val, 
                inventory: stockValue, 
                is_active: stockValue > 0 ? true : val.is_active,
                isSelected: false 
              };
            }
            return val;
          }),
        };
      }
      return opt;
    }));
    setBulkStockInput('');
  };

  const handleAddValue = () => {
    updateOption('values', [
      ...option.values,
      { 
        value: 'New Value', 
        price_difference: 0, 
        inventory: 10, 
        is_active: true, 
        is_default: option.values.filter((v: OptionValue) => !v.is_deleted).length === 0, // Set as default if no other visible values exist
        is_new: true,
        isSelected: false,
      }
    ]);
  };

  return (
    <Card className="shadow-lg border-2 border-transparent focus-within:border-primary/50 transition-all">
      <CardHeader className="p-4 border-b flex-row items-center justify-between bg-muted/50 rounded-t-lg">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <Input
            value={option.name}
            onChange={(e) => updateOption('name', e.target.value)}
            placeholder="Option Name (e.g., Color)"
            className="h-8 text-lg font-semibold border-none shadow-none focus-visible:ring-0 p-0 bg-transparent"
            disabled={isSubmitting}
          />
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={() => setIsCollapsed(prev => !prev)} title={isCollapsed ? "Expand" : "Collapse"}>
              {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </Button>
          <Button type="button" variant="destructive" size="icon" onClick={() => updateOption('is_deleted', true)} title="Delete Option Group" disabled={isSubmitting}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <AnimatePresence>
      {!isCollapsed && (
          <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
          >
              <CardContent className="p-0">
                  {/* Header Row */}
                  <div className="grid grid-cols-12 gap-2 items-center py-3 px-4 bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b">
                      <div className="col-span-1 flex justify-center">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleToggleBulkSelectAll}
                          className="h-4 w-4"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">Default</div>
                      <div className="col-span-3 pl-3">Value</div>
                      <div className="col-span-3 text-right pr-14">Price Diff</div>
                      <div className="col-span-3 text-left pl-3">Inventory & Status</div>
                      <div className="col-span-1 text-center">Actions</div>
                  </div>

                  {/* Bulk Actions Toolbar */}
                  {selectedCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-accent/50 border-b overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                    >
                      <span className="text-sm font-medium flex-shrink-0">{selectedCount} values selected</span>
                      
                      {/* Row 1: Status Actions */}
                      <div className="flex flex-wrap gap-2 flex-1 md:flex-none">
                        <Button type="button" size="sm" variant="outline" onClick={() => handleBulkAction('activate')} className="h-8 text-emerald-600 border-emerald-300 hover:bg-emerald-50">
                          <CheckCircle className="h-4 w-4 mr-1" /> Activate
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => handleBulkAction('deactivate')} className="h-8 text-amber-600 border-amber-300 hover:bg-amber-50">
                          <Eye className="h-4 w-4 mr-1" /> Draft
                        </Button>
                        <Button type="button" size="sm" variant="destructive" onClick={() => handleBulkAction('delete')} className="h-8">
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>

                      {/* Row 2: Stock Adjustment */}
                      <div className="flex items-center gap-2 pt-2 md:pt-0 md:border-t-0 border-t border-accent-foreground/10">
                        <Label htmlFor={`bulk-stock-${index}`} className="text-sm font-medium flex-shrink-0">Set Stock:</Label>
                        <Input
                          id={`bulk-stock-${index}`}
                          type="number"
                          step="1"
                          min="0"
                          placeholder="e.g., 50"
                          className="h-8 text-sm w-24"
                          value={bulkStockInput}
                          onChange={(e) => setBulkStockInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const stockValue = parseInt(bulkStockInput);
                              if (!isNaN(stockValue) && stockValue >= 0) {
                                handleBulkStockUpdate(stockValue);
                              }
                            }
                          }}
                        />
                        <Button type="button" size="sm" onClick={() => {
                            const stockValue = parseInt(bulkStockInput);
                            if (!isNaN(stockValue) && stockValue >= 0) {
                                handleBulkStockUpdate(stockValue);
                            }
                        }} className="h-8" disabled={!bulkStockInput.trim() || isNaN(parseInt(bulkStockInput))}>
                            <Package className="h-4 w-4 mr-1" /> Apply
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Value Rows */}
                  <AnimatePresence initial={false}>
                      {visibleValues.map((value: OptionValue, valueIndex: number) => (
                          <OptionValueRow
                              key={value.id || valueIndex} // Use ID if available, otherwise index
                              option={option}
                              index={index}
                              optionIndex={index}
                              valueIndex={valueIndex}
                              optionName={option.name}
                              value={value}
                              setOptions={setOptions}
                              currencyCode={currencyCode}
                              convertCurrency={convertCurrency}
                          />
                      ))}
                  </AnimatePresence>

                  {/* Add New Value Button */}
                  <div className="p-4 border-t">
                      <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddValue}
                          className="w-full"
                          disabled={isSubmitting}
                      >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Value
                      </Button>
                  </div>
              </CardContent>
          </motion.div>
      )}
      </AnimatePresence>
    </Card>
  );
};
OptionSection.displayName = 'OptionSection';


// --- Main OptionsManager Component ---
export const OptionsManager = React.forwardRef(({ productId, productCurrency, displayCurrency, convertCurrency, isSubmitting, setIsSubmitting, onUpdate }: OptionsManagerProps, ref) => {
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newOptionName, setNewOptionName] = useState('');
  const { shopDetails } = useShop();
  const userId = shopDetails?.userId;

  // 1. Fetch Options and Values on mount/product change
  const fetchOptions = useCallback(async () => {
    if (!productId || !userId) return;
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('product_options')
      .select(`
        id,
        name,
        display_order,
        option_values (
          id,
          value,
          price_difference,
          inventory,
          is_active,
          is_default
        )
      `)
      .eq('product_id', productId)
      .order('display_order')
      .order('created_at', { foreignTable: 'option_values', ascending: true });

    if (error) {
      showError("Failed to load product options.");
      console.error("Error fetching product options:", error);
      setOptions([]);
    } else {
      const uiOptions = mapDbToUi(data || [], productCurrency, displayCurrency, convertCurrency);
      setOptions(uiOptions);
    }
    setIsLoading(false);
  }, [productId, userId, productCurrency, displayCurrency, convertCurrency]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // 2. Handle Persistence (Save)
  const handleSaveOptions = useCallback(async () => {
    if (!productId || !userId) return false;
    setIsSubmitting(true);

    try {
      const { optionsToUpsert, valuesToUpsert, optionsToDelete, valuesToDelete } = mapUiToDb(options, displayCurrency, convertCurrency, userId, productId);
      
      // --- Step 1: Delete marked records ---
      if (valuesToDelete.length > 0) {
        const { error } = await supabase.from('option_values').delete().in('id', valuesToDelete);
        if (error) throw new Error(`Failed to delete option values: ${error.message}`);
      }
      if (optionsToDelete.length > 0) {
        const { error } = await supabase.from('product_options').delete().in('id', optionsToDelete);
        if (error) throw new Error(`Failed to delete option groups: ${error.message}`);
      }

      // --- Step 2: Upsert Options (Groups) ---
      const { data: upsertedOptions, error: optionsError } = await supabase
        .from('product_options')
        .upsert(optionsToUpsert, { onConflict: 'id', defaultToInsert: true })
        .select('id, name');
      if (optionsError) throw new Error(`Failed to save options: ${optionsError.message}`);

      const optionIdMap = new Map((upsertedOptions || []).map(opt => [opt.name, opt.id]));

      // --- Step 3: Prepare Values for Upsert (linking new values to new option IDs) ---
      const finalValuesToUpsert = valuesToUpsert.map(val => {
        if (!val.option_id) {
          // Find the ID of the newly created parent option
          const parentOption = optionsToUpsert.find(opt => opt.name === options.find(o => o.values.includes(val))?.name);
          if (parentOption) {
            val.option_id = optionIdMap.get(parentOption.name);
          }
        }
        return val;
      });

      // --- Step 4: Upsert Values ---
      const { error: valuesError } = await supabase
        .from('option_values')
        .upsert(finalValuesToUpsert, { onConflict: 'id', defaultToInsert: true });
      if (valuesError) throw new Error(`Failed to save option values: ${valuesError.message}`);

      // showSuccess("Product options saved successfully!"); // Suppress success toast here, let parent handle it
      await fetchOptions(); // Re-fetch to get new IDs and clean state
      return true;
    } catch (err: any) {
      showError(`Failed to save options: ${err.message}`);
      console.error("Options Save Error:", err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [productId, userId, options, displayCurrency, convertCurrency, fetchOptions, onUpdate, setIsSubmitting]);

  // Expose save function to parent component (ProductEditMode)
  React.useImperativeHandle(ref, () => ({
    handleSaveOptions,
  }));

  const handleAddOption = () => {
    if (newOptionName.trim()) {
      setOptions(prev => [
        ...prev,
        {
          name: newOptionName.trim(),
          display_order: prev.length,
          values: [{ value: 'New Value', price_difference: 0, inventory: 10, is_active: true, is_default: true, is_new: true, isSelected: false }],
          is_new: true,
        }
      ]);
      setNewOptionName('');
    }
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>;
  }

  const setOptionsWrapper = (newOptions: ProductOption[]) => {
    // Filter out deleted options before setting state
    setOptions(newOptions.filter(opt => !opt.is_deleted));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-heading flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        Product Options (Variants)
      </h2>
      <p className="text-sm text-muted-foreground">
        Define customer-selectable options (e.g., Size, Color). Each option value can have a unique price adjustment and inventory level.
      </p>

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {options.map((option, index) => (
            <motion.div
              key={option.id || index}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.2 }}
            >
              <OptionSection
                option={option}
                index={index}
                removeOption={() => setOptions(prev => prev.map((opt, i) => i === index ? { ...opt, is_deleted: true } : opt))}
                setOptions={setOptions} // Pass the actual state setter
                currencyCode={displayCurrency}
                convertCurrency={convertCurrency}
                isSubmitting={isSubmitting}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Card className="p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Input
            placeholder="New Option Name (e.g., Material)"
            value={newOptionName}
            onChange={(e) => setNewOptionName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddOption();
              }
            }}
            className="flex-1"
            disabled={isSubmitting}
          />
          <Button type="button" onClick={handleAddOption} disabled={!newOptionName.trim() || isSubmitting}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Option
          </Button>
        </div>
      </Card>
    </div>
  );
});
OptionsManager.displayName = 'OptionsManager';