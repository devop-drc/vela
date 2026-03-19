export function extractProductName(caption: string | null): string | null {
  if (!caption) return null;
  const lines = caption.split('\n').filter((l: string) => l.trim());
  for (const line of lines) {
    const cleaned = line.replace(/#\S+/g, '').replace(/[^\w\s\-&.'\/]/g, '').trim();
    if (cleaned.length >= 3) return cleaned;
  }
  return null;
}

export function normalizeProductName(name: string): string {
  return name.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-.']/g, '')
    .trim();
}

export function isCaptionInsufficient(caption: string | null): boolean {
  if (!caption || caption.trim().length === 0) return true;
  if (caption.trim().length < 15) return true;
  const words = caption.trim().split(/\s+/);
  if (words.every((w: string) => w.startsWith('#'))) return true;
  if (!/[a-zA-Z0-9]/.test(caption)) return true;
  return false;
}

export interface HeuristicResult {
  productName: string;
  price: number;
  currency: string;
  reference_code: string | null;
  inventory: number;
  confidence: 'heuristic';
}

export function heuristicParse(caption: string): HeuristicResult | null {
  const priceMatch = caption.match(/(\d+[\.,]?\d*)\s*(ALL|EUR|USD|GBP|Lek|€|\$)/i);
  const refMatch = caption.match(/ref\.?\s*code\s*:\s*([A-Za-z0-9\-]+)/i);
  const stockMatch = caption.match(/stock\s*:\s*(\d+)/i);
  const lines = caption.split('\n').filter((l: string) => l.trim());
  const name = lines[0]?.replace(/#\S+/g, '').trim();
  if (!priceMatch || !name || name.length < 3) return null;
  const currencyMap: Record<string, string> = { '€': 'EUR', '$': 'USD' };
  const rawCurrency = priceMatch[2];
  const currency = currencyMap[rawCurrency] || rawCurrency.toUpperCase();
  return {
    productName: name,
    price: parseFloat(priceMatch[1].replace(',', '.')),
    currency,
    reference_code: refMatch?.[1] || null,
    inventory: stockMatch ? parseInt(stockMatch[1]) : 10,
    confidence: 'heuristic'
  };
}
