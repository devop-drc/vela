export const formatCurrency = (
  amount: number | null | undefined,
  currency: string | null | undefined,
  locale: string = 'en-US'
) => {
  const numericAmount = amount ?? 0;
  const currencyCode = currency || 'USD';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(numericAmount);
  } catch (e) {
    // Fallback for invalid currency codes
    return `${currencyCode} ${numericAmount.toFixed(2)}`;
  }
};