import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStorefront } from './StorefrontContext';
import { showSuccess } from '@/utils/toast';

export interface CartItem {
  uid: string; // stable identifier for a unique line (product + variant options)
  productId: string;
  name: string;
  price: number;
  originalPrice: number;
  currency: string;
  quantity: number;
  media_url: string;
  media_type: 'image' | 'video';
  isDiscounted: boolean;
  selectedOptions?: { [key: string]: string | string[] };
  variantKey?: string; // normalized key derived from selectedOptions
  pricing_type: 'one_time' | 'subscription';
  product_type: 'physical' | 'digital';
  billing_interval: 'month' | 'year' | null;
}

interface CartContextType {
  cartItems: CartItem[];
  savedItems: CartItem[];
  totalItems: number;
  subtotal: number;
  shipping: number;
  total: number;
  totalSaved: number;
  freeShippingThreshold: number;
  addToCart: (item: Omit<CartItem, 'quantity' | 'uid' | 'variantKey'>, quantity?: number) => Promise<void>;
  updateQuantity: (uid: string, quantity: number) => void;
  removeFromCart: (uid: string) => void;
  clearCart: () => void;
  saveForLater: (item: CartItem) => void;
  moveToCart: (uid: string) => void;
  removeSavedItem: (uid: string) => void;
  hasSubscriptionProducts: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const FREE_SHIPPING_THRESHOLD = 50; // Define free shipping threshold in USD

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [savedItems, setSavedItems] = useState<CartItem[]>([]);
  const { shopDetails, convertCurrency } = useStorefront();

  // Load cart from localStorage on mount and migrate legacy items to uid/variantKey
  useEffect(() => {
    const migrate = (it: Partial<CartItem> & Record<string, unknown>): CartItem => {
      const variantKey = it.selectedOptions && typeof it.selectedOptions === 'object'
        ? JSON.stringify(Object.entries(it.selectedOptions).sort(([a],[b]) => a.localeCompare(b)))
        : undefined;
      const uid = it.uid || `${it.productId}::${variantKey || 'base'}`;
      return { ...(it as CartItem), uid, variantKey } as CartItem;
    };
    try {
      const storedCart = localStorage.getItem('cartItems');
      if (storedCart) {
        const parsed = JSON.parse(storedCart);
        if (Array.isArray(parsed)) setCartItems(parsed.map(migrate));
      }
    } catch (e) { console.warn('CartContext: failed to load cartItems from storage', e); }
    try {
      const storedSaved = localStorage.getItem('savedItems');
      if (storedSaved) {
        const parsed = JSON.parse(storedSaved);
        if (Array.isArray(parsed)) setSavedItems(parsed.map(migrate));
      }
    } catch (e) { console.warn('CartContext: failed to load savedItems from storage', e); }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('savedItems', JSON.stringify(savedItems));
  }, [savedItems]);

  const addToCart = useCallback(async (item: Omit<CartItem, 'quantity' | 'uid' | 'variantKey'>, quantity: number = 1) => {
    // Optimistic: the item lands in the cart instantly with the data the card/
    // detail page already has. pricing_type / product_type / billing_interval
    // are refreshed from the DB in the background — a slow or failed fetch must
    // never block the add.
    const currency = shopDetails?.currency ?? item.currency;
    const variantKey = item.selectedOptions && typeof item.selectedOptions === 'object'
      ? JSON.stringify(Object.entries(item.selectedOptions).sort(([a],[b]) => a.localeCompare(b)))
      : undefined;
    const uid = `${item.productId}::${variantKey || 'base'}`;

    setCartItems(prevItems => {
      const existingIndex = prevItems.findIndex(ci => ci.productId === item.productId && ci.variantKey === variantKey);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
          price: item.price,
          originalPrice: item.originalPrice,
          isDiscounted: item.isDiscounted,
          currency,
        };
        setTimeout(() => showSuccess(`${item.name} quantity updated in cart!`), 0);
        return updated;
      }
      setTimeout(() => showSuccess(`${item.name} added to cart!`), 0);
      return [
        ...prevItems,
        {
          ...item,
          uid,
          variantKey,
          quantity,
          currency,
        },
      ];
    });

    // Background refresh of billing metadata (needed at checkout for
    // subscriptions). Failures are logged, never surfaced — the item is
    // already in the cart.
    supabase
      .from('products')
      .select('pricing_type, product_type, billing_interval')
      .eq('id', item.productId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { console.warn('Cart: metadata refresh failed', error); return; }
        setCartItems(prev => prev.map(ci => ci.uid === uid
          ? { ...ci, pricing_type: data.pricing_type, product_type: data.product_type, billing_interval: data.billing_interval }
          : ci));
      });
  }, [shopDetails]);

  const updateQuantity = useCallback((uid: string, quantity: number) => {
    setCartItems(prevItems => {
      const updatedItems = prevItems.map(item =>
        item.uid === uid ? { ...item, quantity: Math.max(1, quantity) } : item
      );
      return updatedItems.filter(item => item.quantity > 0);
    });
  }, []);

  const removeFromCart = useCallback((uid: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.uid !== uid));
    setTimeout(() => showSuccess("Item removed from cart."), 0);
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setTimeout(() => showSuccess("Cart cleared."), 0);
  }, []);

  const saveForLater = useCallback((item: CartItem) => {
    setCartItems(prevItems => prevItems.filter(cartItem => cartItem.uid !== item.uid));
    setSavedItems(prevItems => {
      if (!prevItems.some(savedItem => savedItem.uid === item.uid)) {
        setTimeout(() => showSuccess(`${item.name} saved for later.`), 0);
        return [...prevItems, item];
      }
      return prevItems;
    });
  }, []);

  const moveToCart = useCallback(async (uid: string) => {
    const itemToMove = savedItems.find(item => item.uid === uid);
    if (!itemToMove) return;
    // Only remove from "saved" once it's successfully in the cart, so a failed
    // add can't silently drop the item.
    await addToCart(itemToMove, itemToMove.quantity);
    setSavedItems(prev => prev.filter(item => item.uid !== uid));
    showSuccess(`${itemToMove.name} moved to cart.`);
  }, [savedItems, addToCart]);

  const removeSavedItem = useCallback((uid: string) => {
    setSavedItems(prevItems => prevItems.filter(item => item.uid !== uid));
    setTimeout(() => showSuccess("Saved item removed."), 0);
  }, []);

  const totalItems = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);

  const subtotal = useMemo(() => {
    if (!shopDetails) return 0;
    return cartItems.reduce((sum, item) => {
      const convertedPrice = convertCurrency(item.price, item.currency);
      return sum + (convertedPrice * item.quantity);
    }, 0);
  }, [cartItems, shopDetails, convertCurrency]);

  // Threshold for free shipping, in the shop's display currency. Exposed so the
  // cart can show a "spend X more for free shipping" nudge.
  const freeShippingThreshold = useMemo(
    () => (shopDetails ? convertCurrency(FREE_SHIPPING_THRESHOLD, 'USD') : 0),
    [shopDetails, convertCurrency]
  );

  const shipping = useMemo(() => {
    if (!shopDetails) return 0;
    return subtotal >= freeShippingThreshold ? 0 : convertCurrency(5, 'USD');
  }, [subtotal, shopDetails, convertCurrency, freeShippingThreshold]);

  const total = useMemo(() => subtotal + shipping, [subtotal, shipping]);

  const totalSaved = useMemo(() => {
    if (!shopDetails) return 0;
    return cartItems.reduce((sum, item) => {
      const convertedOriginalPrice = convertCurrency(item.originalPrice, item.currency);
      const convertedCurrentPrice = convertCurrency(item.price, item.currency);
      return sum + ((convertedOriginalPrice - convertedCurrentPrice) * item.quantity);
    }, 0);
  }, [cartItems, shopDetails, convertCurrency]);

  const hasSubscriptionProducts = useMemo(() => {
    return cartItems.some(item => item.pricing_type === 'subscription');
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        savedItems,
        totalItems,
        subtotal,
        shipping,
        total,
        totalSaved,
        freeShippingThreshold,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        saveForLater,
        moveToCart,
        removeSavedItem,
        hasSubscriptionProducts,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};