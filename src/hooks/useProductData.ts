import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/contexts/ShopContext";

export interface Product {
  id: string;
  name: string;
  status: 'Active' | 'Draft' | 'Out of Stock';
  price: number | null;
  currency: string | null;
  inventory: number;
  media_url: string;
  created_at: string;
  category: string;
  tags: string[];
  details: { [key: string]: any };
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  product_type: 'physical' | 'digital';
  caption: string;
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

  const fetchProductsAndMetadata = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("useProductData: No user found, skipping fetch.");
      setIsLoading(false);
      return;
    }
    console.log("useProductData: Fetching products for user ID:", user.id);

    const [productsRes, categoriesRes, typesRes] = await Promise.all([
      // ADDED caption to the select list
      supabase.from("products").select("id, name, status, price, currency, inventory, media_url, created_at, category, tags, details, pricing_type, billing_interval, product_type, caption").eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from("categories").select("name").eq('user_id', user.id),
      supabase.from("types").select("name, attributes").eq('user_id', user.id),
    ]);

    if (productsRes.error) { 
      console.error("useProductData: Error fetching products:", productsRes.error); 
    } else { 
      console.log("useProductData: Fetched products data:", productsRes.data);
      setAllProducts(productsRes.data as Product[]); 
    }

    if (categoriesRes.error) { console.error("useProductData: Error fetching categories:", categoriesRes.error); }
    else { setAllCategories(categoriesRes.data?.map(c => c.name) || []); }

    if (typesRes.error) { console.error("useProductData: Error fetching types:", typesRes.error); }
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

  useEffect(() => {
    let channel: any;
    
    const setupRealtime = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Initial fetch
        await fetchProductsAndMetadata();

        // 2. Setup Realtime Listener
        channel = supabase
            .channel(`products_channel_${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'products', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    const newProduct = payload.new as Product;
                    
                    setAllProducts(prevProducts => {
                        if (payload.eventType === 'INSERT') {
                            // Add new product to the start
                            return [newProduct, ...prevProducts];
                        } else if (payload.eventType === 'UPDATE') {
                            // Replace updated product
                            return prevProducts.map(p => p.id === newProduct.id ? newProduct : p);
                        } else if (payload.eventType === 'DELETE') {
                            // Remove deleted product
                            return prevProducts.filter(p => p.id !== payload.old.id);
                        }
                        return prevProducts;
                    });
                    
                    // Re-fetch metadata (categories, tags, attributes) on any change, especially INSERT/DELETE
                    if (payload.eventType !== 'UPDATE' || payload.new.category !== payload.old.category || payload.new.tags !== payload.old.tags) {
                        // Debounce this if performance becomes an issue, but for now, immediate update is safer.
                        fetchProductsAndMetadata();
                    }
                }
            )
            .subscribe();
    };

    setupRealtime();

    return () => {
        if (channel) {
            supabase.removeChannel(channel);
        }
    };
  }, []); // Empty dependency array ensures setup runs once per component lifecycle

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