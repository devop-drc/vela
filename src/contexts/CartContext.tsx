import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useStorefront } from './StorefrontContext'; // To get shop currency for display
import { toast } from 'sonner';

export interface CartItem {
  productId: string;
  name: string;
  price: number; // This is the *effective* price (could be discounted)
  originalPrice: number; // New: The original price before discount
  isDiscounted: boolean; // New: Flag if a discount was applied
  currency: string; // This currency should be the shop's display currency
  quantity: number;
  media_url: string;
  media_type: string | null;
  slug: string; // Add product slug for linking
  selectedOptions?: { [key: string]: string | string[] }; // New: Store selected options
}

export interface SavedItem extends Omit<CartItem, 'quantity'> {
  savedAt: string;
}

interface CartContextType {
  cartItems: CartItem[];
  savedItems: SavedItem[]; // New state for saved items
  addToCart: (item: Omit<CartItem, 'quantity' | 'originalPrice' | 'isDiscounted' | 'selectedOptions'> & { originalPrice: number; isDiscounted: boolean; selectedOptions?: { [key: string]: string | string[] } }, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  saveForLater: (item: Omit<CartItem, 'quantity'>) => void; // New function
  moveToCart: (productId: string) => void; // New function
  removeSavedItem: (productId: string) => void; // New function
  totalItems: number;
  subtotal: number;
  shipping: number; // Placeholder for now
  total: number;
  totalSaved: number; // New: Total amount saved due to discounts
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'storefront_cart';
const SAVED_STORAGE_KEY = 'storefront_saved_for_later';

export const CartProvider = ({ children }: { ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      return savedCart ? JSON.parse(savedCart) : [];
    }
    return [];
  });

  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    if (typeof window !== 'undefined') {
      const savedForLater = localStorage.getItem(SAVED_STORAGE_KEY);
      return savedForLater ? JSON.parse(savedForLater) : [];
    }
    return [];
  });

  const { shopDetails } = useStorefront(); // Get shop currency for consistent display

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    }
  }, [cartItems]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(savedItems));
    }
  }, [savedItems]);

  const addToCart = useCallback((item: Omit<CartItem, 'quantity' | 'originalPrice' | 'isDiscounted' | 'selectedOptions'> & { originalPrice: number; isDiscounted: boolean; selectedOptions?: { [key: string]: string | string[] } }, quantity: number) => {
    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(cartItem => cartItem.productId === item.productId);

      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += quantity;
        return updatedItems;
      } else {
        return [...prevItems, { ...item, quantity }];
      }
    });
    toast.success(`${quantity} x "${item.name}" added to cart!`);
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.productId !== productId));
    toast.info("Item removed from cart.");
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    toast.info("Cart cleared.");
  }, []);

  const saveForLater = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setSavedItems(prevItems => {
      if (prevItems.some(savedItem => savedItem.productId === item.productId)) {
        toast.info(`"${item.name}" is already saved.`);
        return prevItems;
      }
      toast.success(`"${item.name}" saved!`);
      return [...prevItems, { ...item, savedAt: new Date().toISOString() }];
    });
    removeFromCart(item.productId); // Remove from cart when saving for later
  }, [removeFromCart]);

  const moveToCart = useCallback((productId: string) => {
    setSavedItems(prevSavedItems => {
      const itemToMove = prevSavedItems.find(item => item.productId === productId);
      if (itemToMove) {
        // Re-add to cart, preserving originalPrice and isDiscounted
        addToCart({
          productId: itemToMove.productId,
          name: itemToMove.name,
          price: itemToMove.price,
          originalPrice: itemToMove.originalPrice,
          isDiscounted: itemToMove.isDiscounted,
          currency: itemToMove.currency,
          media_url: itemToMove.media_url,
          media_type: itemToMove.media_type,
          slug: itemToMove.slug,
          selectedOptions: itemToMove.selectedOptions,
        }, 1); // Add to cart with quantity 1
        toast.success(`"${itemToMove.name}" moved to cart!`);
        return prevSavedItems.filter(item => item.productId !== productId); // Remove from saved
      }
      return prevSavedItems;
    });
  }, [addToCart]);

  const removeSavedItem = useCallback((productId: string) => {
    setSavedItems(prevItems => prevItems.filter(item => item.productId !== productId));
    toast.info("Saved item removed.");
  }, []);

  const totalItems = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems]);
  const shipping = useMemo(() => (cartItems.length > 0 ? 5.00 : 0), [cartItems]); // Mock shipping
  const total = useMemo(() => subtotal + shipping, [subtotal, shipping]);

  const totalSaved = useMemo(() => {
    const savedInCart = cartItems.reduce((sum, item) => sum + (item.isDiscounted ? (item.originalPrice - item.price) * item.quantity : 0), 0);
    const savedInSavedItems = savedItems.reduce((sum, item) => sum + (item.isDiscounted ? (item.originalPrice - item.price) : 0), 0);
    return savedInCart + savedInSavedItems;
  }, [cartItems, savedItems]);

  const contextValue: CartContextType = {
    cartItems,
    savedItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    saveForLater,
    moveToCart,
    removeSavedItem,
    totalItems,
    subtotal,
    shipping,
    total,
    totalSaved,
  };

  return (
    <CartContext.Provider value={contextValue}>
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