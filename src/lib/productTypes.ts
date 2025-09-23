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
}

export interface ProductCategory {
  value: string;
  label: string;
  types: ProductType[];
}

export const productCategories: ProductCategory[] = [
  {
    value: "clothing",
    label: "Clothing & Apparel",
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
      },
    ],
  },
  {
    value: "electronics",
    label: "Electronics",
    types: [
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
        }
    ]
  },
  {
    value: "art",
    label: "Art & Collectibles",
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
        }
    ]
  },
  {
    value: "service",
    label: "Services",
    types: [
        {
            value: "consulting",
            label: "Consulting",
            fields: [
                { name: "duration", label: "Duration (e.g., 60 minutes)", type: "text" },
                { name: "format", label: "Format (e.g., Online, In-person)", type: "text" },
            ],
            component: ServiceDetailsForm,
        }
    ]
  },
  {
    value: "generic",
    label: "Generic Product",
    types: [
        {
            value: "generic",
            label: "Generic",
            fields: [],
            component: GenericDetailsForm,
        }
    ]
  }
];

export const getCategoryAndType = (categoryValue?: string, typeValue?: string) => {
    const category = productCategories.find(c => c.value === categoryValue);
    const type = category?.types.find(t => t.value === typeValue);
    return { category, type };
}