// Lightweight localStorage store for the public Instagram shop customer.
// Lets a guest customer view "My Orders" without an account by remembering
// their contact details and the IDs of orders they placed on this device.

const EMAIL_KEY = "instagram_shop_customer_email"; // kept for backwards-compat
const PROFILE_KEY = "instagram_shop_customer_profile";
const ORDER_IDS_KEY = "instagram_shop_order_ids";

export interface StoredCustomer {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

const normalizeEmail = (email?: string | null) => (email || "").trim().toLowerCase();

export const getStoredCustomer = (): StoredCustomer | null => {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw) as StoredCustomer;
    // Fall back to the legacy email-only key
    const email = localStorage.getItem(EMAIL_KEY);
    return email ? { email } : null;
  } catch {
    return null;
  }
};

export const saveStoredCustomer = (customer: StoredCustomer) => {
  try {
    const normalized: StoredCustomer = { ...customer, email: normalizeEmail(customer.email) };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
    // Keep the legacy key in sync so existing reads still work.
    if (normalized.email) localStorage.setItem(EMAIL_KEY, normalized.email);
  } catch {
    /* ignore quota / disabled storage */
  }
};

export const getStoredOrderIds = (): string[] => {
  try {
    const raw = localStorage.getItem(ORDER_IDS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
};

export const addStoredOrderId = (orderId: string) => {
  if (!orderId) return;
  try {
    const existing = getStoredOrderIds();
    if (existing.includes(orderId)) return;
    // Keep most-recent-first, cap to avoid unbounded growth.
    const next = [orderId, ...existing].slice(0, 100);
    localStorage.setItem(ORDER_IDS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
};
