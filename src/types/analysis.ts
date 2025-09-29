export interface Attribute {
  name: string;
  value: string | string[];
  isOption: boolean;
}

export interface AnalysisResult {
  isProductPost: boolean;
  productName?: string;
  categoryName?: string;
  typeName?: string;
  price?: string | number;
  currency?: string;
  attributes?: Attribute[];
}
