// Encapsulates order placement against the create-order edge function. Faithful
// to the previous payload shape (productId/quantity/price/currency/selectedOptions,
// totalAmount in shop currency, shipping fields) so inventory + currency behave
// identically. Rewritten as a reusable hook for the new cart/checkout UIs.

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useCart } from '@/contexts/CartContext';
import { useStorefront } from '@/contexts/StorefrontContext';

export interface CheckoutFields {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState?: string;
  shippingZip: string;
  shippingCountry: string;
  shippingNotesSeller?: string;
  shippingNotesCourier?: string;
  paymentMethod: 'card' | 'cash_on_delivery';
}

export const useCheckout = (onDone?: () => void) => {
  const navigate = useNavigate();
  const { cartItems, total, clearCart } = useCart();
  const { shopDetails } = useStorefront();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const placeOrder = useCallback(
    async (data: CheckoutFields) => {
      if (!shopDetails) { showError('Shop details not loaded. Cannot place order.'); return; }
      if (cartItems.length === 0) { showError('Your cart is empty.'); return; }

      setIsSubmitting(true);
      const toastId = toast.loading('Placing your order...');
      try {
        const orderPayload = {
          shopSlug: shopDetails.slug,
          customerInfo: { firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone },
          cartItems: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            currency: item.currency,
            selectedOptions: item.selectedOptions || null,
          })),
          totalAmount: total,
          currency: shopDetails.currency,
          paymentMethod: data.paymentMethod,
          shippingAddress: data.shippingAddress,
          shippingCity: data.shippingCity,
          shippingState: data.shippingState,
          shippingZip: data.shippingZip,
          shippingCountry: data.shippingCountry,
          shippingNotesSeller: data.shippingNotesSeller,
          shippingNotesCourier: data.shippingNotesCourier,
        };

        const { data: responseData, error: invokeError } = await supabase.functions.invoke('create-order', { body: orderPayload });
        if (invokeError) throw invokeError;
        if (responseData?.error) throw new Error(responseData.error);

        // Persist order id locally so the guest "My Orders" lookup finds it.
        try {
          const key = 'storefront_order_ids';
          const prev = JSON.parse(localStorage.getItem(key) || '[]');
          localStorage.setItem(key, JSON.stringify(Array.from(new Set([...prev, responseData.order.id]))));
        } catch { /* ignore */ }

        toast.success('Order placed! Redirecting to your orders.', { id: toastId });
        clearCart();
        onDone?.();
        navigate(`/shop/${shopDetails.slug}/orders?orderId=${responseData.order.id}`);
      } catch (err: any) {
        console.error('Checkout failed:', err);
        toast.error(`Failed to place order: ${err.message || 'An unexpected error occurred.'}`, { id: toastId });
      } finally {
        setIsSubmitting(false);
      }
    },
    [cartItems, total, shopDetails, clearCart, navigate, onDone]
  );

  return { placeOrder, isSubmitting };
};
