import { Control } from "react-hook-form";
import { ClothingDetailsForm, ServiceDetailsForm, ArtDetailsForm, ElectronicsDetailsForm, GenericDetailsForm } from "@/components/product-forms/DetailForms";

export interface ProductField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'tags';
}

export interface ProductType {
  value: string;
  label: string;
  fields: ProductField[];
  component: React.FC<{ control: Control<any> }>;
  hasSpecifications?: boolean;
}

export interface ProductCategory {
  value: string;
  label: string;
  types: ProductType[];
  hasSpecifications?: boolean;
}

export const productCategories: ProductCategory[] = [
  {
    value: "clothing",
    label: "Clothing & Apparel",
    hasSpecifications: false,
    types: [
      {
        value: "t-shirt",
        label: "T-Shirt",
        fields: [
          { name: "sizes", label: "Sizes", type: "tags" },
          { name: "material", label: "Material", type: "text" },
          { name: "colors", label: "Color Options", type: "tags" },
          { name: "reference_code", label: "SKU / Reference", type: "text" },
        ],
        component: ClothingDetailsForm,
        hasSpecifications: false,
      },
    ],
  },
  {
    value: "electronics",
    label: "Electronics",
    hasSpecifications: true,
    types: [
        {
            value: "smartphone",
            label: "Smartphone",
            fields: [
                { name: "model_number", label: "Model Number", type: "text" },
                { name: "processor", label: "Processor", type: "text" },
                { name: "ram", label: "RAM", type: "text" },
                { name: "storage", label: "Storage", type: "text" },
                { name: "screen_size", label: "Screen Size", type: "text" },
                { name: "camera", label: "Camera", type: "text" },
            ],
            component: ElectronicsDetailsForm,
            hasSpecifications: true,
        },
        {
            value: "laptop",
            label: "Laptop",
            fields: [
                { name: "model_number", label: "Model Number", type: "text" },
                { name: "processor", label: "Processor", type: "text" },
                { name: "ram", label: "RAM", type: "text" },
                { name: "storage", label: "Storage", type: "text" },
                { name: "screen_size", label: "Screen Size", type: "text" },
                { name: "graphics_card", label: "Graphics Card", type: "text" },
            ],
            component: ElectronicsDetailsForm,
            hasSpecifications: true,
        },
        {
            value: "headphones",
            label: "Headphones",
            fields: [
                { name: "model_number", label: "Model Number", type: "text" },
                { name: "connectivity", label: "Connectivity", type: "text" },
                { name: "battery_life", label: "Battery Life", type: "text" },
            ],
            component: ElectronicsDetailsForm,
            hasSpecifications: true,
        },
        {
            value: "generic-device",
            label: "Generic Device",
            fields: [
                { name: "model_number", label: "Model Number", type: "text" },
                { name: "processor", label: "Processor", type: "text" },
                { name: "ram", label: "RAM", type: "text" },
                { name: "storage", label: "Storage", type: "text" },
            ],
            component: ElectronicsDetailsForm,
            hasSpecifications: true,
        }
    ]
  },
  {
    value: "art",
    label: "Art & Collectibles",
    hasSpecifications: true,
    types: [
        {
            value: "print",
            label: "Print",
            fields: [
                { name: "dimensions", label: "Dimensions (e.g., 24x36in)", type: "text" },
                { name: "medium", label: "Medium", type: "text" },
                { name: "framed", label: "Framing Options", type: "text" },
            ],
            component: ArtDetailsForm,
            hasSpecifications: true,
        }
    ]
  },
  {
    value: "service",
    label: "Services",
    hasSpecifications: true,
    types: [
        {
            value: "consulting",
            label: "Consulting",
            fields: [
                { name: "duration", label: "Duration (e.g., 60 minutes)", type: "text" },
                { name: "format", label: "Format (e.g., Online, In-person)", type: "text" },
            ],
            component: ServiceDetailsForm,
            hasSpecifications: true,
        }
    ]
  },
  {
    value: "generic",
    label: "Generic Product",
    hasSpecifications: false,
    types: [
        {
            value: "generic",
            label: "Generic",
            fields: [],
            component: GenericDetailsForm,
            hasSpecifications: false,
        }
    ]
  }
];

export const getCategoryAndType = (categoryIdentifier?: string, typeIdentifier?: string) => {
    if (!categoryIdentifier) return { category: undefined, type: undefined };
    
    const category = productCategories.find(c => 
        c.value.toLowerCase() === categoryIdentifier.toLowerCase() || 
        c.label.toLowerCase() === categoryIdentifier.toLowerCase()
    );

    if (!category || !typeIdentifier) return { category, type: undefined };

    const type = category.types.find(t => 
        t.value.toLowerCase() === typeIdentifier.toLowerCase() ||
        t.label.toLowerCase() === typeIdentifier.toLowerCase()
    );

    return { category, type };
}