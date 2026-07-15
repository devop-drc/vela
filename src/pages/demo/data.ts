/**
 * Mock data for the fully-interactive /demo app.
 * Albanian market · ALL currency · Vela brand. No network, no Supabase —
 * everything here is static seed data the demo screens mutate in local state.
 */
import {
  ShoppingBag, CheckCircle, CreditCard, Sparkles, Package, Truck, Eye, Box, XCircle,
} from "lucide-react";
import { toneTint, toneDotBg } from "@/lib/status";

export const img = (n: number) => `/demo/p${n}.jpg`;

/* ── Products ─────────────────────────────────────────────────────────── */
export type DemoProduct = {
  id: string;
  name: string;
  category: string;
  type: string;
  price: number;
  currency: "ALL";
  status: "Active" | "Draft" | "Out of Stock";
  inventory: number;
  image: string;
  caption: string;
  tags: string[];
  rating?: number;
  reviews?: number;
  totalEarned: number;
  specs: { attribute: string; value: string; unit?: string }[];
  variants?: { name: string; stock: number }[];
};

export const demoProducts: DemoProduct[] = [
  {
    id: "d1", name: "Fustan liri", category: "Fustane", type: "Fustan veror", price: 3500, currency: "ALL",
    status: "Active", inventory: 14, image: img(1), caption: "Fustan liri i lehtë për ditët e verës, në ngjyra natyrale.",
    tags: ["verë", "liri", "elegant"], rating: 4.8, reviews: 37, totalEarned: 178500,
    specs: [{ attribute: "Materiali", value: "100% liri" }, { attribute: "Gjatësia", value: "midi" }],
    variants: [{ name: "S", stock: 3 }, { name: "M", stock: 6 }, { name: "L", stock: 5 }],
  },
  {
    id: "d2", name: "Shall mëndafshi", category: "Aksesorë", type: "Shall", price: 1200, currency: "ALL",
    status: "Active", inventory: 3, image: img(2), caption: "Shall mëndafshi me printim floral, i butë në prekje.",
    tags: ["mëndafsh", "aksesor"], rating: 4.6, reviews: 12, totalEarned: 43200,
    specs: [{ attribute: "Materiali", value: "mëndafsh" }, { attribute: "Përmasat", value: "90x90", unit: "cm" }],
  },
  {
    id: "d3", name: "Çantë kashte", category: "Çanta", type: "Çantë plazhi", price: 2800, currency: "ALL",
    status: "Out of Stock", inventory: 0, image: img(3), caption: "Çantë kashte e punuar me dorë, ideale për plazh.",
    tags: ["kashtë", "plazh", "verë"], rating: 4.9, reviews: 21, totalEarned: 89600,
    specs: [{ attribute: "Materiali", value: "kashtë natyrale" }],
  },
  {
    id: "d4", name: "Vathë ari", category: "Bizhuteri", type: "Vathë", price: 990, currency: "ALL",
    status: "Active", inventory: 26, image: img(4), caption: "Vathë të vegjël të praruar me ar 18k.",
    tags: ["ar", "bizhuteri", "minimal"], rating: 4.7, reviews: 48, totalEarned: 51480,
    specs: [{ attribute: "Materiali", value: "ar 18k" }],
  },
  {
    id: "d5", name: "Sandale lëkure", category: "Këpucë", type: "Sandale", price: 4200, currency: "ALL",
    status: "Active", inventory: 8, image: img(5), caption: "Sandale lëkure natyrale, komode për çdo ditë.",
    tags: ["lëkurë", "verë"], rating: 4.5, reviews: 19, totalEarned: 151200,
    specs: [{ attribute: "Materiali", value: "lëkurë natyrale" }],
    variants: [{ name: "37", stock: 1 }, { name: "38", stock: 2 }, { name: "39", stock: 3 }, { name: "40", stock: 2 }],
  },
  {
    id: "d6", name: "Kapelë plazhi", category: "Aksesorë", type: "Kapelë", price: 1500, currency: "ALL",
    status: "Active", inventory: 17, image: img(6), caption: "Kapelë me strehë të gjerë për mbrojtje nga dielli.",
    tags: ["plazh", "verë", "kashtë"], rating: 4.4, reviews: 9, totalEarned: 33000,
    specs: [{ attribute: "Materiali", value: "kashtë" }],
  },
  {
    id: "d7", name: "Bluzë pambuku", category: "Bluza", type: "Bluzë", price: 1900, currency: "ALL",
    status: "Draft", inventory: 0, image: img(7), caption: "Bluzë pambuku organik, prerje klasike.",
    tags: ["pambuk", "bazë"], totalEarned: 0,
    specs: [{ attribute: "Materiali", value: "pambuk organik" }],
  },
  {
    id: "d8", name: "Fund mesatar", category: "Funde", type: "Fund", price: 2400, currency: "ALL",
    status: "Active", inventory: 2, image: img(8), caption: "Fund mesatar me valë, i përshtatshëm për zyrë e dalje.",
    tags: ["elegant", "zyrë"], rating: 4.3, reviews: 6, totalEarned: 40800,
    specs: [{ attribute: "Materiali", value: "viskozë" }, { attribute: "Gjatësia", value: "midi" }],
  },
];

export const productStatuses = ["Active", "Draft", "Out of Stock"] as const;

/* ── Orders ───────────────────────────────────────────────────────────── */
export type DemoOrderStatus =
  | "Pending" | "Order Seen" | "Order Packaged" | "Given to Courier"
  | "Fulfilled" | "Problematic" | "Cancelled";

export type DemoOrder = {
  id: string;
  customer: string;
  email: string;
  items: { name: string; qty: number; price: number; image: string }[];
  total: number;
  status: DemoOrderStatus;
  paymentMethod: "card" | "cash";
  paymentStatus: "paid" | "pending" | "failed";
  createdAt: string; // ISO
  shipping: { address: string; city: string; country: string; zip: string };
};

const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();
const hrsAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const demoOrders: DemoOrder[] = [
  { id: "a1f4c2e8", customer: "Ana Krasniqi", email: "ana.k@gmail.com", items: [{ name: "Fustan liri", qty: 1, price: 3500, image: img(1) }], total: 3500, status: "Pending", paymentMethod: "cash", paymentStatus: "pending", createdAt: hrsAgo(1), shipping: { address: "Rr. Myslym Shyri 12", city: "Tiranë", country: "Shqipëri", zip: "1001" } },
  { id: "b2e5d3f9", customer: "Bledi Marku", email: "bledi.m@gmail.com", items: [{ name: "Sandale lëkure", qty: 1, price: 4200, image: img(5) }, { name: "Kapelë plazhi", qty: 1, price: 1500, image: img(6) }], total: 5700, status: "Order Seen", paymentMethod: "card", paymentStatus: "paid", createdAt: hrsAgo(3), shipping: { address: "Rr. e Durrësit 88", city: "Durrës", country: "Shqipëri", zip: "2001" } },
  { id: "c3f6e4a0", customer: "Sara Dervishi", email: "sara.d@gmail.com", items: [{ name: "Çantë kashte", qty: 1, price: 2800, image: img(3) }], total: 2800, status: "Order Packaged", paymentMethod: "card", paymentStatus: "paid", createdAt: hrsAgo(7), shipping: { address: "Rr. Ismail Qemali 5", city: "Vlorë", country: "Shqipëri", zip: "9401" } },
  { id: "d4a7f5b1", customer: "Elira Kola", email: "elira.k@gmail.com", items: [{ name: "Bluzë pambuku", qty: 2, price: 1900, image: img(7) }], total: 3800, status: "Given to Courier", paymentMethod: "cash", paymentStatus: "pending", createdAt: daysAgo(1), shipping: { address: "Rr. Kavajës 210", city: "Tiranë", country: "Shqipëri", zip: "1001" } },
  { id: "e5b8a6c2", customer: "Andi Meta", email: "andi.m@gmail.com", items: [{ name: "Shall mëndafshi", qty: 1, price: 1200, image: img(2) }, { name: "Vathë ari", qty: 1, price: 990, image: img(4) }], total: 2190, status: "Fulfilled", paymentMethod: "card", paymentStatus: "paid", createdAt: daysAgo(2), shipping: { address: "Rr. Dëshmorët e Kombit 3", city: "Tiranë", country: "Shqipëri", zip: "1001" } },
  { id: "f6c9b7d3", customer: "Ilir Prifti", email: "ilir.p@gmail.com", items: [{ name: "Fund mesatar", qty: 1, price: 2400, image: img(8) }], total: 2400, status: "Fulfilled", paymentMethod: "cash", paymentStatus: "paid", createdAt: daysAgo(2), shipping: { address: "Lagjja 3, Rr. Nacionale", city: "Fier", country: "Shqipëri", zip: "9301" } },
  { id: "a7d0c8e4", customer: "Ledia Hoxha", email: "ledia.h@gmail.com", items: [{ name: "Fustan liri", qty: 1, price: 3500, image: img(1) }], total: 3500, status: "Fulfilled", paymentMethod: "card", paymentStatus: "paid", createdAt: daysAgo(3), shipping: { address: "Rr. Bajram Curri 44", city: "Shkodër", country: "Shqipëri", zip: "4001" } },
  { id: "b8e1d9f5", customer: "Genti Bregu", email: "genti.b@gmail.com", items: [{ name: "Vathë ari", qty: 3, price: 990, image: img(4) }], total: 2970, status: "Problematic", paymentMethod: "card", paymentStatus: "failed", createdAt: daysAgo(4), shipping: { address: "Rr. Frederik Shiroka 8", city: "Tiranë", country: "Shqipëri", zip: "1001" } },
  { id: "c9f2e0a6", customer: "Klea Doda", email: "klea.d@gmail.com", items: [{ name: "Kapelë plazhi", qty: 1, price: 1500, image: img(6) }], total: 1500, status: "Cancelled", paymentMethod: "cash", paymentStatus: "pending", createdAt: daysAgo(5), shipping: { address: "Rr. Skënderbeu 100", city: "Elbasan", country: "Shqipëri", zip: "3001" } },
  { id: "d0a3f1b7", customer: "Rea Shehu", email: "rea.s@gmail.com", items: [{ name: "Çantë kashte", qty: 1, price: 2800, image: img(3) }, { name: "Sandale lëkure", qty: 1, price: 4200, image: img(5) }], total: 7000, status: "Fulfilled", paymentMethod: "card", paymentStatus: "paid", createdAt: daysAgo(6), shipping: { address: "Rr. Naim Frashëri 17", city: "Korçë", country: "Shqipëri", zip: "7001" } },
  { id: "e1b4a2c8", customer: "Erisa Lika", email: "erisa.l@gmail.com", items: [{ name: "Bluzë pambuku", qty: 1, price: 1900, image: img(7) }], total: 1900, status: "Fulfilled", paymentMethod: "card", paymentStatus: "paid", createdAt: daysAgo(7), shipping: { address: "Rr. e Kavajës 3", city: "Tiranë", country: "Shqipëri", zip: "1001" } },
  { id: "f2c5b3d9", customer: "Denis Nika", email: "denis.n@gmail.com", items: [{ name: "Fund mesatar", qty: 2, price: 2400, image: img(8) }], total: 4800, status: "Fulfilled", paymentMethod: "cash", paymentStatus: "paid", createdAt: daysAgo(8), shipping: { address: "Lagjja Partizani, Rr. 2", city: "Berat", country: "Shqipëri", zip: "5001" } },
];

/* ── Categories ───────────────────────────────────────────────────────── */
export type DemoType = {
  name: string;
  system?: boolean;
  specs: { label: string; unit?: string }[];
  options: { name: string; values: string[] }[];
};
export type DemoCategory = { id: string; name: string; system?: boolean; types: DemoType[] };

export const demoCategories: DemoCategory[] = [
  {
    id: "c-fustane", name: "Fustane", types: [
      { name: "Fustan veror", specs: [{ label: "Materiali" }, { label: "Gjatësia" }], options: [{ name: "Madhësia", values: ["S", "M", "L", "XL"] }, { name: "Ngjyra", values: ["Bezhë", "Blu", "E bardhë"] }] },
      { name: "Fustan mbrëmjeje", specs: [{ label: "Materiali" }], options: [{ name: "Madhësia", values: ["S", "M", "L"] }] },
    ],
  },
  {
    id: "c-aksesore", name: "Aksesorë", system: true, types: [
      { name: "Shall", system: true, specs: [{ label: "Materiali" }, { label: "Përmasat", unit: "cm" }], options: [{ name: "Ngjyra", values: ["Floral", "Njëngjyrëshe"] }] },
      { name: "Kapelë", specs: [{ label: "Materiali" }], options: [{ name: "Madhësia", values: ["Uni"] }] },
    ],
  },
  {
    id: "c-canta", name: "Çanta", types: [
      { name: "Çantë plazhi", specs: [{ label: "Materiali" }], options: [{ name: "Ngjyra", values: ["Natyrale", "E zezë"] }] },
    ],
  },
  {
    id: "c-bizhuteri", name: "Bizhuteri", system: true, types: [
      { name: "Vathë", system: true, specs: [{ label: "Materiali" }], options: [{ name: "Ngjyra", values: ["Ar", "Argjend"] }] },
    ],
  },
  {
    id: "c-kepuce", name: "Këpucë", types: [
      { name: "Sandale", specs: [{ label: "Materiali" }], options: [{ name: "Madhësia", values: ["37", "38", "39", "40", "41"] }] },
    ],
  },
];

/* ── Keywords ─────────────────────────────────────────────────────────── */
export type DemoKeyword = { id: string; keyword: string; description: string };
export const demoKeywords: DemoKeyword[] = [
  { id: "k1", keyword: "Çmimi", description: "Çmimi i produktit në Lek (ALL)." },
  { id: "k2", keyword: "Ngjyra", description: "Ngjyrat e disponueshme për produktin." },
  { id: "k3", keyword: "Madhësia", description: "Madhësitë ose numrat në dispozicion." },
  { id: "k4", keyword: "Materiali", description: "Materiali kryesor i produktit." },
];
export const demoSuggestedKeywords: DemoKeyword[] = [
  { id: "s1", keyword: "Sasia", description: "Sasia në stok për çdo variant." },
  { id: "s2", keyword: "Transporti", description: "Informacion mbi transportin dhe dërgesën." },
  { id: "s3", keyword: "Ref", description: "Kodi referencë i produktit." },
];

/* ── Promotions ───────────────────────────────────────────────────────── */
export type DemoPromotion = {
  id: string;
  name: string;
  type: "discount" | "offer";
  detail: string; // "20% Off", "Free Shipping (Min 5,000 ALL)"
  kind: "percentage" | "flat" | "free_shipping";
  active: boolean;
  start?: string;
  end?: string;
  repeat?: "daily" | "weekly" | "monthly" | "yearly";
  products?: number;
};
export const demoPromotions: DemoPromotion[] = [
  { id: "p1", name: "Zbritje Verore", type: "discount", detail: "20% Off", kind: "percentage", active: true, start: daysAgo(6), end: daysAgo(-10), products: 12 },
  { id: "p2", name: "Transport Falas", type: "offer", detail: "Free Shipping (Min 5,000 ALL)", kind: "free_shipping", active: true },
  { id: "p3", name: "Fundjavë -500", type: "discount", detail: "500 ALL Off", kind: "flat", active: true, start: daysAgo(-3), end: daysAgo(-6), repeat: "weekly" },
  { id: "p4", name: "Black Friday 2025", type: "discount", detail: "40% Off", kind: "percentage", active: false, start: daysAgo(220), end: daysAgo(210) },
];

export type DemoAnnouncement = { id: string; message: string; icon: string; active: boolean; order: number };
export const demoAnnouncements: DemoAnnouncement[] = [
  { id: "an1", message: "Transport falas mbi 5,000 ALL", icon: "Truck", active: true, order: 0 },
  { id: "an2", message: "Koleksioni i ri i verës sapo mbërriti ☀️", icon: "Sparkles", active: true, order: 1 },
  { id: "an3", message: "-20% për të gjitha fustanet këtë javë", icon: "Tag", active: false, order: 2 },
];

/* ── Filters (storefront visibility) ──────────────────────────────────── */
export const demoCoreFilters = [
  { key: "categories", label: "Categories", visible: true },
  { key: "tags", label: "Tags", visible: true },
  { key: "priceRange", label: "Price Range", visible: true },
];
export const demoAttributeFilters = [
  { key: "madhesia", label: "Madhësia", visible: true },
  { key: "ngjyra", label: "Ngjyra", visible: true },
  { key: "materiali", label: "Materiali", visible: false },
];

/* ── Billing ──────────────────────────────────────────────────────────── */
export type DemoPlan = {
  id: string;
  name: string;
  priceAll: number; // monthly, ALL
  annualFreeMonths: number;
  productLimit?: number | null;
  features: string[];
  featured?: boolean;
};
export const demoPlans: DemoPlan[] = [
  { id: "free", name: "Falas", priceAll: 0, annualFreeMonths: 0, productLimit: 10, features: ["Instagram storefront", "Porosi me para në dorë (COD)", "Deri në 10 produkte", "Analitikë bazë"] },
  { id: "starter", name: "Starter", priceAll: 1900, annualFreeMonths: 2, productLimit: null, features: ["Gjithçka te Falas", "Produkte të palimituara", "Storefront Studio", "Pagesa me kartë", "Analitikë e plotë"] },
  { id: "pro", name: "Pro", priceAll: 3900, annualFreeMonths: 2, productLimit: null, featured: true, features: ["Gjithçka te Starter", "Promocione & zbritje", "Vlerësime nga klientët", "Analitikë e avancuar", "Limite më të larta AI"] },
  { id: "business", name: "Business", priceAll: 7900, annualFreeMonths: 3, productLimit: null, features: ["Gjithçka te Pro", "Mbështetje prioritare", "Domain i personalizuar", "Akses ekipi"] },
];

export type DemoPayment = { id: string; date: string; type: string; amount: number; status: "paid" | "pending" | "failed" };
export const demoPayments: DemoPayment[] = [
  { id: "pay1", date: daysAgo(2), type: "Free trial", amount: 0, status: "paid" },
];

/* ── Dashboard aggregates ─────────────────────────────────────────────── */
export const demoStatCards = [
  { title: "Të ardhura totale", value: "2,845,000 ALL", description: "Të ardhura gjithsej", icon: CreditCard },
  { title: "Shitje", value: "+1,890", description: "Numri i shitjeve", icon: ShoppingBag },
  { title: "Produkte aktive", value: "8", description: "Produkte në shitje", icon: Package },
  { title: "Klientë", value: "1,204", description: "Klientë unikë", icon: CheckCircle },
];

export const demoChartData = [
  { name: "Jan", revenue: 182000, clients: 120 },
  { name: "Shk", revenue: 231000, clients: 138 },
  { name: "Mar", revenue: 298000, clients: 165 },
  { name: "Pri", revenue: 372000, clients: 188 },
  { name: "Maj", revenue: 451000, clients: 224 },
  { name: "Qer", revenue: 560000, clients: 268 },
];

export const demoProfile = {
  shop_name: "Butiku i Elirës",
  username: "butikuielires",
  logo_url: "/demo/p4.jpg",
  followers: 12400,
  posts: 450,
  products: 8,
};

export const demoTopProducts = [
  { id: "d1", name: "Fustan liri", image: img(1), sold: 452 },
  { id: "d5", name: "Sandale lëkure", image: img(5), sold: 389 },
  { id: "d3", name: "Çantë kashte", image: img(3), sold: 312 },
  { id: "d7", name: "Bluzë pambuku", image: img(7), sold: 268 },
  { id: "d2", name: "Shall mëndafshi", image: img(2), sold: 205 },
];

export const demoActivities = [
  { id: "1", type: "sale", title: "Porosi e re", description: "Ana K. · Fustan liri (M)", value: "+3,500 ALL", date: hrsAgo(0.03), icon: ShoppingBag, iconBg: "bg-success/10 text-success" },
  { id: "2", type: "sale", title: "Porosi e përmbushur", description: "Bledi M. · Sandale lëkure", value: "+4,200 ALL", date: hrsAgo(0.15), icon: CheckCircle, iconBg: "bg-success/10 text-success" },
  { id: "3", type: "product", title: "Produkt i sinkronizuar", description: "Vathë ari — nga Instagram", value: "Active", image: img(4), date: hrsAgo(0.27), icon: Sparkles, iconBg: "bg-info/10 text-info" },
  { id: "4", type: "sale", title: "Pagesë me kartë", description: "Sara D. · Çantë kashte", value: "+2,800 ALL", date: hrsAgo(0.45), icon: CreditCard, iconBg: "bg-success/10 text-success" },
  { id: "5", type: "sale", title: "Porosi e re", description: "Elira K. · Bluzë pambuku", value: "+1,900 ALL", date: hrsAgo(0.7), icon: ShoppingBag, iconBg: "bg-success/10 text-success" },
  { id: "6", type: "product", title: "Produkt i sinkronizuar", description: "Kapelë plazhi — nga Instagram", value: "Active", image: img(6), date: hrsAgo(1), icon: Sparkles, iconBg: "bg-info/10 text-info" },
  { id: "7", type: "sale", title: "Porosi e re", description: "Andi M. · Shall mëndafshi", value: "+1,200 ALL", date: hrsAgo(1.4), icon: ShoppingBag, iconBg: "bg-success/10 text-success" },
  { id: "8", type: "sale", title: "Porosi e përmbushur", description: "Ilir P. · Fund mesatar", value: "+2,400 ALL", date: hrsAgo(2.1), icon: CheckCircle, iconBg: "bg-success/10 text-success" },
];

/* status → colour helpers shared by Orders mirror */
export const orderStatusMeta: Record<DemoOrderStatus, { soft: string; solid: string; icon: any }> = {
  "Pending": { soft: toneTint.warning, solid: toneDotBg.warning, icon: Package },
  "Order Seen": { soft: toneTint.warning, solid: toneDotBg.warning, icon: Eye },
  "Order Packaged": { soft: toneTint.info, solid: toneDotBg.info, icon: Box },
  "Given to Courier": { soft: toneTint.info, solid: toneDotBg.info, icon: Truck },
  "Fulfilled": { soft: toneTint.success, solid: toneDotBg.success, icon: CheckCircle },
  "Problematic": { soft: toneTint.danger, solid: toneDotBg.danger, icon: XCircle },
  "Cancelled": { soft: toneTint.neutral, solid: toneDotBg.neutral, icon: XCircle },
};

export const orderStatusOrder: DemoOrderStatus[] = [
  "Pending", "Order Seen", "Order Packaged", "Given to Courier", "Fulfilled", "Problematic", "Cancelled",
];

export const fmtALL = (n: number) => `${Math.round(n).toLocaleString("en-US")} ALL`;
