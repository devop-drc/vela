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

export const formatLargeNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
};