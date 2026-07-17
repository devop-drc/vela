// Device-local saved shipping addresses for storefront checkouts. Shares the
// key the Instagram checkout already writes so addresses saved in either
// storefront are offered in both.

export interface SavedAddress {
  id: string;
  label: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string;
  city: string;
  state: string | null;
  zip_code: string;
  country: string;
  is_default: boolean;
}

const KEY = 'instagram_saved_addresses';

export const loadSavedAddresses = (): SavedAddress[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

export const saveAddress = (addr: Omit<SavedAddress, 'id' | 'is_default'> & { id?: string }): SavedAddress[] => {
  const list = loadSavedAddresses();
  // Same street+city+zip → update in place instead of duplicating.
  const keyOf = (a: { address: string; city: string; zip_code: string }) =>
    `${a.address}|${a.city}|${a.zip_code}`.toLowerCase();
  const existing = list.findIndex((a) => keyOf(a) === keyOf(addr as SavedAddress));
  const entry: SavedAddress = {
    is_default: list.length === 0,
    ...(existing >= 0 ? list[existing] : {}),
    ...addr,
    id: existing >= 0 ? list[existing].id : (addr.id || crypto.randomUUID()),
  } as SavedAddress;
  const next = existing >= 0 ? list.map((a, i) => (i === existing ? entry : a)) : [...list, entry];
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
};

export const removeSavedAddress = (id: string): SavedAddress[] => {
  const next = loadSavedAddresses().filter((a) => a.id !== id);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
};

/** One-line presentation that stays readable in narrow dropdowns:
 *  "Home — Rruga e Kavajës 12, Tiranë". */
export const formatAddressLine = (a: SavedAddress): { title: string; subtitle: string } => ({
  title: a.label || `${a.first_name} ${a.last_name}`.trim() || a.city,
  subtitle: [a.address, a.city, a.country].filter(Boolean).join(', '),
});
