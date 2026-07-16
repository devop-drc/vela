// Per-page guided tours (react-joyride), bilingual EN/SQ. Each admin route
// gets a detailed walkthrough: an intro step centered on the page, then
// anchored steps on [data-tour="…"] elements. Steps whose anchor isn't in the
// DOM are dropped at start time, so tours degrade gracefully.

import type { Step } from 'react-joyride';

export type TourLang = 'en' | 'sq';
type L = { en: string; sq: string };

export interface PageTour {
  /** Stable id — also the localStorage completion key. */
  key: string;
  steps: LocalizedStep[];
}

interface LocalizedStep {
  target: string;
  placement: Step['placement'];
  title: L;
  content: L;
}

const intro = (title: L, body: L): LocalizedStep => ({ target: 'body', placement: 'center', title, content: body });
const at = (selector: string, title: L, body: L, placement: Step['placement'] = 'auto'): LocalizedStep =>
  ({ target: `[data-tour="${selector}"]`, placement, title, content: body });

const TOURS: { match: (path: string) => boolean; tour: PageTour }[] = [
  {
    match: (p) => p === '/' || p === '/dashboard',
    tour: {
      key: 'dashboard',
      steps: [
        intro(
          { en: 'Welcome to your dashboard 👋', sq: 'Mirë se erdhe në panelin tënd 👋' },
          { en: 'This is your shop\'s home base. Every time you log in you land here and see, at a glance, how your shop is doing today: sales, orders, visitors and what\'s been happening. Let\'s take a quick walk through each part.', sq: 'Kjo është qendra e dyqanit tënd. Sa herë që hyn, sheh me një shikim si po ecën dyqani sot: shitjet, porositë, vizitorët dhe gjithçka që ka ndodhur. Le t\'i shohim pjesët një nga një.' }
        ),
        at('sidebar-nav',
          { en: 'Your navigation', sq: 'Menyja jote' },
          { en: 'Everything lives here: Products, Orders, Categories, Promotions, Keywords, Billing and Settings. The page you\'re on is highlighted. You can collapse this sidebar with the arrows at the top to get more room.', sq: 'Gjithçka gjendet këtu: Produktet, Porositë, Kategoritë, Promocionet, Fjalët kyçe, Faturimi dhe Cilësimet. Faqja ku ndodhesh është e theksuar. Mund ta mbyllësh menynë me shigjetat lart për më shumë hapësirë.' },
          'right'),
        at('stats',
          { en: 'Today\'s numbers', sq: 'Shifrat e sotme' },
          { en: 'These cards summarize your shop: revenue, orders, product count and views. They update automatically — no need to refresh. Click a card to jump to the related page.', sq: 'Këto karta përmbledhin dyqanin: të ardhurat, porositë, numrin e produkteve dhe shikimet. Përditësohen vetë — s\'ka nevojë të rifreskosh. Kliko një kartë për të shkuar te faqja përkatëse.' }),
        at('chart',
          { en: 'Sales over time', sq: 'Shitjet në kohë' },
          { en: 'This chart shows your revenue and order volume. Use the date-range and granularity controls in its corner to zoom from a single day out to a full year, and hover any point for exact numbers.', sq: 'Ky grafik tregon të ardhurat dhe volumin e porosive. Përdor filtrat e datave në cep për të parë nga një ditë deri në një vit të plotë; kalo miun mbi çdo pikë për shifrat e sakta.' }),
        at('quick-actions',
          { en: 'Quick actions', sq: 'Veprime të shpejta' },
          { en: 'Shortcuts for the things you do most: add a product, run an Instagram sync, create a promotion. One click instead of digging through menus.', sq: 'Shkurtore për gjërat që bën më shpesh: shto produkt, nis sinkronizim nga Instagrami, krijo promocion. Një klikim në vend të kërkimit nëpër meny.' }),
        at('activity',
          { en: 'Activity feed', sq: 'Aktiviteti i fundit' },
          { en: 'A live log of everything happening in your shop — new orders, stock changes, syncs. If something looks off, this is the first place to check.', sq: 'Regjistër i drejtpërdrejtë i gjithçkaje që ndodh në dyqan — porosi të reja, ndryshime stoku, sinkronizime. Nëse diçka duket e çuditshme, kontrollo së pari këtu.' }),
        at('header-actions',
          { en: 'Sync and notifications', sq: 'Sinkronizimi dhe njoftimet' },
          { en: 'From here you can run an Instagram sync (pulls your latest posts and turns them into products with AI), open notifications, and manage your account. The sync status widget shows progress live.', sq: 'Nga këtu nis sinkronizimin me Instagram (merr postimet e fundit dhe i kthen në produkte me AI), hap njoftimet dhe menaxhon llogarinë. Statusi i sinkronizimit shfaqet drejtpërdrejt.' },
          'bottom'),
        intro(
          { en: 'That\'s the dashboard!', sq: 'Ky ishte paneli!' },
          { en: 'You can replay this tour any time — press the "Page tutorial" button at the bottom of the sidebar on any page. Each page has its own walkthrough.', sq: 'Mund ta rinisësh këtë udhëzues kurdo — shtyp butonin "Tutorial i faqes" në fund të menysë, në çdo faqe. Secila faqe ka udhëzuesin e vet.' }
        ),
      ],
    },
  },
  {
    match: (p) => p.startsWith('/products'),
    tour: {
      key: 'products',
      steps: [
        intro(
          { en: 'Products', sq: 'Produktet' },
          { en: 'This is where all your products live — both the ones AI created from your Instagram posts and any you add by hand. From here you publish, edit, price, stock and organize everything you sell.', sq: 'Këtu jetojnë të gjitha produktet — si ato që AI i krijoi nga postimet e Instagramit, ashtu edhe ato që shton vetë. Nga këtu publikon, redakton, vendos çmime, stok dhe organizon gjithçka që shet.' }
        ),
        at('products-toolbar',
          { en: 'Search and filters', sq: 'Kërkimi dhe filtrat' },
          { en: 'Find any product instantly: search by name, filter by status (Active, Draft, Out of Stock), category, or price. Drafts are products the AI created from Instagram that are waiting for your review — they are NOT visible to customers until you publish them.', sq: 'Gjej çdo produkt në çast: kërko me emër, filtro sipas statusit (Aktiv, Draft, Pa stok), kategorisë ose çmimit. Draftet janë produkte që AI i krijoi nga Instagrami dhe presin miratimin tënd — klientët NUK i shohin derisa t\'i publikosh.' }),
        at('add-product',
          { en: 'Add a product manually', sq: 'Shto produkt manualisht' },
          { en: 'Not everything has to come from Instagram. Click here to create a product from scratch: photos, price, variants, inventory — the full editor.', sq: 'Jo gjithçka duhet të vijë nga Instagrami. Kliko këtu për të krijuar produkt nga e para: foto, çmim, variante, inventar — redaktori i plotë.' },
          'bottom'),
        at('products-table',
          { en: 'Your product list', sq: 'Lista e produkteve' },
          { en: 'Click any product to open its full editor: change photos, price, description, options like color and size, and stock. Use the checkboxes to select several products and act on all of them at once — publish, change category, or delete. Deleting a product removes its media and data, but your order history is always kept.', sq: 'Kliko çdo produkt për ta hapur në redaktorin e plotë: ndrysho fotot, çmimin, përshkrimin, opsionet si ngjyra e masa, dhe stokun. Me kutizat zgjedh disa produkte njëherësh — publiko, ndrysho kategori ose fshi. Fshirja e një produkti heq media dhe të dhënat e tij, por historia e porosive ruhet gjithmonë.' }),
        intro(
          { en: 'Tip: review your drafts', sq: 'Këshillë: shiko draftet' },
          { en: 'After an Instagram sync, new products arrive as Drafts. Review the AI\'s name and price, fix anything, then set them Active — only then do customers see them in your storefront.', sq: 'Pas një sinkronizimi, produktet e reja vijnë si Drafte. Kontrollo emrin dhe çmimin që nxori AI, rregullo çfarë duhet, pastaj bëji Aktive — vetëm atëherë klientët i shohin në dyqan.' }
        ),
      ],
    },
  },
  {
    match: (p) => p.startsWith('/orders'),
    tour: {
      key: 'orders',
      steps: [
        intro(
          { en: 'Orders', sq: 'Porositë' },
          { en: 'Every purchase from your storefront lands here. You\'ll see who ordered, what, for how much, and where it needs to go. Orders move through statuses: Pending → Confirmed → Shipped → Delivered (or Cancelled).', sq: 'Çdo blerje nga dyqani mbërrin këtu. Sheh kush porositi, çfarë, për sa, dhe ku duhet dërguar. Porositë kalojnë nëpër statuse: Në pritje → Konfirmuar → Dërguar → Dorëzuar (ose Anuluar).' }
        ),
        at('orders-filters',
          { en: 'Filter by status', sq: 'Filtro sipas statusit' },
          { en: 'Use these to focus on what needs attention — new Pending orders first. The counts show how many orders are in each state.', sq: 'Përdori këto për t\'u fokusuar te ajo që kërkon vëmendje — porositë e reja Në pritje së pari. Numrat tregojnë sa porosi ka në secilin status.' }),
        at('orders-list',
          { en: 'Order details', sq: 'Detajet e porosisë' },
          { en: 'Click an order to see the full picture: items, quantities, customer contact info and delivery address. Update its status as you process it — cancelling an order automatically returns its items to stock.', sq: 'Kliko një porosi për pamjen e plotë: artikujt, sasitë, kontaktet e klientit dhe adresën e dorëzimit. Përditëso statusin ndërsa e përpunon — anulimi i kthen artikujt automatikisht në stok.' }),
        intro(
          { en: 'Stay on top of new orders', sq: 'Mos humb asnjë porosi' },
          { en: 'New orders also appear in your notifications and activity feed the moment they come in, so keep an eye on the bell icon in the header.', sq: 'Porositë e reja shfaqen edhe te njoftimet dhe aktiviteti sapo mbërrijnë — mbaj një sy te zilja në krye të faqes.' }
        ),
      ],
    },
  },
  {
    match: (p) => p.startsWith('/keywords'),
    tour: {
      key: 'keywords',
      steps: [
        intro(
          { en: 'Keywords — teach the AI your language', sq: 'Fjalët kyçe — mësoji AI-së gjuhën tënde' },
          { en: 'When the AI reads your Instagram captions, keywords tell it what to look for. If your captions say "çmimi" before the price or use specific product words, add them here and the AI will extract names, prices and categories much more accurately.', sq: 'Kur AI lexon përshkrimet e postimeve, fjalët kyçe i tregojnë çfarë të kërkojë. Nëse në përshkrime shkruan "çmimi" para vlerës ose përdor fjalë specifike produktesh, shtoji këtu dhe AI do të nxjerrë emrat, çmimet dhe kategoritë shumë më saktë.' }
        ),
        at('keywords-add',
          { en: 'Add a keyword', sq: 'Shto fjalë kyçe' },
          { en: 'Type a word or phrase that appears in your captions and what it means (price marker, category hint, size…). The next sync uses it immediately.', sq: 'Shkruaj një fjalë a frazë që shfaqet në përshkrimet e tua dhe çfarë do të thotë (tregues çmimi, kategori, masë…). Sinkronizimi i radhës e përdor menjëherë.' }),
        at('keywords-table',
          { en: 'Your keyword list', sq: 'Lista e fjalëve kyçe' },
          { en: 'Everything the AI currently knows. Edit or remove entries any time — bad keywords are worse than none, so keep this list clean.', sq: 'Gjithçka që AI di aktualisht. Redakto ose fshi kur të duash — fjalët kyçe të gabuara janë më keq se asnjë, prandaj mbaje listën të pastër.' }),
      ],
    },
  },
  {
    match: (p) => p.startsWith('/categories'),
    tour: {
      key: 'categories',
      steps: [
        intro(
          { en: 'Categories', sq: 'Kategoritë' },
          { en: 'Categories organize your storefront: customers browse and filter by them, and the AI assigns each new product to one automatically. Well-named categories make your shop much easier to shop in.', sq: 'Kategoritë organizojnë dyqanin: klientët shfletojnë dhe filtrojnë sipas tyre, dhe AI ia cakton secilit produkt të ri një kategori automatikisht. Kategoritë me emra të qartë e bëjnë dyqanin shumë më të lehtë për blerje.' }
        ),
        at('categories-add',
          { en: 'Create a category', sq: 'Krijo kategori' },
          { en: 'Add categories that match how customers think about your products (e.g. "Dresses", "Sneakers", "Accessories"). You can also add product types inside each category for finer filtering.', sq: 'Shto kategori ashtu siç mendojnë klientët për produktet (p.sh. "Fustane", "Atlete", "Aksesorë"). Brenda secilës kategori mund të shtosh edhe tipe produktesh për filtrim më të imët.' },
          'bottom'),
        at('categories-grid',
          { en: 'Manage existing ones', sq: 'Menaxho ekzistueset' },
          { en: 'Each card shows how many products a category holds. Click to rename, re-assign products, or delete — products from a deleted category simply become uncategorized, nothing is lost.', sq: 'Secila kartë tregon sa produkte ka kategoria. Kliko për të riemërtuar, rikategorizuar produktet ose fshirë — produktet e një kategorie të fshirë thjesht mbeten pa kategori, asgjë nuk humbet.' }),
      ],
    },
  },
  {
    match: (p) => p.startsWith('/promotions'),
    tour: {
      key: 'promotions',
      steps: [
        intro(
          { en: 'Promotions', sq: 'Promocionet' },
          { en: 'Run sales without touching each product: create a promotion, choose which products it covers, set the discount and dates — prices update on your storefront automatically, with the old price shown crossed out.', sq: 'Bëj oferta pa prekur çdo produkt: krijo një promocion, zgjidh cilat produkte mbulon, cakto zbritjen dhe datat — çmimet përditësohen automatikisht në dyqan, me çmimin e vjetër të shfaqur të vijëzuar.' }
        ),
        at('promotions-create',
          { en: 'Create a promotion', sq: 'Krijo promocion' },
          { en: 'Pick a name customers will see ("Summer Sale"), a percentage or fixed discount, the products or categories it applies to, and when it starts and ends. It activates and expires on its own.', sq: 'Zgjidh një emër që klientët do ta shohin ("Oferta e Verës"), zbritje në përqindje ose vlerë fikse, produktet a kategoritë ku zbatohet, dhe kur nis e mbaron. Aktivizohet dhe skadon vetë.' },
          'bottom'),
        at('promotions-list',
          { en: 'Active and scheduled', sq: 'Aktive dhe të planifikuara' },
          { en: 'All your promotions in one place. You can pause, edit or end any of them early — storefront prices react immediately.', sq: 'Të gjitha promocionet në një vend. Mund t\'i ndalosh, redaktosh ose mbyllësh para kohe — çmimet në dyqan reagojnë menjëherë.' }),
      ],
    },
  },
  {
    match: (p) => p.startsWith('/billing'),
    tour: {
      key: 'billing',
      steps: [
        intro(
          { en: 'Billing', sq: 'Faturimi' },
          { en: 'Your Vela subscription lives here: current plan, trial status, payment method and invoices.', sq: 'Abonimi yt në Vela jeton këtu: plani aktual, statusi i provës falas, mënyra e pagesës dhe faturat.' }
        ),
        at('billing-plan',
          { en: 'Your plan', sq: 'Plani yt' },
          { en: 'See what your plan includes and upgrade or cancel any time. During your free trial everything is unlocked — you\'ll be reminded before it ends.', sq: 'Shiko çfarë përfshin plani dhe përmirësoje ose anuloje kurdo. Gjatë provës falas gjithçka është e hapur — do të njoftohesh para se të mbarojë.' }),
      ],
    },
  },
  {
    match: (p) => p.startsWith('/settings'),
    tour: {
      key: 'settings',
      steps: [
        intro(
          { en: 'Settings', sq: 'Cilësimet' },
          { en: 'Three tabs live here: Account (your profile and Instagram connection), Shop (business details — name, logo, currency, shipping), and Appearance (how this dashboard looks). Your storefront\'s design now has its own Storefront Studio in the sidebar.', sq: 'Këtu ka tri skeda: Llogaria (profili yt dhe lidhja me Instagram), Dyqani (të dhënat e biznesit — emri, logoja, monedha, transporti), dhe Pamja (si duket ky panel). Dizajni i dyqanit tani ka Studion e vet të Dyqanit në menynë anësore.' }
        ),
        at('settings-tabs',
          { en: 'The three tabs', sq: 'Tri skedat' },
          { en: 'Account for your profile & Instagram, Shop for business details, Appearance for how this dashboard looks. Changes save automatically as you make them.', sq: 'Llogaria për profilin & Instagram, Dyqani për të dhënat e biznesit, Pamja për mënyrën si duket paneli. Ndryshimet ruhen automatikisht ndërsa i bën.' },
          'bottom'),
      ],
    },
  },
  {
    match: (p) => p.startsWith('/storefront-studio'),
    tour: {
      key: 'storefront',
      steps: [
        intro(
          { en: 'Storefront Studio', sq: 'Studio e Dyqanit' },
          { en: 'This is where you design your public shop — pick a template, then fine-tune colors, fonts, layout and sections. Everything updates in the live preview.', sq: 'Këtu dizajnon dyqanin tënd publik — zgjidh një template, pastaj rregullo ngjyrat, shkronjat, faqosjen dhe seksionet. Gjithçka përditësohet në pamjen paraprake të drejtpërdrejtë.' }
        ),
        at('studio-templates',
          { en: 'Templates', sq: 'Template-t' },
          { en: 'Start from a professionally designed template — each one restyles your whole storefront: colors, fonts, layout, animations. The rail scrolls on its own; drag it to browse, click one to apply. You can then customize every detail.', sq: 'Nis nga një template i dizajnuar profesionalisht — secili ristilon gjithë dyqanin: ngjyrat, shkronjat, faqosjen, animacionet. Shiriti lëviz vetë; tërhiqe për të shfletuar, kliko një për ta zbatuar. Pastaj personalizon çdo detaj.' },
          'left'),
        at('studio-options',
          { en: 'Design tools', sq: 'Veglat e dizajnit' },
          { en: 'Everything is grouped: General (colors, fonts, shape, effects) and one section per page — Homepage, Shop page, Product page. Toggle sections on/off, drag to reorder them, and use the search box to find any setting instantly.', sq: 'Gjithçka e grupuar: Të përgjithshme (ngjyra, shkronja, forma, efekte) dhe një seksion për çdo faqe — Kryefaqja, Faqja e dyqanit, Faqja e produktit. Ndiz/fik seksionet, tërhiqi për t\'i renditur, dhe përdor kërkimin për të gjetur çdo cilësim në çast.' },
          'right'),
        at('studio-preview',
          { en: 'Live preview', sq: 'Pamja paraprake' },
          { en: 'Every change appears here instantly — no saving, no reloading. Switch between desktop and mobile, and when you change a page-specific setting the preview navigates there automatically so you can see the result.', sq: 'Çdo ndryshim shfaqet këtu në çast — pa ruajtje, pa rifreskim. Kalo mes desktopit dhe celularit; kur ndryshon një cilësim faqeje, pamja lundron vetë atje që ta shohësh rezultatin.' },
          'left'),
        intro(
          { en: 'Make it yours', sq: 'Bëje tëndin' },
          { en: 'Try a template, then adjust colors and fonts to match your brand. Use "Save design" in the toolbar to keep versions you like, and undo/redo if you change your mind.', sq: 'Provo një template, pastaj përshtat ngjyrat dhe shkronjat me markën tënde. Përdor "Ruaj dizajnin" për versionet që të pëlqejnë, dhe zhbëj/ribëj nëse ndërron mendje.' }
        ),
      ],
    },
  },
];

/** Resolve a page's tour into concrete Joyride steps in the given language. */
export function tourForPath(path: string, lang: TourLang): { key: string; steps: Step[] } | null {
  const found = TOURS.find((t) => t.match(path))?.tour;
  if (!found) return null;
  return {
    key: found.key,
    steps: found.steps.map((s) => ({
      target: s.target,
      placement: s.placement,
      disableBeacon: true,
      title: s.title[lang],
      content: s.content[lang],
    })),
  };
}
