export const formatCurrency = (
  amount: number | null | undefined,
  currency: string | null | undefined,
  locale: string = 'en-US',
  showSign: boolean = false
) => {
  const numericAmount = amount ?? 0;
  // Albanian-market default: fall back to Lek, not USD, when no currency is set.
  const currencyCode = currency || 'ALL';

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

// ── Dates ─────────────────────────────────────────────────────────────────────
// Centralized date formatting so dates read consistently across the app.
export const formatDate = (value: string | number | Date | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatDateTime = (value: string | number | Date | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Short relative time ("just now", "5m ago", "3h ago", "2d ago"), falling back
// to an absolute date for anything older than a week.
export const formatRelativeTime = (value: string | number | Date | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return formatDate(d);
};

export const formatLargeNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
};