import { useEffect, useState, useCallback } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { TagInput } from "./TagInput";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { AnimatePresence, motion } from "framer-motion";
import { useShop } from "@/contexts/ShopContext";
import { CreatableCombobox } from "./CreatableCombobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { currencies } from "@/lib/currencies";
import { MediaItem } from "./MediaItem";
import { OptionManager } from "./product-detail/OptionManager"; // Import OptionManager

// Define types used by OptionManager locally
interface OptionValue {
  value: string;
  priceDifference: number; // Price difference relative to the base product price
}

interface Option {
  id: string;
  name: string;
  values: OptionValue[];
}

const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  currency: z.string().min(3, "Currency code is required").max(3),
  inventory: z.coerce.number().int().min(0, "Inventory must be a non-negative integer").optional(),
  tags: z.array(z.string()).optional(),
  pricing_type: z.enum(['one_time', 'subscription']),
  billing_interval: z.enum(['month', 'year']).optional().nullable(),
  details: z.any(),
}).refine(data => {
    if (data.pricing_type === 'subscription' && !data.billing_interval) {
        return false;
    }
    return true;
}, {
    message: "Interval is required for subscriptions.",
    path: ["billing_interval"],
});

type ProductFormData = z.infer<typeof productSchema>;

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  productData: any;
  post: any;
}

const toTitleCase = (str: string) => str.replace(/_/g, ' ').replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

const AttributeInput = ({ control, fieldName, inputType }: any) => {
  const name = `details.${fieldName}`;
  switch (inputType) {
    case 'number':
      return <Controller name={name} control={control} render={({ field }) => <Input type="number" {...field} value={field.value || ''} />} />;
    case 'tags':
      return <Controller name={name} control={control} render={({ field }) => <TagInput {...field} value={Array.isArray(field.value) ? field.value : (field.value ? [field.value] : [])} />} />;
    case 'color':
        return <Controller name={name} control={control} render={({ field }) => <Controller name={name} control={control} render={({ field }) => <Input type="color" {...field} value={field.value || '#000000'} className="h-10 w-16" />} />} />;
    default:
      return <Controller name={name} control={control} render={({ field }) => <Input {...field} value={field.value || ''} />} />;
  }
};

const OPTION_KEYS_TO_EXCLUDE = ['type', 'options', 'variants', 'color', 'size', 'material'];

export const CreateProductModal = ({ isOpen, onClose, onSave, productData, post }: CreateProductModalProps) => {
  const { shopDetails, convertCurrency } = useShop();
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [typeAttributes, setTypeAttributes] = useState<any[]>([]);
  const [productOptions, setProductOptions] = useState<Option[]>([]); // New state for options
  
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const pricingType = useWatch({ control, name: "pricing_type" });
  const categoryValue = useWatch({ control, name: "category" });
  const typeValue = useWatch({ control, name: "details.type" });
  const basePrice = useWatch({ control, name: "price" });

  // Helper to normalize AI options into the new additive options structure
  const normalizeAIOptions = useCallback((details: any): Option[] => {
    const options: Option[] = [];
    // The AI analysis result structure is flat: details.color.value = ['Red', 'Blue']
    if (details) {
      for (const [key, valueObj] of Object.entries(details as any)) {
        // Check if the key is a potential option key and its value is an array of strings
        if (key !== 'type' && Array.isArray(valueObj.value) && valueObj.value.length > 0 && valueObj.value.every((v: any) => typeof v === 'string')) {
          options.push({
            id: crypto.randomUUID(),
            name: toTitleCase(key),
            values: valueObj.value.map((v: string) => ({ value: v, priceDifference: 0 })),
          });
        }
      }
    }
    return options;
  }, []);

  useEffect(() => {
    console.log("CreateProductModal: Initializing form with productData:", productData, "post:", post, "shopDetails:", shopDetails);
    
    const aiSuggestedPrice = productData?.price?.value;
    const aiSuggestedCurrency = productData?.currency?.value;
    const aiSuggestedPricingType = productData?.pricing_type?.value || 'one_time';
    const aiSuggestedBillingInterval = productData?.billing_interval?.value || null;
    const aiSuggestedInventory = productData?.inventory?.value ?? 10;

    // Convert AI-suggested price (which might be in a different currency) to shop's display currency for form
    const priceInDisplayCurrency = shopDetails ? convertCurrency(aiSuggestedPrice, aiSuggestedCurrency, shopDetails.currency) : aiSuggestedPrice;

    // 1. Normalize AI options
    const initialOptions = normalizeAIOptions(productData?.details);
    setProductOptions(initialOptions);

    // 2. Separate specifications from options in AI data, filtering out all known option keys
    const specificationsOnly: { [key: string]: any } = {};
    if (productData?.details) {
        for (const [key, valueObj] of Object.entries(productData.details as any)) {
            // Filter out keys that are now handled by OptionManager or are obsolete variant structures
            if (key !== 'type' && !OPTION_KEYS_TO_EXCLUDE.includes(key) && !Array.isArray(valueObj.value)) {
                specificationsOnly[key] = valueObj.value;
            }
        }
    }

    reset({
      name: productData?.name?.value || "",
      description: productData?.description?.value || post?.caption || "",
      category: productData?.category?.value || "Generic Product",
      price: priceInDisplayCurrency || 0, // Use converted price for form
      currency: shopDetails?.currency || 'USD', // Always use shop's currency for the form's currency selector
      inventory: aiSuggestedInventory, // Base inventory (single source of truth)
      tags: productData?.tags?.value || [],
      pricing_type: aiSuggestedPricingType, // Use AI suggested pricing type
      billing_interval: aiSuggestedBillingInterval, // Use AI suggested billing interval
      details: {
        type: productData?.details?.type?.value || 'generic',
        ...specificationsOnly
      },
    });
  }, [productData, post, shopDetails, reset, convertCurrency, normalizeAIOptions]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('name');
      setCategoryOptions(data?.map(c => c.name) || []);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchTypesAndAttributes = async () => {
      if (!categoryValue) {
        setTypeOptions([]);
        setTypeAttributes([]);
        return;
      }
      const { data: categoryData } = await supabase.from('categories').select('id').eq('name', categoryValue).single();
      if (categoryData) {
        const { data: dbTypes } = await supabase.from('types').select('name, attributes').eq('category_id', categoryData.id);
        setTypeOptions(dbTypes?.map(t => t.name) || []);
        
        const selectedType = dbTypes?.find(t => t.name === typeValue);
        // Filter attributes to only include specifications (isOption: false)
        setTypeAttributes(selectedType?.attributes?.filter((attr: any) => !attr.isOption) || []);
      } else {
        setTypeOptions([]);
        setTypeAttributes([]);
      }
    };
    fetchTypesAndAttributes();
  }, [categoryValue, typeValue]);

  const handleOptionManagerUpdate = useCallback((options: Option[]) => {
    setProductOptions(options);
  }, []);

  const onSubmit = async (data: ProductFormData) => {
    console.log("CreateProductModal: Submitting form data:", data);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showError("You must be logged in."); return; }

    const { data: business } = await supabase.from('businesses').select('id').eq('user_id', user.id).single();
    if (!business) { showError("Could not find your business profile."); return; }

    let { data: categoryRecord } = await supabase.from('categories').select('id').eq('name', data.category).single();
    if (!categoryRecord) {
        const { data: newCat } = await supabase.from('categories').insert({ name: data.category, user_id: user.id }).select('id').single();
        categoryRecord = newCat;
    }

    // 1. Calculate lowest final price in display currency
    const minPriceAdjustment = productOptions.reduce((min, opt) => {
        if (opt.values.length === 0) return min;
        const minDiff = Math.min(...opt.values.map(v => v.priceDifference));
        return min + minDiff;
    }, 0);
    const lowestFinalPriceInDisplay = data.price + minPriceAdjustment;

    // 2. Convert lowest final price to ALL for storage
    const priceInALL = convertCurrency(lowestFinalPriceInDisplay, data.currency, 'ALL');
    
    // 3. Prepare details payload: merge specifications and new option data
    const cleanedDetails: { [key: string]: any } = { type: data.details.type };
    
    // Add specifications (non-option fields)
    Object.entries(data.details).forEach(([key, value]) => {
        if (key !== 'type') {
            cleanedDetails[key] = value;
        }
    });

    // Add options to details if they exist
    if (productOptions.length > 0) {
        cleanedDetails.options = productOptions;
    }
    
    // Ensure obsolete keys are removed before saving
    OPTION_KEYS_TO_EXCLUDE.forEach(key => delete cleanedDetails[key]);


    const { error } = await supabase.from('products').insert({
      business_id: business.id, name: data.name, caption: data.description, category: data.category,
      price: priceInALL, // Store lowest final price in ALL
      currency: 'ALL', // Store currency as ALL
      inventory: data.pricing_type === 'one_time' ? data.inventory : 0,
      tags: data.tags, details: cleanedDetails, pricing_type: data.pricing_type, status: 'Draft',
      billing_interval: data.pricing_type === 'subscription' ? data.billing_interval : null,
      instagram_post_id: post.id, media_url: post.media_url, thumbnail_url: post.thumbnail_url, media_type: post.media_type,
      product_type: 'physical', // Default product type
    });

    if (error) { showError(`Failed to create product: ${error.message}`); console.error("CreateProductModal: Error creating product:", error); } 
    else { showSuccess("Product created successfully!"); onSave(); onClose(); }
  };

  const specifications = typeAttributes;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create New Product from Post</DialogTitle>
          <DialogDescription>The AI has generated the following details. Review, edit, and save.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <Card className="overflow-hidden h-fit">
                <CardContent className="p-0">
                  <div className="w-full aspect-square bg-muted">
                    <MediaItem src={post.media_url} alt="Instagram Post" type={post.media_type} />
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-2"><Label>Product Name</Label><Input {...register("name")} />{errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}</div>
              <div className="space-y-2"><Label>Description</Label><Textarea {...register("description")} rows={4} /></div>
              <div className="space-y-2"><Label>Tags</Label><Controller name="tags" control={control} render={({ field }) => <TagInput {...field} placeholder="Add tag..." />} /></div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Category</Label><Controller name="category" control={control} render={({ field }) => (<CreatableCombobox options={categoryOptions} placeholder="Select or create..." {...field} />)} /></div>
                <div className="space-y-2"><Label>Type</Label><Controller name="details.type" control={control} render={({ field }) => (<CreatableCombobox options={typeOptions} placeholder="Select or create..." {...field} disabled={!categoryValue} />)} /></div>
              </div>
              <div className="space-y-2"><Label>Pricing Model</Label><Controller name="pricing_type" control={control} render={({ field }) => (<RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="one_time" id="one_time" /><Label htmlFor="one_time">One-time</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="subscription" id="subscription" /><Label htmlFor="subscription">Subscription</Label></div></RadioGroup>)} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2"><Label>Base Price</Label><div className="flex items-center gap-2"><Input id="price" type="number" step="0.01" {...register("price")} className="flex-1" /><Controller name="currency" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger className="w-28"><SelectValue placeholder="USD" /></SelectTrigger><SelectContent>{currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}</SelectContent></Select>)} /></div>{errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}{errors.currency && <p className="text-sm text-destructive mt-1">{errors.currency.message}</p>}</div>
                <AnimatePresence>{pricingType === 'one_time' && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="overflow-hidden"><div className="space-y-2"><Label>Inventory</Label><Input type="number" {...register("inventory")} />{errors.inventory && <p className="text-sm text-destructive mt-1">{errors.inventory.message}</p>}</div></motion.div>)}{pricingType === 'subscription' && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1"><Label className="text-xs">Interval</Label><Controller name="billing_interval" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value || undefined}><SelectTrigger className="w-full border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50"><SelectValue placeholder="Interval" /></SelectTrigger><SelectContent><SelectItem value="month">/ month</SelectItem><SelectItem value="year">/ year</SelectItem></SelectContent></Select>)} />{errors.billing_interval && <p className="text-sm text-destructive mt-1">{errors.billing_interval.message}</p>}</motion.div>)}</AnimatePresence>
              </div>
              
              {/* Option Manager */}
              <OptionManager
                initialOptions={productOptions}
                basePrice={basePrice}
                onUpdate={handleOptionManagerUpdate}
              />

              {/* Specifications (Fixed Details) */}
              <Card>
                <CardHeader><CardTitle className="text-base">Specifications (Fixed Details)</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {specifications.map((attr: any) => (
                    <div key={attr.name} className="space-y-2">
                      <Label className="capitalize">{attr.name.replace(/_/g, ' ')}</Label>
                      <AttributeInput control={control} fieldName={attr.name} inputType={attr.inputType} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
          <DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Product</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};