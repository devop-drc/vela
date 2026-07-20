// Visitor-side storefront preferences: color mode and language. These belong
// to the CUSTOMER (not the merchant's design config): the mode overrides the
// shop's configured theme.mode, the language localizes the storefront chrome.
// Persisted in localStorage, shared across shops on this device, and exposed
// through useSyncExternalStore so every component updates on toggle.

import { useSyncExternalStore } from 'react';

export type SfMode = 'light' | 'dark' | null; // null → merchant's configured mode
export type SfLang = 'sq' | 'en';

const MODE_KEY = 'sf-visitor-mode';
const LANG_KEY = 'sf-visitor-lang';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const safeGet = (k: string): string | null => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const safeSet = (k: string, v: string | null) => {
  try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ }
};

export const getVisitorMode = (): SfMode => {
  const v = safeGet(MODE_KEY);
  return v === 'light' || v === 'dark' ? v : null;
};
export const setVisitorMode = (m: SfMode) => { safeSet(MODE_KEY, m); notify(); };
export const useVisitorMode = (): SfMode => useSyncExternalStore(subscribe, getVisitorMode, () => null);

export const getVisitorLang = (): SfLang => (safeGet(LANG_KEY) === 'en' ? 'en' : 'sq'); // Albanian-first market
export const setVisitorLang = (l: SfLang) => { safeSet(LANG_KEY, l); notify(); };
export const useVisitorLang = (): SfLang => useSyncExternalStore(subscribe, getVisitorLang, () => 'sq');

/* ── storefront chrome dictionary (customer-facing strings) ── */
const DICT = {
  home: ['Kryefaqja', 'Home'],
  shop: ['Dyqani', 'Shop'],
  orders: ['Porositë', 'Orders'],
  myOrders: ['Porositë e mia', 'My Orders'],
  categories: ['Kategoritë', 'Categories'],
  cart: ['Shporta', 'Cart'],
  search: ['Kërko', 'Search'],
  searchPlaceholder: ['Kërko produkte…', 'Search products…'],
  openMenu: ['Hap menynë', 'Open menu'],
  addToCart: ['Shto në shportë', 'Add to Cart'],
  outOfStock: ['Pa stok', 'Out of Stock'],
  backToProducts: ['Kthehu te produktet', 'Back to Products'],
  reviews: ['Vlerësimet', 'Reviews'],
  noReviews: ['Ende pa vlerësime. Bli produktin dhe ndaj përvojën tënde nga Porositë e mia.', 'No reviews yet. Buy this product and share your experience from My Orders.'],
  shipsFrom: ['Dërgohet nga', 'Ships from'],
  quantity: ['Sasia', 'Quantity'],
  emptyCart: ['Shporta është bosh.', 'Your cart is empty.'],
  continueShopping: ['Vazhdo blerjet', 'Continue shopping'],
  subtotal: ['Nëntotali', 'Subtotal'],
  shipping: ['Transporti', 'Shipping'],
  free: ['FALAS', 'FREE'],
  total: ['Totali', 'Total'],
  checkout: ['Arka', 'Checkout'],
  proceedToCheckout: ['Vazhdo te arka', 'Proceed to Checkout'],
  remove: ['Hiq', 'Remove'],
  contactShipping: ['Kontakti & Transporti', 'Contact & Shipping'],
  firstName: ['Emri', 'First Name'],
  lastName: ['Mbiemri', 'Last Name'],
  email: ['Email', 'Email'],
  phoneOptional: ['Telefoni (opsional)', 'Phone (optional)'],
  address: ['Adresa', 'Address'],
  city: ['Qyteti', 'City'],
  zip: ['Kodi postar', 'Zip / Postal Code'],
  country: ['Shteti', 'Country'],
  saveAddress: ['Ruaje adresën për porositë e ardhshme', 'Save this address for future orders'],
  notesSeller: ['Shënime për shitësin (opsionale)', 'Notes for Seller (optional)'],
  notesCourier: ['Shënime për korrierin (opsionale)', 'Notes for Courier (optional)'],
  orderSummary: ['Përmbledhja e porosisë', 'Order Summary'],
  continueToPayment: ['Vazhdo te pagesa', 'Continue to Payment'],
  secureCheckout: ['Arkë e sigurt', 'Secure checkout'],
  payByCard: ['Paguaj me kartë', 'Pay by card'],
  cashOnDelivery: ['Para në dorë', 'Cash on delivery'],
  fastDelivery: ['Dërgesë e shpejtë', 'Fast delivery'],
  fastDeliverySub: ['Direkt te dera jote, kudo.', 'Straight to your door, anywhere.'],
  securePayment: ['Pagesë e sigurt', 'Secure payment'],
  securePaymentSub: ['Me kartë ose para në dorë.', 'Pay by card or on delivery.'],
  realSupport: ['Mbështetje reale', 'Real support'],
  realSupportSub: ['Na shkruaj kurdo në Instagram.', 'Message us any time on Instagram.'],
  shopNow: ['Bli tani', 'Shop Now'],
  viewAll: ['Shiko të gjitha', 'View all'],
  lightMode: ['Modaliteti i çelët', 'Light mode'],
  darkMode: ['Modaliteti i errët', 'Dark mode'],
  yourCart: ['Shporta jote', 'Your Cart'],
  soldOut: ['E shitur', 'Sold Out'],
  startShopping: ['Fillo blerjet', 'Start Shopping'],
  browseShop: ['Shfleto dyqanin dhe shto diçka që të pëlqen.', 'Browse the shop and add something you love.'],
  placeOrder: ['Përfundo porosinë', 'Place Order'],
  placingOrder: ['Duke porositur…', 'Placing Order…'],
  youSaved: ['Kursove', 'You saved'],
  freeShipPrefix: ['Shto edhe', 'Add'],
  freeShipSuffix: ['për transport falas.', 'more for free shipping.'],
  subscriptionNote: ['Shporta përmban abonime. Pagesa në dorëzim nuk është e mundur.', 'Cart includes subscriptions. Cash on Delivery is unavailable.'],
  details: ['Detajet', 'Details'],
  showLess: ['Trego më pak', 'Show less'],
  readMore: ['Lexo më shumë', 'Read more'],
  viewFullDetails: ['Shiko detajet e plota', 'View full details'],
  chooseOptions: ['Zgjidh opsionet', 'Choose options'],
  review: ['vlerësim', 'review'],
  reviewsWord: ['vlerësime', 'reviews'],
  verifiedCustomer: ['Klient i verifikuar', 'Verified customer'],
  shopResponse: ['Përgjigje nga dyqani', 'Response from the shop'],
  savedAddresses: ['Adresat e ruajtura', 'Saved addresses'],
  chooseSavedAddress: ['Zgjidh një adresë të ruajtur', 'Choose a saved address'],
  newAddress: ['Adresë e re…', 'New address…'],
  addressLabelPlaceholder: ['Etiketa (p.sh. Shtëpia, Puna)', 'Label (e.g. Home, Work)'],
  selectCountry: ['Zgjidh shtetin', 'Select country'],
  paymentMethod: ['Mënyra e pagesës', 'Payment Method'],
  cashOnDeliveryDesc: ['Paguaj me para në dorë kur të mbërrijë porosia.', 'Pay with cash when your order is delivered.'],
  notAvailableSubs: ['Nuk ofrohet për abonime.', 'Not available for subscriptions.'],
  cardTitle: ['Kartë krediti/debiti', 'Credit/Debit Card'],
  cardDesc: ['Pagesë e sigurt me RaiAccept — do të ridrejtohesh për ta përfunduar.', "Secure payment via RaiAccept — you'll be redirected to complete it."],
  securelyProcessed: ['Të dhënat e pagesës përpunohen në mënyrë të sigurt.', 'Your payment information is securely processed.'],
  ordersIntro: ['Porositë e bëra në këtë pajisje shfaqen automatikisht. Për të gjetur një porosi tjetër, shkruaj emailin dhe numrin e porosisë nga konfirmimi.', 'Orders placed on this device appear automatically. To look up another order, enter your email and the order number from your confirmation.'],
  findOrder: ['Gjej porosinë', 'Find Order'],
  tryAgain: ['Provo përsëri', 'Try again'],
  noOrdersYet: ['Ende pa porosi', 'No orders yet'],
  noOrdersSub: ['Porositë që bën në këtë dyqan do të shfaqen këtu.', 'Orders you place in this shop will show up here.'],
  browseProducts: ['Shfleto produktet', 'Browse products'],
  order: ['Porosia', 'Order'],
  date: ['Data', 'Date'],
  items: ['Artikujt', 'Items'],
  status: ['Statusi', 'Status'],
  orderNoPlaceholder: ['Nr. i porosisë (p.sh. 2b7f9933)', 'Order # (e.g. 2b7f9933)'],
  pages: ['Faqet', 'Pages'],
  explore: ['Eksploro', 'Explore'],
  contact: ['Kontakti', 'Contact'],
  getInTouch: ['Na kontakto', 'Get in touch'],
  emailUs: ['Na shkruaj email', 'Email us'],
  allProducts: ['Të gjitha produktet', 'All products'],
  allRightsReserved: ['Të gjitha të drejtat e rezervuara.', 'All rights reserved.'],
} as const;
export type SfKey = keyof typeof DICT;

export const sft = (lang: SfLang, key: SfKey): string => DICT[key][lang === 'sq' ? 0 : 1];

/** Hook: current language + translate fn + setters (for toggle UIs). */
export const useSfT = () => {
  const lang = useVisitorLang();
  return {
    lang,
    t: (key: SfKey) => sft(lang, key),
    setLang: setVisitorLang,
  };
};
