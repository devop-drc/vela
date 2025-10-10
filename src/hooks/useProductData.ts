import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/contexts/ShopContext";

export interface Product {
  id: string;
  name: string;
  status: 'Active' | 'Draft' | 'Out of Stock';
  price: number | null;
  currency: string | null;
  media_url: string;
  created_at: string;
  category: string;
  tags: string[];
  details: { [key: string]: any };
  pricing_type: 'one_time' | 'subscription'; // Added pricing_type
  billing_interval: 'month' | 'year' | null; // Added billing_interval
  product_type: 'physical' | 'digital'; // Added product_type
}

export interface DetailsAttribute {
  name: string;
  values: string[];
}

interface UseProductDataResult {
  allProducts: Product[];
  allCategories: string[];
  allTags: string[];
  allDetailsAttributes: DetailsAttribute[];
  maxPrice: number;
  isLoading: boolean;
}

export const useProductData = (): UseProductDataResult => {
  const { convertCurrency } = useShop();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allDetailsAttributes, setAllDetailsAttributes] = useState<DetailsAttribute[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProductsAndMetadata = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const [productsRes, categoriesRes, typesRes] = await Promise.all([
        supabase.from("products").select("id, name, status, price, currency, media_url, created_at, category, tags, details, pricing_type, billing_interval, product_type").eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from("categories").select("name").eq('user_id', user.id),
        supabase.from("types").select("name, attributes").eq('user_id', user.id),
      ]);

      if (productsRes.error) { console.error("Error fetching products:", productsRes.error); }
      else { setAllProducts(productsRes.data as Product[]); }

      if (categoriesRes.error) { console.error("Error fetching categories:", categoriesRes.error); }
      else { setAllCategories(categoriesRes.data?.map(c => c.name) || []); }

      if (typesRes.error) { console.error("Error fetching types:", typesRes.error); }
      else {
        const uniqueAttributes = new Map<string, Set<string>>();
        typesRes.data?.forEach(type => {
          (type.attributes as any[] || []).forEach(attr => {
            if (!uniqueAttributes.has(attr.name)) {
              uniqueAttributes.set(attr.name, new Set<string>());
            }
            if (attr.possibleValues && Array.isArray(attr.possibleValues)) {
              attr.possibleValues.forEach((val: string) => uniqueAttributes.get(attr.name)?.add(val));
            }
          });
        });
        setAllDetailsAttributes(Array.from(uniqueAttributes.entries()).map(([name, values]) => ({ name, values: Array.from(values).sort() })));
      }

      const uniqueTags = new Set<string>();
      productsRes.data?.forEach(p => p.tags?.forEach(tag => uniqueTags.add(tag)));
      setAllTags(Array.from(uniqueTags).sort());

      setIsLoading(false);
    };
    fetchProductsAndMetadata();
  }, []);

  const maxPrice = useMemo(() => {
    let currentMax = 0;
    allProducts.forEach(p => {
      if (p.price !== null) {
        const convertedPrice = convertCurrency(p.price, p.currency);
        if (convertedPrice > currentMax) {
          currentMax = convertedPrice;
        }
      }
    });
    return Math.ceil(currentMax / 10) * 10 || 100;
  }, [allProducts, convertCurrency]);

  return {
    allProducts,
    allCategories,
    allTags,
    allDetailsAttributes,
    maxPrice,
    isLoading,
  };
};