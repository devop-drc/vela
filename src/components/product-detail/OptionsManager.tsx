import React, { useState, useMemo, useCallback } from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Banknote, Package, Settings, ChevronDown, ChevronUp, CheckCircle, XCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShop } from '@/contexts/ShopContext';
import { formatCurrency } from '@/lib/formatters';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface OptionValue {
  value: string;
  price_difference: number;
  inventory: number;
  is_active: boolean;
  is_default: boolean;
  isSelected?: boolean; // Temporary field for bulk actions
}

interface ProductOption {
  name: string;
  values: OptionValue[];
}

const statusOptions = [
  { value: 'Active', label: 'Active', icon: CheckCircle, isActive: true, inventory: 10, color: "text-emerald-600" },
  { value: 'Draft', label: 'Draft', icon: Eye, isActive: false, inventory: 10, color: "text-amber-600" },
  { value: 'Out of Stock', label: 'Out of Stock', icon: Package, isActive: true, inventory: 0, color: "text-slate-600" },
];

// --- OptionValueRow Component ---
const OptionValueRow = ({ optionIndex, valueIndex, optionName, control, currencyCode, convertCurrency, valuesFields, removeValue, setValue, watch, getValues, trigger }: any) => {
  const fieldName = `details.options_v2.${optionIndex}.values.${valueIndex}`;
  
  const priceDiff = watch(`${fieldName}.price_difference`);
  const isDefault = watch(`${fieldName}.is_default`);
  const isSelected = watch(`${fieldName}.isSelected`);
  const isActive = watch(`${fieldName}.is_active`);
  const inventory = watch(`${fieldName}.inventory`);

  const displayPriceDiff = useMemo(() => {
    const convertedDiff = convertCurrency(priceDiff, 'ALL', currencyCode);
    return formatCurrency(convertedDiff, currencyCode, 'en-US', true);
  }, [priceDiff, currencyCode, convertCurrency]);

  const handleSetDefault = useCallback(() => {
    if (isDefault) return;

    const currentValues = getValues(`details.options_v2.${optionIndex}.values`);
    currentValues.forEach((val: OptionValue, index: number) => {
      if (val.is_default && index !== valueIndex) {
        setValue(`details.options_v2.${optionIndex}.values.${index}.is_default`, false, { shouldDirty: true });
      }
    });
    setValue(`${fieldName}.is_default`, true, { shouldDirty: true });
    trigger(`details.options_v2.${optionIndex}.values`);
  }, [isDefault, getValues, setValue, optionIndex, valueIndex, fieldName, trigger]);

  const handleToggleSelect = useCallback((checked: boolean) => {
    setValue(`${fieldName}.isSelected`, checked);
    trigger(`details.options_v2.${optionIndex}.values`);
  }, [fieldName, setValue, optionIndex, trigger]);

  const handleStatusChange = useCallback((statusValue: string) => {
    const status = statusOptions.find(s => s.value === statusValue);
    if (status) {
      setValue(`${fieldName}.is_active`, status.isActive, { shouldDirty: true });
      setValue(`${fieldName}.inventory`, status.inventory, { shouldDirty: true });
    }
  }, [fieldName, setValue]);

  const currentStatus = useMemo(() => {
    if (!isActive) return statusOptions.find(s => s.value === 'Draft')!;
    if (inventory <= 0) return statusOptions.find(s => s.value === 'Out of Stock')!;
    return statusOptions.find(s => s.value === 'Active')!;
  }, [isActive, inventory]);

  return (
    <div
      className="grid grid-cols-12 gap-2 items-center p-2 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
    >
      {/* Bulk Select Checkbox (Col 1) */}
      <div className="col-span-1 flex justify-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleToggleSelect}
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
            isDefault ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-muted-foreground/50 hover:bg-primary/10 hover:text-primary"
          )}
          onClick={handleSetDefault}
          title={isDefault ? "Default" : "Click to set as default"}
        >
          {isDefault ? 'Default' : 'Set'}
        </Badge>
      </div>

      {/* Value Name (Col 3-5) */}
      <div className="col-span-3">
        <Controller
          name={`${fieldName}.value`}
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              placeholder={`${optionName} value`}
              className="h-8 text-sm"
            />
          )}
        />
      </div>

      {/* Price Difference (Col 6-8) */}
      <div className="col-span-3 flex items-center">
        <div className="relative w-full">
          <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Controller
            name={`${fieldName}.price_difference`}
            control={control}
            rules={{ required: true, min: -1000000 }}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                step="0.01"
                placeholder="0.00"
                className="h-8 text-sm text-right pl-9 pr-14"
                value={field.value === 0 ? '0' : field.value}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
              />
            )}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currencyCode}</span>
        </div>
      </div>

      {/* Inventory (Col 9-11) */}
      <div className="col-span-3 flex items-center">
        <div className="relative w-full">
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Controller
            name={`${fieldName}.inventory`}
            control={control}
            rules={{ required: true, min: 0 }}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                step="1"
                placeholder="0"
                className="h-8 text-sm text-right pl-9"
                value={field.value === 0 ? '0' : field.value}
                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
              />
            )}
          />
        </div>
      </div>

      {/* Status Dropdown (Col 12) */}
      <div className="col-span-1 flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8", currentStatus.color)} title={currentStatus.label}>
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

      {/* Delete (Col 12) */}
      <div className="col-span-1 flex items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => removeValue(valueIndex)}
          disabled={valuesFields.length === 1}
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
const OptionSection = ({ option, index, removeOption, control, watch, setValue, getValues, currencyCode, convertCurrency, trigger }: any) => {
  const { fields: valuesFields, append: appendValue, remove: removeValue } = useFieldArray({
    control,
    name: `details.options_v2.${index}.values`,
  });
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [bulkStockInput, setBulkStockInput] = useState('');

  // Watch all 'isSelected' fields to determine bulk selection state
  const allValues = watch(`details.options_v2.${index}.values`);

  const selectedCount = useMemo(() => {
    return (Array.isArray(allValues) ? allValues : []).filter((val: OptionValue) => val.isSelected).length;
  }, [allValues]);

  const isAllSelected = useMemo(() => {
    return valuesFields.length > 0 && selectedCount === valuesFields.length;
  }, [valuesFields.length, selectedCount]);

  const handleToggleBulkSelectAll = () => {
    const newState = !isAllSelected;
    valuesFields.forEach((_, valueIndex) => {
      setValue(`details.options_v2.${index}.values.${valueIndex}.isSelected`, newState);
    });
    trigger(`details.options_v2.${index}.values`);
  };

  const handleBulkAction = (action: 'activate' | 'deactivate' | 'delete' | 'add_stock') => {
    const selectedIndices: number[] = [];
    valuesFields.forEach((_, valueIndex) => {
      if (watch(`details.options_v2.${index}.values.${valueIndex}.isSelected`)) {
        selectedIndices.push(valueIndex);
      }
    });

    if (selectedIndices.length === 0) return;

    if (action === 'delete') {
      // Delete in reverse order to maintain correct indices
      selectedIndices.sort((a, b) => b - a).forEach(idx => removeValue(idx));
    } else if (action === 'activate' || action === 'deactivate') {
      const isActive = action === 'activate';
      selectedIndices.forEach(idx => {
        setValue(`details.options_v2.${index}.values.${idx}.is_active`, isActive, { shouldDirty: true });
        // If activating, ensure stock is > 0 (default to 10 if currently 0)
        if (isActive && watch(`details.options_v2.${index}.values.${idx}.inventory`) === 0) {
            setValue(`details.options_v2.${index}.values.${idx}.inventory`, 10, { shouldDirty: true });
        }
        setValue(`details.options_v2.${index}.values.${idx}.isSelected`, false);
      });
    }
    trigger(`details.options_v2.${index}.values`);
  };

  const handleBulkStockUpdate = (stockValue: number) => {
    valuesFields.forEach((_, valueIndex) => {
      if (watch(`details.options_v2.${index}.values.${valueIndex}.isSelected`)) {
        setValue(`details.options_v2.${index}.values.${valueIndex}.inventory`, stockValue, { shouldDirty: true });
        if (stockValue > 0) {
            setValue(`details.options_v2.${index}.values.${valueIndex}.is_active`, true, { shouldDirty: true });
        }
      }
    });
    trigger(`details.options_v2.${index}.values`);
    setBulkStockInput('');
  };

  return (
    <Card className="shadow-lg border-2 border-transparent focus-within:border-primary/50 transition-all">
      <CardHeader className="p-4 border-b flex-row items-center justify-between bg-muted/50 rounded-t-lg">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <Controller
            name={`details.options_v2.${index}.name`}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Option Name (e.g., Color)"
                className="h-8 text-lg font-semibold border-none shadow-none focus-visible:ring-0 p-0 bg-transparent"
              />
            )}
          />
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={() => setIsCollapsed(prev => !prev)} title={isCollapsed ? "Expand" : "Collapse"}>
              {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </Button>
          <Button type="button" variant="destructive" size="icon" onClick={() => removeOption(index)} title="Delete Option Group">
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
                  <div className="grid grid-cols-12 gap-2 items-center p-2 bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                      <div className="col-span-1 flex justify-center">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleToggleBulkSelectAll}
                          className="h-4 w-4"
                        />
                      </div>
                      <div className="col-span-1">Default</div>
                      <div className="col-span-3">Value</div>
                      <div className="col-span-3 flex items-center gap-1"><Banknote className="h-3 w-3" /> Price Diff</div>
                      <div className="col-span-3 flex items-center gap-1"><Package className="h-3 w-3" /> Inventory</div>
                      <div className="col-span-1 text-right">Status</div>
                      <div className="col-span-1 text-right"></div>
                  </div>

                  {/* Bulk Actions Toolbar */}
                  {selectedCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-2 bg-accent/50 border-b overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-2"
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
                      {valuesFields.map((field, valueIndex) => (
                          <OptionValueRow
                              key={field.id}
                              option={option}
                              index={index}
                              optionIndex={index}
                              valueIndex={valueIndex}
                              optionName={option.name}
                              control={control}
                              currencyCode={currencyCode}
                              convertCurrency={convertCurrency}
                              valuesFields={valuesFields}
                              removeValue={removeValue}
                              setValue={setValue}
                              watch={watch}
                              getValues={getValues}
                              trigger={trigger}
                          />
                      ))}
                  </AnimatePresence>

                  {/* Add New Value Button */}
                  <div className="p-2 border-t">
                      <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendValue({ value: 'New Value', price_difference: 0, inventory: 10, is_active: true, is_default: false, isSelected: false })}
                          className="w-full"
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
export const OptionsManager = () => {
  const { control, watch, setValue, getValues, formState: { errors }, trigger } = useFormContext();
  const { shopDetails, convertCurrency } = useShop();
  const currencyCode = shopDetails?.currency || 'USD';

  const { fields: optionsFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: "details.options_v2",
  });

  const [newOptionName, setNewOptionName] = useState('');

  const handleAddOption = () => {
    if (newOptionName.trim()) {
      appendOption({
        name: newOptionName.trim(),
        values: [{ value: 'Default', price_difference: 0, inventory: 10, is_active: true, is_default: true, isSelected: false }],
      });
      setNewOptionName('');
    }
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
          {optionsFields.map((field, index) => (
            <motion.div
              key={field.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.2 }}
            >
              <OptionSection
                option={field as ProductOption}
                index={index}
                removeOption={removeOption}
                control={control}
                watch={watch}
                setValue={setValue}
                getValues={getValues}
                currencyCode={currencyCode}
                convertCurrency={convertCurrency}
                trigger={trigger}
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
          />
          <Button type="button" onClick={handleAddOption} disabled={!newOptionName.trim()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Option
          </Button>
        </div>
      </Card>
    </div>
  );
};