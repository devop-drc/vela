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
  addToCart: (item: Omit<CartItem, 'quantity' | 'isDiscounted'>, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  saveForLater: (item: CartItem) => void;
  moveToCart: (productId: string) => void;
  removeSavedItem: (productId: string) => void;
  hasSubscriptionProducts: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const FREE_SHIPPING_THRESHOLD = 50; // Define free shipping threshold in USD

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
      setTimeout(() => showError("Shop details not loaded. Cannot add to cart."), 0);
      return;
    }

    // Fetch product details to ensure we have the latest pricing_type, product_type, and billing_interval
    // We are NOT using the price/currency from this fetch for the cart item, as `item.price` is already
    // the converted display price from the product card/detail page.
    const { data: productDbData, error } = await supabase
      .from('products')
      .select('pricing_type, product_type, billing_interval')
      .eq('id', item.productId)
      .single();

    if (error || !productDbData) {
      setTimeout(() => showError("Failed to fetch product details for cart."), 0);
      console.error("Error fetching product for cart:", error);
      return;
    }

    // The `item` argument already contains the price and originalPrice in the shop's display currency,
    // and item.currency is also the shop's display currency. We should use these directly.
    const priceInDisplayCurrency = item.price;
    const originalPriceInDisplayCurrency = item.originalPrice;
    const isDiscounted = item.isDiscounted; // Trust the `isDiscounted` flag passed from the product card/detail

    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(cartItem => cartItem.productId === item.productId);

      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
          price: priceInDisplayCurrency, // Use the price from the `item` argument
          originalPrice: originalPriceInDisplayCurrency, // Use the originalPrice from the `item` argument
          isDiscounted: isDiscounted,
          pricing_type: productDbData.pricing_type, // Use from DB fetch
          product_type: productDbData.product_type, // Use from DB fetch
          billing_interval: productDbData.billing_interval, // Use from DB fetch
          currency: shopDetails.currency, // Ensure currency is shop's display currency
        };
        setTimeout(() => showSuccess(`${item.name} quantity updated in cart!`), 0);
        return updatedItems;
      } else {
        setTimeout(() => showSuccess(`${item.name} added to cart!`), 0);
        return [
          ...prevItems,
          {
            ...item, // Spread existing item properties (media_url, name, selectedOptions, etc.)
            quantity,
            price: priceInDisplayCurrency, // Use the price from the `item` argument
            originalPrice: originalPriceInDisplayCurrency, // Use the originalPrice from the `item` argument
            isDiscounted: isDiscounted,
            pricing_type: productDbData.pricing_type, // Use from DB fetch
            product_type: productDbData.product_type, // Use from DB fetch
            billing_interval: productDbData.billing_interval, // Use from DB fetch
            currency: shopDetails.currency, // Ensure currency is shop's display currency
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
    setTimeout(() => showSuccess("Item removed from cart."), 0);
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setTimeout(() => showSuccess("Cart cleared."), 0);
  }, []);

  const saveForLater = useCallback((item: CartItem) => {
    setCartItems(prevItems => prevItems.filter(cartItem => cartItem.productId !== item.productId));
    setSavedItems(prevItems => {
      if (!prevItems.some(savedItem => savedItem.productId === item.productId)) {
        setTimeout(() => showSuccess(`${item.name} saved for later.`), 0);
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
        setTimeout(() => showSuccess(`${itemToMove.name} moved to cart.`), 0);
        return prevItems.filter(item => item.productId !== productId);
      }
      return prevItems;
    });
  }, [addToCart]);

  const removeSavedItem = useCallback((productId: string) => {
    setSavedItems(prevItems => prevItems.filter(item => item.productId !== productId));
    setTimeout(() => showSuccess("Saved item removed."), 0);
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
    if (!shopDetails) return 0;
    const convertedThreshold = convertCurrency(FREE_SHIPPING_THRESHOLD, 'USD', shopDetails.currency);
    return subtotal >= convertedThreshold ? 0 : convertCurrency(5, 'USD', shopDetails.currency); // Example: $5 shipping, converted
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