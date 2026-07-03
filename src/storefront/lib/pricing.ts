// Shared storefront pricing/promotion helpers (extracted so every card/variant
// computes discounts identically).

export interface PromotionLike {
  id: string;
  type: 'discount' | 'offer';
  value: any;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  target_products: string[] | null;
}

export const activePromotionsFor = (promotions: PromotionLike[], productId: string): PromotionLike[] => {
  const now = new Date();
  return (promotions || []).filter((p) => {
    if (!p.is_active) return false;
    if (p.start_date && now < new Date(p.start_date)) return false;
    if (p.end_date && now > new Date(p.end_date)) return false;
    if (p.target_products && p.target_products.length > 0) return p.target_products.includes(productId);
    return true;
  });
};

export interface PriceResult {
  original: number | null;
  discounted: number | null;
  hasDiscount: boolean;
}

export const computePrice = (
  basePrice: number | null,
  promotions: PromotionLike[]
): PriceResult => {
  const original = basePrice;
  if (original == null) return { original, discounted: original, hasDiscount: false };
  const discount = promotions.find((p) => p.type === 'discount' && p.value);
  if (!discount) return { original, discounted: original, hasDiscount: false };
  let d = original;
  if (discount.value.discountType === 'percentage') d = original * (1 - discount.value.discountValue / 100);
  else if (discount.value.discountType === 'flat') d = original - discount.value.discountValue;
  d = Math.max(0, d);
  return { original, discounted: d, hasDiscount: d !== original };
};

export const promotionBadgeLabel = (p: PromotionLike, currencySymbol = ''): string | null => {
  if (p.type === 'discount') {
    if (p.value?.discountType === 'percentage') return `${p.value.discountValue}% OFF`;
    if (p.value?.discountType === 'flat') return `-${currencySymbol}${p.value.discountValue} OFF`;
    return 'Discount';
  }
  if (p.type === 'offer') return p.value?.offerType === 'free_shipping' ? 'Free Shipping' : 'Offer';
  return null;
};
