export interface ParsedProductDetails {
  category: string;
  material: string;
  referenceCode: string;
  name: string;
  sizes: string[];
  price: number;
  currency: string;
}

export function parseProductCaption(caption?: string): ParsedProductDetails | null {
  if (!caption) {
    return null;
  }

  const lines = caption.trim().split('\n').filter(line => line.trim() !== '');

  if (lines.length < 4) {
    return null;
  }

  try {
    // Line 1: Category and Material
    const line1Parts = lines[0].trim().split(/\s+/);
    if (line1Parts.length < 2) return null;
    const category = line1Parts[0];
    const material = line1Parts.slice(1).join(' ');

    // Line 2: Art- Code and Name
    const artMatch = lines[1].trim().match(/^Art-([\w-]+)\s*(.*)$/i);
    if (!artMatch) return null;
    const [, referenceCode, name] = artMatch;

    // Line 3: Sizes
    const sizesMatch = lines[2].trim().match(/Ne gjendje nr\.\s*([\d\s\/]+)/i);
    if (!sizesMatch) return null;
    const sizes = sizesMatch[1].trim().split('/').map(s => s.trim()).filter(Boolean);
    if (sizes.length === 0) return null;

    // Line 4: Price
    const priceMatch = lines[3].trim().match(/(?:Cmimi|Çmimi)\s*(\d+(\.\d+)?)\s*(\w+)/i);
    if (!priceMatch) return null;
    const price = parseFloat(priceMatch[1]);
    const currency = priceMatch[3];

    return {
      category,
      material,
      referenceCode,
      name: name.trim(),
      sizes,
      price,
      currency,
    };
  } catch (error) {
    console.error("Error parsing caption:", error);
    return null;
  }
}