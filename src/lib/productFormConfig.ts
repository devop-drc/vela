import { ClothingDetailsForm, ElectronicsDetailsForm, ArtDetailsForm, ServiceDetailsForm } from "@/components/product-forms/DetailForms";

export const clothingMaterials = [
  "Cotton", "Polyester", "Linen", "Silk", "Wool", "Denim", "Spandex", "Nylon"
];

export const artMediums = [
  "Oil on Canvas", "Watercolor", "Acrylic", "Print", "Photograph", "Sculpture", "Digital"
];

export const detailFormMap: { [key: string]: React.FC<any> } = {
  't-shirt': ClothingDetailsForm,
  'shirt': ClothingDetailsForm,
  'clothing': ClothingDetailsForm,
  'apparel': ClothingDetailsForm,
  'generic-device': ElectronicsDetailsForm,
  'electronics': ElectronicsDetailsForm,
  'print': ArtDetailsForm,
  'art': ArtDetailsForm,
  'consulting': ServiceDetailsForm,
  'service': ServiceDetailsForm,
};