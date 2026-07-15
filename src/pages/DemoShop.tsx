/**
 * /demo-shop — the REAL storefront UI rendered over mock data.
 * Used by the landing page (hero phone + Storefront Studio panel) so what
 * visitors see is the actual product, not a hand-built imitation.
 *
 * Query params:
 *   ?template=<id>  render a specific Storefront Studio template
 *   ?cycle=1        rotate through real templates every few seconds
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { StorefrontContext } from "@/contexts/StorefrontContext";
import { CartProvider } from "@/contexts/CartContext";
import { StorefrontThemeProvider } from "@/storefront/theme/StorefrontThemeProvider";
import { SectionRenderer } from "@/storefront/blocks/SectionRenderer";
import { Header } from "@/storefront/components/Header";
import { Footer } from "@/storefront/components/Footer";
import { ProductCard } from "@/storefront/components/ProductCard";
import { TEMPLATES, getTemplate } from "@/storefront/templates";

/* ── Mock data (Albanian demo boutique) — exported for the landing's
      Remotion journey film, which renders the same real UI. ──────────── */
export const svgImage = (from: string, to: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='750'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${from}'/><stop offset='1' stop-color='${to}'/></linearGradient></defs><rect width='600' height='750' fill='url(%23g)'/></svg>`
  );

/** Real product photography — self-hosted in public/demo (originally Unsplash). */
const unsplash = (id: string, n?: number) => `/demo/p${n ?? 1}.jpg`;

const P = (id: string, name: string, category: string, price: number, img: string) => ({
  id,
  name,
  status: "Active",
  price,
  currency: "ALL",
  inventory: 12,
  media_url: `/demo/p${id.slice(1)}.jpg`,
  media_type: "image",
  media_gallery: null,
  thumbnail_url: `/demo/p${id.slice(1)}.jpg`,
  caption: name,
  category,
  pricing_type: "one_time" as const,
  billing_interval: null,
  details: null,
  created_at: new Date().toISOString(),
});

export const PRODUCTS = [
  P("d1", "Fustan liri", "Fustane", 3500, "1595777457583-95e059d581b8"),
  P("d2", "Shall mëndafshi", "Aksesorë", 1200, "1601924994987-69e26d50dc26"),
  P("d3", "Çantë kashte", "Çanta", 2800, "1590874103328-eac38a683ce7"),
  P("d4", "Vathë ari", "Bizhuteri", 990, "1535632066927-ab7c9ab60908"),
  P("d5", "Sandale lëkure", "Këpucë", 4200, "1543163521-1bf539c55dd2"),
  P("d6", "Kapelë plazhi", "Aksesorë", 1500, "1521369909029-2afed882baee"),
  P("d7", "Bluzë pambuku", "Bluza", 1900, "1434389677669-e08b4cac3105"),
  P("d8", "Fund mesatar", "Funde", 2400, "1594633312681-425c7b97ccd1"),
];

export const SHOP = {
  id: "demo",
  shop_name: "Butiku i Elirës",
  headline: "Koleksioni i verës ☀️ — deri në -30%",
  about: "Veshje & aksesorë të përzgjedhur me dashuri, direkt nga Instagrami ynë.",
  slug: "demo-shop",
  currency: "ALL",
  logo_url: null,
  favicon_url: null,
  instagram_url: null,
  contact_email: "demo@vela.al",
};

export const MOCK_CONTEXT = {
  shopDetails: SHOP as any,
  appearanceSettings: null,
  products: PRODUCTS as any[],
  isLoading: false,
  error: null,
  currentPage: 1,
  hasMoreProducts: false,
  fetchMoreProducts: async () => {},
  fetchProductById: async (id: string) => (PRODUCTS.find((p) => p.id === id) as any) ?? null,
  isLoadingMore: false,
  bestSellers: PRODUCTS.slice(0, 4).map((p) => ({ ...p, total_sold: 42 })) as any[],
  recommendedProducts: PRODUCTS.slice(4) as any[],
  exchangeRates: null,
  convertCurrency: (amount: number | null | undefined) => amount ?? 0,
  promotions: [] as any[],
  marqueeElements: [
    { id: "m1", message: "Transport falas mbi 5,000 ALL", icon_name: "Truck", is_active: true, display_order: 0 },
    { id: "m2", message: "Koleksioni i ri i verës sapo mbërriti ☀️", icon_name: "Sparkles", is_active: true, display_order: 1 },
  ] as any[],
  customerOrders: [] as any[],
};

/* ── Page ───────────────────────────────────────────────────────────── */
export default function DemoShop() {
  const [params] = useSearchParams();
  const cycle = params.get("cycle") === "1";
  const requested = params.get("template");
  const [idx, setIdx] = useState(() => {
    if (!requested) return 0;
    const i = TEMPLATES.findIndex((t) => t.id === requested);
    return i >= 0 ? i : 0;
  });
  const [visible, setVisible] = useState(true);

  // Cycle through REAL Storefront Studio templates with a soft crossfade.
  useEffect(() => {
    if (!cycle) return;
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % TEMPLATES.length);
        setVisible(true);
      }, 260);
    }, 3400);
    return () => clearInterval(t);
  }, [cycle]);

  const config = useMemo(() => {
    const t = requested && !cycle ? getTemplate(requested) : TEMPLATES[idx];
    return (t ?? TEMPLATES[0]).config;
  }, [idx, requested, cycle]);

  useEffect(() => {
    document.title = "Vela — Demo Shop";
  }, []);

  // ?view=products → header + product grid only (used by the landing's
  // hero phone, where the home hero's dark banner reads badly at 44% scale).
  const view = params.get("view");

  return (
    <StorefrontContext.Provider value={MOCK_CONTEXT as any}>
      <CartProvider>
        <div style={{ opacity: visible ? 1 : 0, transition: "opacity 260ms ease" }}>
          <StorefrontThemeProvider config={config} className="min-h-screen">
            <Header />
            {view === "products" ? (
              <main className="sf-container py-4">
                <div className="grid grid-cols-2 gap-3">
                  {PRODUCTS.slice(0, 6).map((p) => (
                    <ProductCard key={p.id} product={p as any} />
                  ))}
                </div>
              </main>
            ) : (
              <>
                <main className="sf-container py-8">
                  <SectionRenderer sections={config.pages.home} />
                </main>
                <Footer />
              </>
            )}
          </StorefrontThemeProvider>
        </div>
      </CartProvider>
    </StorefrontContext.Provider>
  );
}
