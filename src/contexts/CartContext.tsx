import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStorefront } from './StorefrontContext';
import { showError, showSuccess } from '@/utils/toast';

export interface CartItem {
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
  pricing_type: 'one_time' | 'subscription'; // Added pricing_type
  product_type: 'physical' | 'digital'; // Added product_type
  billing_interval: 'month' | 'year' | null; // Added billing_interval
}

interface CartContextType {
  cartItems: CartItem[];
  savedItems: CartItem[];
  totalItems: number;
  subtotal: number;
  shipping: number;
  total: number;
  totalSaved: number;
  addToCart: (item: Omit<CartItem, 'quantity' | 'isDiscounted'>, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  saveForLater: (item: CartItem) => void;
  moveToCart: (productId: string) => void;
  removeSavedItem: (productId: string) => void;
  hasSubscriptionProducts: boolean; // New flag
  hasDigitalSubscriptionProducts: boolean; // New flag
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [savedItems, setSavedItems] = useState<CartItem[]>([]);
  const { shopDetails, convertCurrency } = useStorefront();

  // Load cart from localStorage on mount
  useEffect(() => {
    const storedCart = localStorage.getItem('cartItems');
    if (storedCart) {
      setCartItems(JSON.parse(storedCart));
    }
    const storedSaved = localStorage.getItem('savedItems');
    if (storedSaved) {
      setSavedItems(JSON.parse(storedSaved));
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('savedItems', JSON.stringify(savedItems));
  }, [savedItems]);

  const addToCart = useCallback(async (item: Omit<CartItem, 'quantity' | 'isDiscounted'>, quantity: number = 1) => {
    if (!shopDetails) {
      showError("Shop details not loaded. Cannot add to cart.");
      return;
    }

    // Fetch product details to ensure we have the latest pricing_type and product_type
    const { data: productData, error } = await supabase
      .from('products')
      .select('price, currency, pricing_type, product_type, billing_interval')
      .eq('id', item.productId)
      .single();

    if (error || !productData) {
      showError("Failed to fetch product details for cart.");
      console.error("Error fetching product for cart:", error);
      return;
    }

    const currentPrice = productData.price;
    const originalPrice = item.originalPrice || currentPrice; // Use originalPrice if provided, otherwise currentPrice
    const isDiscounted = currentPrice < originalPrice;

    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(cartItem => cartItem.productId === item.productId);

      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
          price: currentPrice, // Update price to latest from DB
          originalPrice: originalPrice,
          isDiscounted: isDiscounted,
          pricing_type: productData.pricing_type,
          product_type: productData.product_type,
          billing_interval: productData.billing_interval,
        };
        showSuccess(`${item.name} quantity updated in cart!`);
        return updatedItems;
      } else {
        showSuccess(`${item.name} added to cart!`);
        return [
          ...prevItems,
          {
            ...item,
            quantity,
            price: currentPrice, // Use latest price from DB
            originalPrice: originalPrice,
            isDiscounted: isDiscounted,
            pricing_type: productData.pricing_type,
            product_type: productData.product_type,
            billing_interval: productData.billing_interval,
          },
        ];
      }
    });
  }, [shopDetails]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCartItems(prevItems => {
      const updatedItems = prevItems.map(item =>
        item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item
      );
      return updatedItems.filter(item => item.quantity > 0);
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.productId !== productId));
    showSuccess("Item removed from cart.");
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    showSuccess("Cart cleared.");
  }, []);

  const saveForLater = useCallback((item: CartItem) => {
    setCartItems(prevItems => prevItems.filter(cartItem => cartItem.productId !== item.productId));
    setSavedItems(prevItems => {
      if (!prevItems.some(savedItem => savedItem.productId === item.productId)) {
        showSuccess(`${item.name} saved for later.`);
        return [...prevItems, item];
      }
      return prevItems;
    });
  }, []);

  const moveToCart = useCallback((productId: string) => {
    setSavedItems(prevItems => {
      const itemToMove = prevItems.find(item => item.productId === productId);
      if (itemToMove) {
        addToCart(itemToMove, itemToMove.quantity);
        showSuccess(`${itemToMove.name} moved to cart.`);
        return prevItems.filter(item => item.productId !== productId);
      }
      return prevItems;
    });
  }, [addToCart]);

  const removeSavedItem = useCallback((productId: string) => {
    setSavedItems(prevItems => prevItems.filter(item => item.productId !== productId));
    showSuccess("Saved item removed.");
  }, []);

  const totalItems = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);

  const subtotal = useMemo(() => {
    if (!shopDetails) return 0;
    return cartItems.reduce((sum, item) => {
      const convertedPrice = convertCurrency(item.price, item.currency, shopDetails.currency);
      return sum + (convertedPrice * item.quantity);
    }, 0);
  }, [cartItems, shopDetails, convertCurrency]);

  const shipping = useMemo(() => {
    // Placeholder for shipping calculation
    // For now, a flat rate or free shipping if subtotal is high enough
    if (!shopDetails) return 0;
    return subtotal > 100 ? 0 : convertCurrency(5, 'USD', shopDetails.currency); // Example: $5 shipping, converted
  }, [subtotal, shopDetails, convertCurrency]);

  const total = useMemo(() => subtotal + shipping, [subtotal, shipping]);

  const totalSaved = useMemo(() => {
    if (!shopDetails) return 0;
    return cartItems.reduce((sum, item) => {
      const convertedOriginalPrice = convertCurrency(item.originalPrice, item.currency, shopDetails.currency);
      const convertedCurrentPrice = convertCurrency(item.price, item.currency, shopDetails.currency);
      return sum + ((convertedOriginalPrice - convertedCurrentPrice) * item.quantity);
    }, 0);
  }, [cartItems, shopDetails, convertCurrency]);

  const hasSubscriptionProducts = useMemo(() => {
    return cartItems.some(item => item.pricing_type === 'subscription');
  }, [cartItems]);

  const hasDigitalSubscriptionProducts = useMemo(() => {
    return cartItems.some(item => item.pricing_type === 'subscription' && item.product_type === 'digital');
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
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        saveForLater,
        moveToCart,
        removeSavedItem,
        hasSubscriptionProducts,
        hasDigitalSubscriptionProducts,
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