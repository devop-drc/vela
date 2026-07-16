// Shared filter-visibility model, used by both the admin Products page and the
// Storefront Studio. A visibility map is a sparse Record<key, boolean> where a
// MISSING key means "visible" — only explicit `false` hides a filter group, so
// new filter groups appear automatically as a merchant's catalog grows.

export interface AttributeDef { name: string; values: string[] }
export interface ProductLite { id: string; details?: Record<string, unknown> | null }

/** Attribute keys that are purchase options (variant pickers) rather than specs. */
export const OPTION_ATTR_KEYS = ['color', 'size', 'material'];

/** Non-attribute filter groups, in canonical display order. */
export const CORE_FILTER_KEYS = ['categories', 'priceRange', 'availability', 'rating', 'tags'] as const;
export type CoreFilterKey = (typeof CORE_FILTER_KEYS)[number];

export const isFilterVisible = (map: Record<string, boolean> | undefined | null, key: string) =>
  !map || map[key] !== false;

const CORE_TITLES: Record<string, string> = {
  categories: 'Categories',
  priceRange: 'Price Range',
  availability: 'Availability',
  rating: 'Reviews',
  tags: 'Tags',
};

export const filterKeyTitle = (key: string) =>
  CORE_TITLES[key] ??
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Internal/AI reference codes are never useful as customer-facing filters. */
const isRefCode = (name: string) => {
  const n = name.toLowerCase().replace(/\s|_|\./g, '');
  return n.includes('reference') || n.includes('refcode') || n === 'ref';
};

export const normalizeKey = (s: string) => s.toLowerCase().replace(/\s|_/g, '');

/**
 * Stringify one raw attribute value. Values come in several shapes:
 * plain scalars ("Red"), arrays of scalars, variant objects
 * ({ value, inventory, price_difference }) or spec objects ({ key, unit, value }).
 * Anything without a usable primitive is dropped rather than shown as
 * "[object Object]".
 */
const valueToStrings = (v: unknown): string[] => {
  if (v == null || v === '') return [];
  if (Array.isArray(v)) return v.flatMap(valueToStrings);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const cand = o.value ?? o.name ?? o.label;
    if (cand == null || typeof cand === 'object') return [];
    const s = String(cand).trim();
    if (!s) return [];
    return typeof o.unit === 'string' && o.unit ? [`${s} ${o.unit}`] : [s];
  }
  return [String(v).trim()].filter(Boolean);
};

/**
 * Normalize a product's `details` into [attrName, values[]] pairs. Handles both
 * the map shape ({ Brand: 'Apple', color: [...] }) and the AI spec-list shape
 * ({ 0: { key: 'battery_life', unit: 'hours', value: '25' }, ... }).
 */
export function detailEntries(details: Record<string, unknown> | null | undefined): Array<[string, string[]]> {
  const out: Array<[string, string[]]> = [];
  Object.entries(details || {}).forEach(([k, v]) => {
    if (k === 'type') return;
    if (/^\d+$/.test(k)) {
      const o = v as Record<string, unknown> | null;
      if (o && typeof o === 'object' && typeof o.key === 'string' && o.key) {
        out.push([o.key, valueToStrings(o)]);
      }
      return;
    }
    out.push([k, valueToStrings(v)]);
  });
  return out;
}

/**
 * Every attribute key present in the catalog (from attribute definitions and
 * from each product's `details`), split into purchase options vs specifications.
 * Keys are deduped case/underscore-insensitively ("Color" ≡ "color") and only
 * kept when at least one usable value exists.
 */
export function deriveAttributeKeys(
  attributes: AttributeDef[],
  products: ProductLite[]
): { options: string[]; specs: string[] } {
  // normalized key → display name (first seen wins)
  const byNorm = new Map<string, string>();
  const add = (name: string) => {
    const norm = normalizeKey(name);
    if (norm && !byNorm.has(norm)) byNorm.set(norm, name);
  };
  attributes.forEach((a) => { if (valueToStrings(a.values).length > 0) add(a.name); });
  products.forEach((p) => detailEntries(p.details).forEach(([k, vals]) => { if (vals.length > 0) add(k); }));
  const all = Array.from(byNorm.values())
    .filter((k) => !isRefCode(k))
    .sort((a, b) => filterKeyTitle(a).localeCompare(filterKeyTitle(b)));
  const options = all.filter((k) => OPTION_ATTR_KEYS.includes(normalizeKey(k)));
  const specs = all.filter((k) => !OPTION_ATTR_KEYS.includes(normalizeKey(k)));
  return { options, specs };
}

/** Distinct values for one attribute key, gathered from definitions + product details. */
export function attributeValues(
  key: string,
  attributes: AttributeDef[],
  products: ProductLite[]
): string[] {
  const bucket = new Set<string>();
  attributes
    .filter((a) => normalizeKey(a.name) === normalizeKey(key))
    .forEach((a) => valueToStrings(a.values).forEach((s) => bucket.add(s)));
  products.forEach((p) => {
    detailEntries(p.details).forEach(([k, vals]) => {
      if (normalizeKey(k) === normalizeKey(key)) vals.forEach((s) => bucket.add(s));
    });
  });
  return Array.from(bucket).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** Purchase-option entries (color/size/material) that have usable values —
    drives the card's add-to-cart vs "choose options" split and the quick view. */
export function optionEntries(details: Record<string, unknown> | null | undefined): Array<[string, string[]]> {
  return detailEntries(details).filter(
    ([k, vals]) => OPTION_ATTR_KEYS.includes(normalizeKey(k)) && vals.length > 0
  );
}

/** Does this product's details match `key` with any of the selected values?
    (selected values must be lowercase + trimmed). */
export function productMatchesAttr(
  details: Record<string, unknown> | null | undefined,
  key: string,
  selectedLower: string[]
): boolean {
  for (const [k, vals] of detailEntries(details)) {
    if (normalizeKey(k) !== normalizeKey(key)) continue;
    if (vals.some((v) => selectedLower.includes(v.trim().toLowerCase()))) return true;
  }
  return false;
}
