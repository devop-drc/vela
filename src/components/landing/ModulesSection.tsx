import { useRef } from "react";
import { RefreshCw, Send, Palette, FileSpreadsheet, ShoppingBag, CreditCard, Store, Check } from "lucide-react";
import { SectionHead } from "./kit";
import { useReveal } from "./useReveal";

type Lang = "sq" | "en";
const t = (l: Lang, sq: string, en: string) => (l === "sq" ? sq : en);

/**
 * S — Modulet: every module of the app, pain-first. Each card names the
 * problem a merchant lives with today, then how the system removes it.
 */
export default function ModulesSection({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);

  const modules = [
    {
      Icon: RefreshCw,
      name: t(lang, "Sinkronizimi", "The Sync"),
      pain: t(lang, "“Kam 200 postime dhe zero produkte online.”", "“I have 200 posts and zero products online.”"),
      body: t(lang, "Lidh Instagramin dhe sistemi i kthen postimet në produkte — emri, çmimi, kategoria, masat e ngjyrat. Postimet e reja hyjnë vetë, pa dublikate.", "Connect Instagram and the system turns your posts into products — name, price, category, sizes and colors. New posts flow in by themselves, no duplicates."),
      points: [t(lang, "Çmimet edhe nga “20k lek”", "Prices even from slang"), t(lang, "Variantet nga përshkrimi", "Variants from the caption"), t(lang, "Sinkronizim automatik", "Automatic sync")],
    },
    {
      Icon: Send,
      name: t(lang, "Publikimi", "Publishing"),
      pain: t(lang, "“Çdo produkt i ri më ha 30 minuta postim.”", "“Every new product costs me 30 minutes of posting.”"),
      body: t(lang, "Tani punon edhe mbrapsht: krijo produktin në Vela dhe sistemi shkruan përshkrimin, dizajnon foton dhe e publikon në profilin tënd — post, story, carousel ose reel. Edhe me shumicë, me një tërheqje.", "Now it works in reverse too: create the product in Vela and the system writes the caption, designs the photo and publishes it to your profile — post, story, carousel or reel. Even in bulk, with one drag."),
      points: [t(lang, "Përshkrime në stilin tënd", "Captions in your style"), t(lang, "Post / story / reel / carousel", "Post / story / reel / carousel"), t(lang, "Publikim me shumicë", "Bulk publishing")],
    },
    {
      Icon: Palette,
      name: "Instagram Studio",
      pain: t(lang, "“Postimet e mia s'duken si markë.”", "“My posts don't look like a brand.”"),
      body: t(lang, "Template për çdo lloj përmbajtjeje — me çmimin, emrin dhe ngjyrat e tua mbi foto. Sistemi heq edhe sfondin e fotos kur duhet. Videot animohen vetë.", "Templates for every content type — with your price, name and colors over the photo. The system even removes the photo background when needed. Videos animate themselves."),
      points: [t(lang, "9+ template dizajni", "9+ design templates"), t(lang, "Heqje sfondi me një prekje", "One-tap background removal"), t(lang, "Carousel të lidhura pa ndërprerje", "Seamlessly connected carousels")],
    },
    {
      Icon: FileSpreadsheet,
      name: t(lang, "Importi", "The Import"),
      pain: t(lang, "“Katalogu im jeton në një Excel.”", "“My catalog lives in a spreadsheet.”"),
      body: t(lang, "Ngarko çfarëdo CSV apo Excel — sistemi i lexon vetë kolonat, në çdo gjuhë, dhe krijon produktet me foto, specifikime e opsione. Në sfond, ndërsa ti vazhdon punën.", "Upload any CSV or Excel — the system reads the columns itself, in any language, and creates products with photos, specs and options. In the background, while you keep working."),
      points: [t(lang, "Pa format të detyruar", "No fixed format"), t(lang, "Çmime, masa, ngjyra — kupton vetë", "Prices, sizes, colors — understood"), t(lang, "Ecuria në panel", "Progress in the dashboard")],
    },
    {
      Icon: ShoppingBag,
      name: t(lang, "Porositë", "Orders"),
      pain: t(lang, "“Porositë më humbasin nëpër DM-e.”", "“Orders get lost in my DMs.”"),
      body: t(lang, "Çdo porosi mbërrin në një panel të vetëm, me njoftim në sekondë. Stoku ulet vetë — s'shet kurrë atë që s'e ke.", "Every order lands in one panel, with an instant notification. Stock updates itself — you never sell what you don't have."),
      points: [t(lang, "Njoftime live", "Live notifications"), t(lang, "Stok automatik, edhe për variante", "Automatic stock, even per variant"), t(lang, "Statuse deri në dorëzim", "Statuses through delivery")],
    },
    {
      Icon: CreditCard,
      name: t(lang, "Pagesat", "Payments"),
      pain: t(lang, "“A pranon kartë? — Jo.”", "“Do you take card? — No.”"),
      body: t(lang, "Kartat procesohen nga RaiAccept i Raiffeisen — të dhënat e kartës s'i sheh askush, as ti. Kesh në dorëzim gjithashtu. Çdo monedhë.", "Cards are processed by Raiffeisen's RaiAccept — nobody sees the card details, not even you. Cash on delivery too. Any currency."),
      points: [t(lang, "RaiAccept (Raiffeisen)", "RaiAccept (Raiffeisen)"), t(lang, "Kesh në dorëzim", "Cash on delivery"), t(lang, "Lekë, Euro, Dollarë…", "Lek, Euro, Dollars…")],
    },
    {
      Icon: Store,
      name: t(lang, "Dyqani", "The Storefront"),
      pain: t(lang, "“Një link në bio s'është dyqan.”", "“A link in bio is not a store.”"),
      body: t(lang, "Vitrinë e vërtetë me kategori, filtra, specifikime e variante — me dizajnin tënd nga Storefront Studio, shqip dhe anglisht, ditë e natë.", "A real storefront with categories, filters, specs and variants — in your design from Storefront Studio, Albanian and English, light and dark."),
      points: [t(lang, "Dizajni yt, pamje live", "Your design, live preview"), t(lang, "Filtra & kërkim i vërtetë", "Real filters & search"), t(lang, "SQ / EN · ditë / natë", "SQ / EN · light / dark")],
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
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map(({ Icon, name, pain, body, points }, i) => (
            <div
              key={i}
              className="reveal group flex min-w-0 flex-col rounded-2xl border border-border bg-card/70 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-30px_rgba(163,18,52,0.35)]"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="brand-gradient grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-semibold">{name}</span>
              </div>
              <p className="text-lg font-semibold leading-snug tracking-tight">{pain}</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
                {points.map((pt, k) => (
                  <li key={k} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
