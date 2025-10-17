export const formatCurrency = (
  amount: number | null | undefined,
  currency: string | null | undefined,
  locale: string = 'en-US',
  showSign: boolean = false
) => {
  const numericAmount = amount ?? 0;
  const currencyCode = currency || 'USD';

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    });

    let formatted = formatter.format(numericAmount);

    if (showSign && numericAmount !== 0) {
      const sign = numericAmount > 0 ? '+' : '';
      // Remove existing sign if present (Intl.NumberFormat adds it)
      formatted = formatted.replace(/^-/, '').replace(/^\+/, '');
      
      // Re-add the sign at the beginning
      formatted = sign + formatted;
    }

    return formatted;
  } catch (e) {
    // Fallback for invalid currency codes
    const signPrefix = showSign && numericAmount !== 0 ? (numericAmount > 0 ? '+' : '') : '';
    return `${signPrefix}${currencyCode} ${Math.abs(numericAmount).toFixed(2)}`;
  }
};

export const formatLargeNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
};