/** Bilingual landing copy. Albanian (sq) is the primary market language. */

export interface LandingCopy {
  nav: { how: string; features: string; studio: string; pricing: string; faq: string; login: string; cta: string };
  hero: {
    badge: string; h1a: string; h1b: string; h1c: string; sub: string;
    ctaPrimary: string; ctaSecondary: string; risk: string; circular: string;
    dm: { ask: string; reply: string; linkTitle: string; linkSub: string };
  };
  interest: {
    badge: string; title: string; sub: string; name: string; message: string;
    placeholder: string; send: string; quick: string; or: string;
  };
  screen: {
    shop: string; banner1: string; banner2: string; addToCart: string;
    products: { name: string; cat: string; price: string }[];
    orderTitle: string; orderBody: string; today: string;
  };
  marquee: { title: string; cats: string[] };
  stats: { suffix: string; label: string; value?: string }[];
  problem: { title: string; items: string[] };
  solution: { title: string; items: string[] };
  how: { badge: string; title: string; sub: string; step: string; steps: { title: string; body: string }[] };
  journey: {
    badge: string; title: string; sub: string; divider: string;
    phases: string[]; // 4 phase labels
    steps: { t: string; d: string; phase: number }[]; // 10 chapters
  };
  features: { badge: string; title: string; sub: string; items: { title: string; body: string }[] };
  studio: {
    badge: string; titleA: string; titleB: string; body: string; checklist: string[]; cta: string; demoShop: string;
  };
  pricing: {
    badge: string; title: string; sub: string; monthly: string; annual: string; save: string;
    perMonth: string; billedMonthly: string; billedYearly: (n: string) => string; popular: string; cta: string;
    plans: { id: string; name: string; blurb: string; features: string[] }[];
  };
  testimonials: { title: string; items: { name: string; role: string; quote: string }[] };
  faq: { title: string; items: { q: string; a: string }[] };
  cta: { title: string; sub: string; button: string };
  footer: { signup: string; tagline: string; product: string; account: string; made: string };
}

export const sq: LandingCopy = {
  nav: { how: "Si funksionon", features: "Veçoritë", studio: "Studio", pricing: "Çmimet", faq: "Pyetje", login: "Hyr", cta: "Nis provën falas" },
  hero: {
    badge: "Ndërtuar për shitësit e Instagramit në Shqipëri",
    h1a: "Ktheje Instagramin tënd",
    h1b: "në një dyqan të vërtetë",
    h1c: "brenda minutash.",
    sub: "AI i kthen postimet e tua në dyqan të vërtetë — produkte, pagesa, porosi. Pa kod.",
    ctaPrimary: "Nis provën falas 7-ditore",
    ctaSecondary: "Shiko një demo live",
    risk: "Anulo kurdo para ditës së 7-të · Pa rrezik",
    circular: "INSTANTSHOP • DYQANI YT ONLINE • ",
    dm: {
      ask: "Sa kushton fustani? 🙏",
      reply: "Porosite direkt këtu 👇",
      linkTitle: "Butiku i Elirës",
      linkSub: "instantshop.al/butiku-i-eliras",
    },
  },
  interest: {
    badge: "Kontakt",
    title: "I interesuar? Na shkruaj",
    sub: "Dërgo interesimin tënd me një klik, ose na shkruaj një mesazh — të kthehemi brenda ditës.",
    name: "Emri yt",
    message: "Mesazhi",
    placeholder: "Përshëndetje! Jam i interesuar për InstantShop për dyqanin tim në Instagram…",
    send: "Dërgo mesazhin",
    quick: "Shpreh interes me një klik",
    or: "ose",
  },
  screen: {
    shop: "Butiku i Elirës",
    banner1: "Koleksioni i verës ☀️",
    banner2: "Deri në -30% te fustanet",
    addToCart: "Shto në shportë",
    products: [
      { name: "Fustan liri", cat: "Fustane", price: "3,500 ALL" },
      { name: "Shall mëndafshi", cat: "Aksesorë", price: "1,200 ALL" },
      { name: "Çantë kashte", cat: "Çanta", price: "2,800 ALL" },
      { name: "Vathë ari", cat: "Bizhuteri", price: "990 ALL" },
    ],
    orderTitle: "Porosi e re 🎉",
    orderBody: "+3,500 ALL · Fustan liri",
    today: "Sot",
  },
  marquee: {
    title: "I përshtatshëm për çdo lloj dyqani",
    cats: ["Modë", "Bukuri", "Bizhuteri", "Atlete", "Shtëpi", "Punime dore", "Aksesorë", "Ushqim", "Art", "Fëmijë", "Fitnes", "Vintage"],
  },
  stats: [
    { suffix: " min", label: "Nga postimi te produkti" },
    { suffix: " hapa", label: "Për t'u aktivizuar" },
    { suffix: " kod", label: "Rreshta për të shkruar" },
    { suffix: "", label: "Dyqani gjithmonë hapur", value: "24/7" },
  ],
  problem: {
    title: "Sot",
    items: [
      "DM pa fund: \"sa kushton?\"",
      "Porosi nëpër screenshot-e",
      "Pa pagesa me kartë",
      "Shitje të humbura natën",
    ],
  },
  solution: {
    title: "Me InstantShop",
    items: [
      "Klientët porosisin vetë",
      "Gjithçka në një panel",
      "Pagesa me kartë, në Lekë",
      "Dyqani shet 24/7",
    ],
  },
  how: {
    badge: "Si funksionon",
    title: "Aktiv në tre hapa të thjeshtë",
    sub: "Asnjë dyqan për të ndërtuar, asnjë temë për të luftuar. Lidhu dhe vazhdo.",
    step: "HAPI",
    steps: [
      { title: "Lidh Instagramin", body: "Lidh llogarinë tënde Instagram Business me një prekje. Pa kod, pa dyqan për të ndërtuar." },
      { title: "AI ndërton produktet", body: "Gemini lexon postimet dhe përshkrimet e tua dhe i kthen në produkte — emra, çmime, kategori dhe variante, të plotësuara për ty." },
      { title: "Ndaj linkun e dyqanit", body: "Publiko një vitrinë të bukur dhe nis të marrësh porosi e pagesa me kartë që të njëjtën ditë." },
    ],
  },
  journey: {
    badge: "Udhëtimi i plotë",
    title: "Nga postimi te porosia e përmbushur",
    sub: "Shiko procesin e plotë — ashtu siç ndodh vërtet në aplikacion.",
    divider: "NGA POSTIMI · TE PAGESA · ",
    phases: ["Lidhja", "Lansimi", "Klienti", "Porosia"],
    steps: [
      { t: "Postimet e tua në Instagram", d: "Gjithçka nis me katalogun që ke ndërtuar tashmë — postimet e tua.", phase: 0 },
      { t: "Hyr në InstantShop", d: "Krijo llogarinë dhe lidh Instagram Business me një klik.", phase: 0 },
      { t: "Sinkronizo produktet", d: "AI lexon çdo postim dhe nxjerr emrin, çmimin dhe kategorinë.", phase: 0 },
      { t: "Produktet gati në panel", d: "Katalogu yt shfaqet i plotë në panelin e administrimit.", phase: 1 },
      { t: "Vitrina live", d: "Dyqani publikohet në linkun tënd — gati për klientë.", phase: 1 },
      { t: "Klienti gjen produktin", d: "Vizitorët shfletojnë dhe kërkojnë direkt në vitrinë.", phase: 2 },
      { t: "Shton në shportë", d: "Zgjedh variantin dhe e shton në shportë — pa asnjë DM.", phase: 2 },
      { t: "Paguan online ose në dorëzim", d: "Me kartë përmes Raiffeisen (RaiAccept) ose para në dorë.", phase: 2 },
      { t: "Porosia mbërrin në panel", d: "Njoftim në çast — porosia me të gjitha detajet.", phase: 3 },
      { t: "Përmbushe me një klik", d: "Ndrysho statusin dhe klienti njoftohet. Kaq.", phase: 3 },
    ],
  },
  features: {
    badge: "Veçoritë",
    title: "Gjithçka për të drejtuar dyqanin",
    sub: "Një mjet i vetëm zëvendëson Excel-in, DM-të dhe hamendjet.",
    items: [
      { title: "Analizë me AI", body: "Çdo postim bëhet produkt — emri, çmimi, kategoria." },
      { title: "Storefront Studio", body: "Dizajno vitrinën tënde, me pamje live." },
      { title: "Inventar & variante", body: "Stoku rezervohet vetë. S'shet kurrë tepër." },
      { title: "Pagesa me kartë në Lekë", body: "Raiffeisen (RaiAccept) ose para në dorë." },
      { title: "Menaxhim porosish", body: "Nga krijimi te dorëzimi, në një vend." },
      { title: "Analitikë & oferta", body: "Shiko çfarë shitet. Bëj oferta që konvertojnë." },
    ],
  },
  studio: {
    badge: "Storefront Studio",
    titleA: "Një vitrinë që duket si",
    titleB: "marka jote",
    body: "Ngjyra, fonte, struktura, seksione — gjithçka me pamje live, pa kod.",
    checklist: ["8 tema gati për përdorim", "Palete ngjyrash & fontesh", "Faqe kryesore me tërhiq-e-lësho", "Pamje live ndërsa redakton", "Modalitet i çelët & i errët", "Perfekte në celular"],
    cta: "Dizajno dyqanin tënd",
    demoShop: "Dyqani im",
  },
  pricing: {
    badge: "Çmimet",
    title: "Çmime të thjeshta, në Lekë",
    sub: "Nis me provë falas 7-ditore. Anulo kurdo para se të mbarojë.",
    monthly: "Mujore",
    annual: "Vjetore",
    save: "2 muaj falas me faturim vjetor",
    perMonth: "ALL / muaj",
    billedMonthly: "Faturim mujor",
    billedYearly: (n) => `Faturohet ${n} ALL në vit`,
    popular: "Më i zgjedhuri",
    cta: "Nis provën falas",
    plans: [
      { id: "starter", name: "Starter", blurb: "Nxirr dyqanin e parë online.", features: ["Vitrinë Instagram", "Deri në 50 produkte", "Porosi me para në dorë", "Analitikë bazë", "1 vitrinë"] },
      { id: "pro", name: "Pro", blurb: "Gjithçka për të shitur seriozisht.", features: ["Produkte pa limit", "Storefront Studio (dizajn i personalizuar)", "Pagesa online me kartë", "Promocione & oferta", "Vlerësime produktesh", "Analitikë e plotë"] },
      { id: "business", name: "Business", blurb: "Për dyqane në rritje, me volum të lartë.", features: ["Gjithçka e Pro-s", "Suport me përparësi", "Analitikë e avancuar", "Limite më të larta të AI sync", "Shumë përdorues (së shpejti)"] },
    ],
  },
  testimonials: {
    title: "I besuar nga shitësit shqiptarë",
    items: [
      { name: "Elira K.", role: "Pronare butiku, Tiranë", quote: "Më parë u përgjigjesha DM-ve gjithë ditën. Tani klientët porosisin direkt nga linku i dyqanit. U shlye brenda një jave." },
      { name: "Andi M.", role: "Rishitës atletesh, Durrës", quote: "AI ndërtoi gjithë katalogun tim nga postimet brenda minutash. Nuk e besoja sa shpejt isha live." },
      { name: "Sara D.", role: "Bizhuteri artizanale", quote: "Dyqani im më në fund duket profesional. Storefront Studio e bëri të ndihet si marka ime." },
    ],
  },
  faq: {
    title: "Pyetjet, të përgjigjura",
    items: [
      { q: "Si funksionon prova falas 7-ditore?", a: "Ke akses të plotë në planin Pro për 7 ditë. Kartën ta kërkojmë në regjistrim dhe tarifohesh vetëm kur mbaron prova — anulo kurdo më parë dhe nuk paguan asgjë." },
      { q: "Më duhet faqe interneti apo njohuri kodimi?", a: "Jo. InstantShop i kthen postimet e tua të Instagramit automatikisht në një vitrinë online. Ti thjesht lidh llogarinë dhe ndan linkun e dyqanit." },
      { q: "Si paguajnë klientët?", a: "Mund të pranosh pagesa të sigurta me kartë përmes Raiffeisen Bank Albania (RaiAccept) dhe/ose para në dorë. Çmimet shfaqen në Lekë." },
      { q: "A mund ta personalizoj pamjen e dyqanit?", a: "Po — Storefront Studio të lejon të kontrollosh ngjyrat, fontet, strukturën, seksionet dhe kartat e produkteve me pamje live, ose nis nga një prej shablloneve tona." },
      { q: "Çfarë ndodh me postimet e mia në Instagram?", a: "Asgjë nuk ndryshon në Instagram. Ne lexojmë postimet e tua publike për të ndërtuar produktet në panelin tënd; ti vendos çfarë publikohet." },
      { q: "A mund të anuloj kurdo?", a: "Absolutisht. Anulo ose ndrysho planin kurdo që të duash nga cilësimet e faturimit." },
    ],
  },
  cta: {
    title: "Dyqani yt mund të jetë live që sot",
    sub: "Nis provën falas — zgjat vetëm pak minuta.",
    button: "Nis provën falas 7-ditore",
  },
  footer: {
    signup: "Regjistrohu",
    tagline: "Ktheje Instagramin tënd në një dyqan të vërtetë.",
    product: "Produkti",
    account: "Llogaria",
    made: "Bërë me ♥ për shitësit shqiptarë",
  },
};

export const en: LandingCopy = {
  nav: { how: "How it works", features: "Features", studio: "Studio", pricing: "Pricing", faq: "FAQ", login: "Log in", cta: "Start free trial" },
  hero: {
    badge: "Built for Instagram sellers in Albania",
    h1a: "Turn your Instagram",
    h1b: "into a real store",
    h1c: "in minutes.",
    sub: "AI turns your posts into a real store — products, payments, orders. No code.",
    ctaPrimary: "Start your 7-day free trial",
    ctaSecondary: "See a live demo",
    risk: "Cancel anytime before day 7 · No risk",
    circular: "INSTANTSHOP • YOUR SHOP ONLINE • ",
    dm: {
      ask: "How much is the dress? 🙏",
      reply: "Order it right here 👇",
      linkTitle: "Elira's Boutique",
      linkSub: "instantshop.al/butiku-i-eliras",
    },
  },
  interest: {
    badge: "Contact",
    title: "Interested? Write to us",
    sub: "Send your interest with one click, or write us a message — we reply within the day.",
    name: "Your name",
    message: "Message",
    placeholder: "Hi! I'm interested in InstantShop for my Instagram shop…",
    send: "Send message",
    quick: "Express interest in one click",
    or: "or",
  },
  screen: {
    shop: "Elira's Boutique",
    banner1: "Summer collection ☀️",
    banner2: "Up to 30% off dresses",
    addToCart: "Add to cart",
    products: [
      { name: "Linen Dress", cat: "Dresses", price: "3,500 ALL" },
      { name: "Silk Scarf", cat: "Accessories", price: "1,200 ALL" },
      { name: "Straw Bag", cat: "Bags", price: "2,800 ALL" },
      { name: "Gold Hoops", cat: "Jewelry", price: "990 ALL" },
    ],
    orderTitle: "New order 🎉",
    orderBody: "+3,500 ALL · Linen Dress",
    today: "Today",
  },
  marquee: {
    title: "Perfect for every kind of shop",
    cats: ["Fashion", "Beauty", "Jewelry", "Sneakers", "Home", "Handmade", "Accessories", "Food", "Art", "Kids", "Fitness", "Vintage"],
  },
  stats: [
    { suffix: " min", label: "From post to product" },
    { suffix: " steps", label: "To go live" },
    { suffix: " code", label: "Lines to write" },
    { suffix: "", label: "Shop always open", value: "24/7" },
  ],
  problem: {
    title: "Today",
    items: [
      "Endless \"how much?\" DMs",
      "Orders in screenshots",
      "No card payments",
      "Lost sales overnight",
    ],
  },
  solution: {
    title: "With InstantShop",
    items: [
      "Customers order themselves",
      "Everything in one panel",
      "Card payments, in Lek",
      "Your shop sells 24/7",
    ],
  },
  how: {
    badge: "How it works",
    title: "Live in three simple steps",
    sub: "No store to build, no theme to fight. Connect and go.",
    step: "STEP",
    steps: [
      { title: "Connect Instagram", body: "Link your Instagram Business account in one tap. No coding, no store to build." },
      { title: "AI builds your products", body: "Gemini reads your posts and captions and turns them into products — names, prices, categories and variants, filled in for you." },
      { title: "Share your shop link", body: "Publish a beautiful storefront and start taking orders and card payments the same day." },
    ],
  },
  journey: {
    badge: "The full journey",
    title: "From post to fulfilled order",
    sub: "Watch the whole process — exactly as it happens in the app.",
    divider: "FROM POST · TO PAYMENT · ",
    phases: ["Connect", "Launch", "Customer", "Orders"],
    steps: [
      { t: "Your Instagram posts", d: "It all starts with the catalog you've already built — your posts.", phase: 0 },
      { t: "Log in to InstantShop", d: "Create your account and connect Instagram Business in one click.", phase: 0 },
      { t: "Sync your products", d: "AI reads every post and extracts the name, price and category.", phase: 0 },
      { t: "Products ready in the panel", d: "Your full catalog appears in the admin dashboard.", phase: 1 },
      { t: "Storefront goes live", d: "Your shop is published on your link — ready for customers.", phase: 1 },
      { t: "The customer finds a product", d: "Visitors browse and search right on your storefront.", phase: 2 },
      { t: "Adds it to the cart", d: "Picks a variant and adds it to the cart — no DMs needed.", phase: 2 },
      { t: "Pays online or on delivery", d: "By card via Raiffeisen (RaiAccept) or cash on delivery.", phase: 2 },
      { t: "The order lands in your panel", d: "Instant notification — the order with every detail.", phase: 3 },
      { t: "Fulfill it in one click", d: "Change the status and the customer is notified. That's it.", phase: 3 },
    ],
  },
  features: {
    badge: "Features",
    title: "Everything to run your shop",
    sub: "One tool replaces the spreadsheet, the DMs and the guesswork.",
    items: [
      { title: "AI analysis", body: "Every post becomes a product — name, price, category." },
      { title: "Storefront Studio", body: "Design your storefront, with live preview." },
      { title: "Inventory & variants", body: "Stock reserves itself. Never oversell." },
      { title: "Card payments in Lek", body: "Raiffeisen (RaiAccept) or cash on delivery." },
      { title: "Order management", body: "From placed to fulfilled, in one place." },
      { title: "Analytics & sales", body: "See what sells. Run offers that convert." },
    ],
  },
  studio: {
    badge: "Storefront Studio",
    titleA: "A storefront that looks like",
    titleB: "your brand",
    body: "Colors, fonts, layout, sections — all with a live preview, no code.",
    checklist: ["8 ready-made themes", "Custom color & font palettes", "Drag-to-build homepage", "Live preview as you edit", "Light & dark modes", "Mobile-perfect layouts"],
    cta: "Design your shop",
    demoShop: "My Shop",
  },
  pricing: {
    badge: "Pricing",
    title: "Simple pricing, in Lek",
    sub: "Start with a 7-day free trial. Cancel anytime before it ends.",
    monthly: "Monthly",
    annual: "Annual",
    save: "2 months free with annual billing",
    perMonth: "ALL / mo",
    billedMonthly: "Billed monthly",
    billedYearly: (n) => `Billed ${n} ALL yearly`,
    popular: "Most popular",
    cta: "Start free trial",
    plans: [
      { id: "starter", name: "Starter", blurb: "Get your first shop online.", features: ["Instagram storefront", "Up to 50 products", "Cash-on-delivery orders", "Basic analytics", "1 storefront"] },
      { id: "pro", name: "Pro", blurb: "Everything to sell seriously.", features: ["Unlimited products", "Storefront Studio (custom design)", "Online card payments", "Promotions & sales", "Product reviews", "Full analytics"] },
      { id: "business", name: "Business", blurb: "For growing, high-volume shops.", features: ["Everything in Pro", "Priority support", "Advanced analytics", "Higher AI sync limits", "Multi-user (coming soon)"] },
    ],
  },
  testimonials: {
    title: "Trusted by Albanian sellers",
    items: [
      { name: "Elira K.", role: "Boutique owner, Tiranë", quote: "I used to reply to DMs all day. Now customers just order from my shop link. It paid for itself in a week." },
      { name: "Andi M.", role: "Sneaker reseller, Durrës", quote: "The AI built my whole catalog from my posts in minutes. I couldn't believe how fast I was live." },
      { name: "Sara D.", role: "Handmade jewelry", quote: "My shop finally looks professional. Storefront Studio made it feel like my brand." },
    ],
  },
  faq: {
    title: "Questions, answered",
    items: [
      { q: "How does the 7-day free trial work?", a: "You get full Pro access for 7 days. We ask for a card at signup and you're only charged when the trial ends — cancel anytime before then and you won't pay anything." },
      { q: "Do I need a website or coding skills?", a: "No. InstantShop turns your Instagram posts into a hosted storefront automatically. You just connect your account and share your shop link." },
      { q: "How do customers pay?", a: "You can accept secure card payments through Raiffeisen Bank Albania (RaiAccept) and/or cash on delivery. Prices are shown in Albanian Lek." },
      { q: "Can I customize how my shop looks?", a: "Yes — Storefront Studio lets you control colors, fonts, layout, sections and product cards with a live preview, or start from one of our templates." },
      { q: "What happens to my Instagram posts?", a: "Nothing changes on Instagram. We read your public posts to build products in your dashboard; you decide what goes live." },
      { q: "Can I cancel anytime?", a: "Absolutely. Cancel or change your plan whenever you want from billing settings." },
    ],
  },
  cta: {
    title: "Your shop could be live today",
    sub: "Start your free trial — it takes minutes.",
    button: "Start your 7-day free trial",
  },
  footer: {
    signup: "Sign up",
    tagline: "Turn your Instagram into a real store.",
    product: "Product",
    account: "Account",
    made: "Made with ♥ for Instagram sellers",
  },
};
