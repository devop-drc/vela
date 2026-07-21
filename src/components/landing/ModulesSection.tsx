import { useRef } from "react";
import {
  RefreshCw, Send, Palette, FileSpreadsheet, ShoppingBag, CreditCard, Store, Check,
  Instagram, ArrowRight,
} from "lucide-react";
import { SectionHead } from "./kit";
import { useReveal } from "./useReveal";

type Lang = "sq" | "en";
const t = (l: Lang, sq: string, en: string) => (l === "sq" ? sq : en);

type Motif = "sync" | "storefront";

interface Module {
  Icon: typeof RefreshCw;
  name: string;
  pain: string;
  body: string;
  points: string[];
  /** Flagship tiles span two columns and carry a product-world preview. */
  featured?: boolean;
  motif?: Motif;
  /** Extra grid spans (applied on top of the base single-cell tile). */
  span?: string;
}

/**
 * S — Modulet. An asymmetric bento, pain-first: every card names the problem a
 * merchant lives with today, then how the system removes it. The Sync tile
 * opens the section (catalog in) and the Storefront tile closes it (what the
 * customer sees) — both flagged as flagships with a small product-world preview
 * so the loop reads as one system, not seven separate tools.
 */
export default function ModulesSection({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);

  const modules: Module[] = [
    {
      Icon: RefreshCw,
      name: t(lang, "Sinkronizimi", "The Sync"),
      pain: t(lang, "Kam 200 postime dhe zero produkte online.", "I have 200 posts and zero products online."),
      body: t(lang, "Lidh Instagramin dhe sistemi i kthen postimet në produkte — emri, çmimi, kategoria, masat e ngjyrat. Postimet e reja hyjnë vetë, pa dublikate.", "Connect Instagram and the system turns your posts into products — name, price, category, sizes and colors. New posts flow in by themselves, no duplicates."),
      points: [t(lang, "Çmimet edhe nga “20k lek”", "Prices even from slang"), t(lang, "Variantet nga përshkrimi", "Variants from the caption"), t(lang, "Sinkronizim automatik", "Automatic sync")],
      featured: true,
      motif: "sync",
      span: "xl:col-span-2",
    },
    {
      Icon: Palette,
      name: "Instagram Studio",
      pain: t(lang, "Postimet e mia s'duken si markë.", "My posts don't look like a brand."),
      body: t(lang, "Template për çdo lloj përmbajtjeje — me çmimin, emrin dhe ngjyrat e tua mbi foto. Sistemi heq edhe sfondin e fotos kur duhet.", "Templates for every content type — with your price, name and colors over the photo. The system even removes the photo background when needed."),
      points: [t(lang, "9+ template dizajni", "9+ design templates"), t(lang, "Heqje sfondi me një prekje", "One-tap background removal"), t(lang, "Carousel të lidhura", "Connected carousels")],
    },
    {
      Icon: Send,
      name: t(lang, "Publikimi", "Publishing"),
      pain: t(lang, "Çdo produkt i ri më ha 30 minuta postim.", "Every new product costs me 30 minutes of posting."),
      body: t(lang, "Punon edhe mbrapsht: krijo produktin në Vela dhe sistemi shkruan përshkrimin, dizajnon foton dhe e publikon në profilin tënd — post, story ose carousel. Edhe me shumicë.", "It works in reverse too: create the product in Vela and the system writes the caption, designs the photo and publishes it to your profile — post, story or carousel. Even in bulk."),
      points: [t(lang, "Përshkrime në stilin tënd", "Captions in your style"), t(lang, "Post / story / carousel", "Post / story / carousel"), t(lang, "Publikim me shumicë", "Bulk publishing")],
    },
    {
      Icon: FileSpreadsheet,
      name: t(lang, "Importi", "The Import"),
      pain: t(lang, "Katalogu im jeton në një Excel.", "My catalog lives in a spreadsheet."),
      body: t(lang, "Ngarko çfarëdo CSV apo Excel — sistemi i lexon vetë kolonat, në çdo gjuhë, dhe krijon produktet me foto, specifikime e opsione. Në sfond, ndërsa ti vazhdon punën.", "Upload any CSV or Excel — the system reads the columns itself, in any language, and creates products with photos, specs and options. In the background, while you keep working."),
      points: [t(lang, "Pa format të detyruar", "No fixed format"), t(lang, "Çmime, masa, ngjyra — kupton vetë", "Prices, sizes, colors — understood"), t(lang, "Ecuria në panel", "Progress in the dashboard")],
    },
    {
      Icon: ShoppingBag,
      name: t(lang, "Porositë", "Orders"),
      pain: t(lang, "Porositë më humbasin nëpër DM-e.", "Orders get lost in my DMs."),
      body: t(lang, "Çdo porosi mbërrin në një panel të vetëm, me njoftim në sekondë. Stoku ulet vetë — s'shet kurrë atë që s'e ke.", "Every order lands in one panel, with an instant notification. Stock updates itself — you never sell what you don't have."),
      points: [t(lang, "Njoftime live", "Live notifications"), t(lang, "Stok automatik, edhe për variante", "Automatic stock, even per variant"), t(lang, "Statuse deri në dorëzim", "Statuses through delivery")],
    },
    {
      Icon: CreditCard,
      name: t(lang, "Pagesat", "Payments"),
      pain: t(lang, "“A pranon kartë?” — “Jo.”", "“Do you take card?” — “No.”"),
      body: t(lang, "Kartat procesohen nga RaiAccept i Raiffeisen — të dhënat e kartës s'i sheh askush, as ti. Kesh në dorëzim gjithashtu. Çdo monedhë.", "Cards are processed by Raiffeisen's RaiAccept — nobody sees the card details, not even you. Cash on delivery too. Any currency."),
      points: [t(lang, "RaiAccept (Raiffeisen)", "RaiAccept (Raiffeisen)"), t(lang, "Kesh në dorëzim", "Cash on delivery"), t(lang, "Lekë, Euro, Dollarë…", "Lek, Euro, Dollars…")],
    },
    {
      Icon: Store,
      name: t(lang, "Dyqani", "The Storefront"),
      pain: t(lang, "Një link në bio s'është dyqan.", "A link in bio is not a store."),
      body: t(lang, "Vitrinë e vërtetë me kategori, filtra, specifikime e variante — me dizajnin tënd nga Storefront Studio, shqip dhe anglisht, ditë e natë.", "A real storefront with categories, filters, specs and variants — in your design from Storefront Studio, Albanian and English, light and dark."),
      points: [t(lang, "Dizajni yt, pamje live", "Your design, live preview"), t(lang, "Filtra & kërkim i vërtetë", "Real filters & search"), t(lang, "SQ / EN · ditë / natë", "SQ / EN · light / dark")],
      featured: true,
      motif: "storefront",
      span: "sm:col-span-2 xl:col-span-2",
    },
  ];

  useReveal(root);

  return (
    <section ref={root} id="modules" className="px-5 py-14 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHead
          eyebrow={t(lang, "Modulet", "The modules")}
          title={t(lang, "Çdo hall i biznesit tënd, një modul që e zgjidh", "Every headache of your business, one module that removes it")}
          sub={t(lang, "Vela s'është një vegël më shumë — është i gjithë biznesi yt në Instagram, i menaxhuar nga një vend.", "Vela isn't one more tool — it's your whole Instagram business, run from one place.")}
        />
        <div className="mt-10 grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((m) => (
            <ModuleCard key={m.name} lang={lang} module={m} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── One module tile. Flagship tiles lay out as two columns on wide screens
   (copy on the left, preview on the right) and fall back to a stack below. ── */
function ModuleCard({ lang, module }: { lang: Lang; module: Module }) {
  const { Icon, name, pain, body, points, featured, motif, span } = module;

  return (
    <div
      className={`reveal ls-card glare-hover group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/70 p-6 transition-transform duration-300 hover:-translate-y-1 ${span ?? ""}`}
    >
      <div className={featured ? "grid flex-1 gap-6 lg:grid-cols-2 lg:items-center" : "flex flex-1 flex-col"}>
        {/* Copy column */}
        <div className="flex min-w-0 flex-col">
          <div className="mb-4 flex items-center gap-3">
            <span className={`brand-gradient grid shrink-0 place-items-center rounded-xl text-white ${featured ? "h-12 w-12" : "h-10 w-10"}`}>
              <Icon className={featured ? "h-6 w-6" : "h-5 w-5"} />
            </span>
            <span className={`font-semibold ${featured ? "text-lg" : ""}`}>{name}</span>
          </div>

          {/* Pain — the merchant's own words, opened by a gradient quote mark. */}
          <p className={`flex gap-1.5 font-semibold leading-snug tracking-tight ${featured ? "text-xl sm:text-2xl" : "text-lg"}`}>
            <span aria-hidden className="brand-text -mt-1 select-none font-display text-3xl leading-none">“</span>
            <span>{pain}</span>
          </p>

          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{body}</p>

          <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
            {points.map((pt, k) => (
              <li key={k} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="text-muted-foreground">{pt}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Preview column (flagship only) */}
        {featured && motif && (
          <div className="min-w-0">
            {motif === "sync" ? <SyncMotif lang={lang} /> : <StorefrontMotif lang={lang} />}
          </div>
        )}
      </div>
    </div>
  );
}

/* Sync preview: a caption becomes a structured product. */
function SyncMotif({ lang }: { lang: Lang }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 p-3 sm:gap-3">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <span className="brand-gradient grid h-6 w-6 shrink-0 place-items-center rounded-md text-white">
            <Instagram className="h-3.5 w-3.5" />
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">{t(lang, "Postimi yt", "Your post")}</span>
        </div>
        <p className="truncate text-xs leading-snug text-foreground">
          {t(lang, "Fustan veror 🌸 20k lek", "Summer dress 🌸 20k lek")}
        </p>
        <p className="text-[11px] text-muted-foreground">S · M · L</p>
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden />

      <div className="min-w-0 flex-1 rounded-lg border border-border bg-card p-2.5 shadow-sm">
        <p className="truncate text-xs font-semibold">{t(lang, "Fustan veror", "Summer dress")}</p>
        <p className="text-sm font-bold text-primary">4.500 L</p>
        <div className="mt-1 flex gap-1">
          {["S", "M", "L"].map((s) => (
            <span key={s} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Storefront preview: a tiny live shop window. */
function StorefrontMotif({ lang }: { lang: Lang }) {
  const cats = [t(lang, "Fustane", "Dresses"), t(lang, "Këpucë", "Shoes"), t(lang, "Aksesorë", "Accessories")];
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="ml-2 truncate rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
          dyqani.vela.al
        </span>
      </div>
      <div className="p-3">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {cats.map((c, i) => (
            <span
              key={c}
              className={`rounded-full px-2 py-0.5 text-[10px] ${i === 0 ? "brand-gradient text-white" : "border border-border text-muted-foreground"}`}
            >
              {c}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-md border border-border bg-card p-1.5">
              <div className="mb-1 aspect-square rounded bg-muted" />
              <div className="h-1.5 w-2/3 rounded-full bg-muted" />
              <div className="mt-1 h-1.5 w-1/2 rounded-full bg-primary/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
