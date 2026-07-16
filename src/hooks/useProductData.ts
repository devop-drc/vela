import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/contexts/ShopContext";
import { useAuth } from "@/contexts/AuthContext";
import { readCache, writeCache } from "@/lib/pageCache";

const PRODUCTS_CACHE_KEY = "products";
interface ProductsSnapshot {
  userId: string;
  products: Product[];
  categories: string[];
  tags: string[];
  attributes: DetailsAttribute[];
}

export interface Product {
  id: string;
  name: string;
  status: 'Active' | 'Draft' | 'Out of Stock';
  price: number | null;
  currency: string | null;
  inventory: number;
  media_url: string;
  media_gallery: string[] | null;
  media_type?: string | null;
  thumbnail_url?: string | null;
  created_at: string;
  category: string;
  tags: string[];
  details: { [key: string]: any };
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  product_type: 'physical' | 'digital';
  /** Reference code (auto-generated "P-XXXXXXXX" by DB trigger). */
  sku?: string | null;
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
  /** True when the last products fetch failed (distinct from an empty catalog). */
  error: boolean;
  refetch: (showLoading?: boolean) => Promise<void>;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
}

interface UseProductDataOptions {
  /**
   * Fired (debounced) after a realtime products INSERT/DELETE burst. Lets the
   * page piggyback on this hook's single products subscription instead of
   * opening a second, duplicate channel just to refresh derived state.
   */
  onProductsMutated?: () => void;
}

export const useProductData = (opts?: UseProductDataOptions): UseProductDataResult => {
  const { convertCurrency } = useShop();
  // The user id comes from the shared AuthProvider (resolved once at app start)
  // instead of each hook re-calling getSession() — removes the startup waterfall.
  const { userId } = useAuth();
  const userIdRef = useRef<string | null>(userId);
  userIdRef.current = userId;
  // Keep the latest mutation callback in a ref so the realtime handler (bound
  // once) always calls the current version without re-subscribing.
  const onMutatedRef = useRef(opts?.onProductsMutated);
  onMutatedRef.current = opts?.onProductsMutated;
  // Seed from the last cached snapshot so returning to the page renders
  // instantly; the effect below still revalidates in the background.
  const [cached] = useState(() => readCache<ProductsSnapshot>(PRODUCTS_CACHE_KEY));
  const [allProducts, setAllProducts] = useState<Product[]>(cached?.products ?? []);
  const [allCategories, setAllCategories] = useState<string[]>(cached?.categories ?? []);
  const [allTags, setAllTags] = useState<string[]>(cached?.tags ?? []);
  const [allDetailsAttributes, setAllDetailsAttributes] = useState<DetailsAttribute[]>(cached?.attributes ?? []);
  // No spinner when we already have something to show.
  const [isLoading, setIsLoading] = useState(!cached);
  // Distinguishes a failed fetch from a genuinely empty catalog so the page can
  // show a retry state instead of the onboarding empty state.
  const [error, setError] = useState(false);

  const fetchProductsAndMetadata = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    const uid = userIdRef.current;
    if (!uid) {
      setIsLoading(false);
      return;
    }

    const [productsRes, categoriesRes, typesRes] = await Promise.all([
      // Include gallery and media metadata so editors can show all images.
      // `updated_at` (migration 20260703160000) busts the variant-stock cache.
      // `*` keeps this tolerant of column additions (e.g. `sku` lands via the
      // add_reference_codes.sql migration) — an explicit list 500s until the
      // migration has run.
      supabase.from("products").select("*").eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from("categories").select("name").eq('user_id', uid),
      supabase.from("types").select("name, attributes").eq('user_id', uid),
    ]);

    let nextProducts = allProducts;
    let nextCategories = allCategories;
    let nextTags = allTags;
    let nextAttributes = allDetailsAttributes;

    if (productsRes.error) {
      console.error("useProductData: Error fetching products:", productsRes.error);
      setError(true);
    } else {
      setError(false);
      nextProducts = productsRes.data as Product[];
      setAllProducts(nextProducts);
    }

    if (categoriesRes.error) { console.error("useProductData: Error fetching categories:", categoriesRes.error); }
    else { nextCategories = categoriesRes.data?.map(c => c.name) || []; setAllCategories(nextCategories); }

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
      nextAttributes = Array.from(uniqueAttributes.entries()).map(([name, values]) => ({ name, values: Array.from(values).sort() }));
      setAllDetailsAttributes(nextAttributes);
    }

    if (!productsRes.error) {
      const uniqueTags = new Set<string>();
      (productsRes.data as Product[])?.forEach(p => p.tags?.forEach(tag => uniqueTags.add(tag)));
      nextTags = Array.from(uniqueTags).sort();
      setAllTags(nextTags);
    }

    // Persist a fresh snapshot for instant display next time (only when the
    // core products query succeeded, so we never cache a partial/failed load).
    if (!productsRes.error) {
      writeCache<ProductsSnapshot>(PRODUCTS_CACHE_KEY, {
        userId: uid, products: nextProducts, categories: nextCategories,
        tags: nextTags, attributes: nextAttributes,
      });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    let channel: any;
    let metadataRefetchTimer: ReturnType<typeof setTimeout> | undefined;

    const setupRealtime = async () => {
        // 1. Initial fetch — show the spinner only when we have nothing cached
        //    to display; otherwise revalidate silently behind the seeded data.
        await fetchProductsAndMetadata(!cached);

        // 2. Setup Realtime Listener
        channel = supabase
            .channel(`products_channel_${userId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'products', filter: `user_id=eq.${userId}` },
                (payload) => {
                    const newProduct = payload.new as Product;
                    
                    setAllProducts(prevProducts => {
                        if (payload.eventType === 'INSERT') {
                            // Guard against duplicates (the initial fetch may already include it).
                            if (prevProducts.some(p => p.id === newProduct.id)) return prevProducts;
                            return [newProduct, ...prevProducts];
                        } else if (payload.eventType === 'UPDATE') {
                            return prevProducts.map(p => p.id === newProduct.id ? { ...p, ...newProduct } : p);
                        } else if (payload.eventType === 'DELETE') {
                            return prevProducts.filter(p => p.id !== payload.old.id);
                        }
                        return prevProducts;
                    });

                    // Only re-fetch full metadata on INSERT/DELETE (new categories/tags).
                    // UPDATE events are handled inline above — no full refetch needed.
                    // Debounced: a sync inserts products in bursts, and refetching the
                    // whole set once per row multiplied the read load for nothing —
                    // one trailing refetch covers the entire burst.
                    if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
                        if (metadataRefetchTimer) clearTimeout(metadataRefetchTimer);
                        metadataRefetchTimer = setTimeout(() => {
                            fetchProductsAndMetadata();
                            // One debounce covers both metadata + any page-level
                            // derived refresh (e.g. sync-status), so a single
                            // products channel serves the whole page.
                            onMutatedRef.current?.();
                        }, 2500);
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
        if (metadataRefetchTimer) clearTimeout(metadataRefetchTimer);
    };
    // Re-run when the resolved user changes (login/logout); userIdRef keeps the
    // fetch/realtime callbacks pointed at the current user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    setAllProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updates } : p));
  };

  return {
    allProducts,
    allCategories,
    allTags,
    allDetailsAttributes,
    maxPrice,
    isLoading,
    error,
    refetch: fetchProductsAndMetadata,
    updateProduct,
  };
};