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
  /* section defaults (see localizeDefault) */
  shopByCategory: ['Bli sipas kategorisë', 'Shop by Category'],
  bestSellers: ['Më të shiturat', 'Best Sellers'],
  newArrivals: ['Të rejat', 'New Arrivals'],
  recommendedForYou: ['Rekomanduar për ty', 'Recommended For You'],
  viewAllProducts: ['Shiko të gjitha produktet', 'View All Products'],
  youMayAlsoLike: ['Mund të të pëlqejnë edhe', 'You may also like'],
  viewProduct: ['Shiko produktin', 'View Product'],
  specialOffer: ['Ofertë speciale', 'Special offer'],
  dontMissOut: ['Mos e humb', 'Don’t miss out'],
  about: ['Rreth', 'About'],
  mostLoved: ['Më të dashurat', 'Most loved'],
  justIn: ['Sapo erdhën', 'Just in'],
  forYou: ['Për ty', 'For you'],
  browse: ['Shfleto', 'Browse'],
  uncategorized: ['Pa kategori', 'Uncategorized'],
  /* products page */
  newest: ['Më të rejat', 'Newest'],
  priceLowHigh: ['Çmimi: nga i ulëti', 'Price: Low to High'],
  priceHighLow: ['Çmimi: nga i larti', 'Price: High to Low'],
  topRated: ['Më të vlerësuarat', 'Top Rated'],
  nameAZ: ['Emri A–Z', 'Name A–Z'],
  inStock: ['Me stok', 'In stock'],
  filters: ['Filtrat', 'Filters'],
  price: ['Çmimi', 'Price'],
  availability: ['Disponueshmëria', 'Availability'],
  rating: ['Vlerësimi', 'Rating'],
  tags: ['Etiketat', 'Tags'],
  clearFilters: ['Pastro filtrat', 'Clear filters'],
  allFilters: ['Të gjithë filtrat', 'All filters'],
  category: ['Kategoria', 'Category'],
  all: ['Të gjitha', 'All'],
  clear: ['Pastro', 'Clear'],
  productWord: ['produkt', 'product'],
  productsWord: ['produkte', 'products'],
  showingIn: ['Duke shfaqur produktet në', 'Showing products in'],
  loadingRest: ['Duke shfaqur përputhjet nga produktet e ngarkuara — po ngarkohet pjesa tjetër e katalogut…', 'Showing matches from loaded products — loading the rest of the catalog…'],
  contactUs: ['Na kontakto', 'Contact Us'],
  backToShop: ['Kthehu te dyqani', 'Back to Shop'],
  paymentSuccess: ['Pagesa u krye me sukses!', 'Payment successful!'],
  paymentSuccessSub: ['Faleminderit për blerjen — porosia u konfirmua dhe dyqani po e përgatit.', 'Thank you for your purchase — your order is confirmed and the shop is on it.'],
  showMyOrders: ['Shiko porositë e mia', 'Show my orders'],
  reviewProduct: ['Vlerëso', 'Review'],
  shareExperience: ['Ndaj përvojën tënde me këtë produkt.', 'Share your experience with this product.'],
  selectRating: ['Zgjidh një vlerësim me yje.', 'Please select a star rating.'],
  reviewThanks: ['Faleminderit për vlerësimin!', 'Thanks for your review!'],
  reviewFailed: ['Dërgimi i vlerësimit dështoi.', 'Failed to submit review.'],
  reviewPlaceholder: ['Trego çfarë të pëlqeu (opsionale)…', 'Tell others what you liked (optional)…'],
  cancel: ['Anulo', 'Cancel'],
  submitting: ['Duke dërguar…', 'Submitting…'],
  submitReview: ['Dërgo vlerësimin', 'Submit Review'],
  addedToCartSuffix: ['u shtua në shportë!', 'added to cart!'],
  qtyUpdatedSuffix: ['— sasia u përditësua në shportë!', 'quantity updated in cart!'],
  itemRemoved: ['Artikulli u hoq nga shporta.', 'Item removed from cart.'],
  cartCleared: ['Shporta u pastrua.', 'Cart cleared.'],
  savedForLaterSuffix: ['u ruajt për më vonë.', 'saved for later.'],
  movedToCartSuffix: ['u kalua në shportë.', 'moved to cart.'],
  savedItemRemoved: ['Artikulli i ruajtur u hoq.', 'Saved item removed.'],
  clearAll: ['Pastro të gjitha', 'Clear all'],
  stars: ['yje', 'stars'],
  andUp: ['e lart', '& up'],
  clearSearch: ['Pastro kërkimin', 'Clear search'],
  noProductsYet: ['Ende s’ka produkte — kthehu së shpejti!', 'No products have been added yet — check back soon!'],
  noProductsMatch: ['Asnjë produkt nuk përputhet me filtrat.', 'No products match your filters.'],
  productFilters: ['Filtrat e produkteve', 'Product filters'],
  /* page states */
  shopNotFound: ['Detajet e dyqanit nuk u gjetën.', 'Shop details not found.'],
  underConstruction: ['Dyqani në ndërtim', 'Store Under Construction'],
  underConstructionSub: ['Po përgatisim produkte fantastike për ty! Dyqani hapet së shpejti.', 'We’re busy curating amazing products for you! Our shop will be available soon.'],
  loadingProduct: ['Duke ngarkuar produktin…', 'Loading product…'],
  productNotFound: ['Produkti nuk u gjet', 'Product Not Found'],
  /* orders detail */
  shipTo: ['Dërgohet te', 'Ship to'],
  placedOn: ['Porositur më', 'Placed'],
  cardPayment: ['Pagesë me kartë', 'Card payment'],
  leaveReview: ['Lër një vlerësim', 'Leave review'],
  reviewedLabel: ['Vlerësuar', 'Reviewed'],
  item: ['Artikull', 'Item'],
  paymentCancelled: ['Pagesa u anulua. Porosia u ruajt — mund të riprovosh ose të kontaktosh dyqanin.', 'Payment was cancelled. Your order is saved — you can retry or contact the shop.'],
  paymentFailed: ['Pagesa dështoi. Porosia u ruajt — provo përsëri ose kontakto dyqanin.', 'Payment failed. Your order is saved — please try again or contact the shop.'],
  lookupHint: ['Shkruaj emailin dhe numrin e porosisë nga konfirmimi.', 'Enter both your email and the order number from your confirmation.'],
  ordersLoadError: ['Nuk mundëm të ngarkojmë porositë. Kontrollo lidhjen dhe provo përsëri.', 'We couldn’t load your orders. Please check your connection and try again.'],
  /* toasts */
  outOfStockToast: ['Ky produkt është pa stok për momentin.', 'This product is currently out of stock.'],
  choosePrefix: ['Zgjidh një', 'Please choose a'],
  chooseSuffix: ['më parë.', 'first.'],
  placingYourOrder: ['Duke vendosur porosinë…', 'Placing your order…'],
  redirectingPayment: ['Duke të ridrejtuar te pagesa e sigurt…', 'Redirecting to secure payment…'],
  orderPlaced: ['Porosia u vendos! Po të çojmë te porositë e tua.', 'Order placed! Redirecting to your orders.'],
  orderFailed: ['Vendosja e porosisë dështoi', 'Failed to place order'],
  shopNotLoaded: ['Të dhënat e dyqanit s’u ngarkuan. Nuk mund të vendoset porosia.', 'Shop details not loaded. Cannot place order.'],
  /* a11y */
  decreaseQty: ['Ul sasinë', 'Decrease quantity'],
  increaseQty: ['Rrit sasinë', 'Increase quantity'],
} as const;
export type SfKey = keyof typeof DICT;

export const sft = (lang: SfLang, key: SfKey): string => DICT[key][lang === 'sq' ? 0 : 1];

/* Known ENGLISH defaults that live inside stored merchant configs (section
   props seeded by templates/defaults/registry). A value matching one of these
   was never customized — render the visitor-language string instead. Anything
   else is merchant-authored copy and always wins. */
const DEFAULT_TEXT_KEYS: Record<string, SfKey> = {
  'Shop Now': 'shopNow',
  'Shop by Category': 'shopByCategory',
  'Best Sellers': 'bestSellers',
  'New Arrivals': 'newArrivals',
  'Recommended For You': 'recommendedForYou',
  'View All Products': 'viewAllProducts',
  'You may also like': 'youMayAlsoLike',
  'Reviews': 'reviews',
  'Fast delivery': 'fastDelivery',
  'Straight to your door, anywhere.': 'fastDeliverySub',
  'Secure payment': 'securePayment',
  'Pay by card or on delivery.': 'securePaymentSub',
  'Real support': 'realSupport',
  'Message us any time on Instagram.': 'realSupportSub',
};

export const localizeDefault = (lang: SfLang, value: string | undefined | null, fallback: SfKey): string => {
  if (!value) return sft(lang, fallback);
  const key = DEFAULT_TEXT_KEYS[value.trim()];
  return key ? sft(lang, key) : value;
};

/* Order status enums are stored in English in the DB — translate for display. */
const STATUS_SQ: Record<string, string> = {
  Pending: 'Në pritje',
  'Order Seen': 'Porosia u pa',
  'Order Packaged': 'U paketua',
  'Given to Courier': 'Te korrieri',
  Fulfilled: 'Përfunduar',
  Problematic: 'Problematike',
  Cancelled: 'Anuluar',
};
export const sfStatus = (lang: SfLang, status: string): string =>
  lang === 'sq' ? (STATUS_SQ[status] ?? status) : status;

/** Hook: current language + translate fn + setters (for toggle UIs).
    `ld` localizes config-stored values whose English default was never
    customized; `status` translates order-status enums. */
export const useSfT = () => {
  const lang = useVisitorLang();
  return {
    lang,
    t: (key: SfKey) => sft(lang, key),
    ld: (value: string | undefined | null, fallback: SfKey) => localizeDefault(lang, value, fallback),
    status: (s: string) => sfStatus(lang, s),
    setLang: setVisitorLang,
  };
};
