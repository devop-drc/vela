import React, { useState, useMemo } from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2, Edit, CheckCircle, XCircle, DollarSign, Package, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShop } from '@/contexts/ShopContext';
import { formatCurrency } from '@/lib/formatters';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';

interface OptionValue {
  value: string;
  price_difference: number;
  inventory: number;
  is_active: boolean;
}

interface ProductOption {
  name: string;
  values: OptionValue[];
}

export const OptionsManager = () => {
  const { control, watch, setValue, getValues, formState: { errors } } = useFormContext();
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
        values: [{ value: 'Default', price_difference: 0, inventory: 10, is_active: true }],
      });
      setNewOptionName('');
    }
  };

  const OptionValueRow = ({ optionIndex, valueIndex, optionName }: { optionIndex: number, valueIndex: number, optionName: string }) => {
    const fieldName = `details.options_v2.${optionIndex}.values.${valueIndex}`;
    const priceDiff = watch(`${fieldName}.price_difference`);

    const { fields: valuesFields, append: appendValue, remove: removeValue } = useFieldArray({
      control,
      name: `details.options_v2.${optionIndex}.values`,
    });

    const displayPriceDiff = useMemo(() => {
      const convertedDiff = convertCurrency(priceDiff, 'ALL', currencyCode);
      return formatCurrency(convertedDiff, currencyCode, 'en-US', true);
    }, [priceDiff, currencyCode, convertCurrency]);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -50 }}
        className="grid grid-cols-12 gap-2 items-center p-2 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
      >
        {/* Value Name */}
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

        {/* Price Difference */}
        <div className="col-span-3 flex items-center gap-1">
          <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                className="h-8 text-sm text-right"
                value={field.value === 0 ? '0' : field.value}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
              />
            )}
          />
          <span className="text-xs text-muted-foreground ml-1">{currencyCode}</span>
        </div>

        {/* Inventory */}
        <div className="col-span-3 flex items-center gap-1">
          <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                className="h-8 text-sm text-right"
                value={field.value === 0 ? '0' : field.value}
                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
              />
            )}
          />
        </div>

        {/* Active Toggle & Actions */}
        <div className="col-span-3 flex items-center justify-end gap-1">
          <Controller
            name={`${fieldName}.is_active`}
            control={control}
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                className="h-5 w-9"
                thumbClassName="h-4 w-4"
              />
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeValue(valueIndex)}
            disabled={valuesFields.length === 1}
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    );
  };

  const OptionSection = ({ option, index }: { option: ProductOption, index: number }) => {
    const { fields: valuesFields, append: appendValue, remove: removeValue } = useFieldArray({
      control,
      name: `details.options_v2.${index}.values`,
    });
    
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
      <Card className="shadow-md">
        <CardHeader className="p-4 border-b flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <Controller
              name={`details.options_v2.${index}.name`}
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Option Name (e.g., Color)"
                  className="h-8 text-lg font-semibold border-none shadow-none focus-visible:ring-0 p-0"
                />
              )}
            />
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(prev => !prev)}>
                {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </Button>
            <Button variant="destructive" size="icon" onClick={() => removeOption(index)}>
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
                        <div className="col-span-3">Value</div>
                        <div className="col-span-3 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Price Diff</div>
                        <div className="col-span-3 flex items-center gap-1"><Package className="h-3 w-3" /> Inventory</div>
                        <div className="col-span-3 text-right">Active / Delete</div>
                    </div>

                    {/* Value Rows */}
                    <AnimatePresence initial={false}>
                        {valuesFields.map((field, valueIndex) => (
                            <OptionValueRow
                                key={field.id}
                                optionIndex={index}
                                valueIndex={valueIndex}
                                optionName={option.name}
                            />
                        ))}
                    </AnimatePresence>

                    {/* Add New Value Button */}
                    <div className="p-2 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => appendValue({ value: '', price_difference: 0, inventory: 0, is_active: true })}
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
              <OptionSection option={field as ProductOption} index={index} />
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