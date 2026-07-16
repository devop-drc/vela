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
    saveMonths: (n: number) => string;
    perMonth: string; billedMonthly: string; billedYearly: (n: string) => string; popular: string; cta: string;
    freeLabel: string; freeForever: string; freeCta: string; trialCta: string; trialNote: string; reassure: string;
    plans: { id: string; name: string; blurb: string; features: string[] }[];
  };
  testimonials: { title: string; items: { name: string; role: string; quote: string }[] };
  faq: { title: string; items: { q: string; a: string }[] };
  cta: { title: string; sub: string; button: string };
  footer: { signup: string; tagline: string; product: string; account: string; made: string };
}

export const sq: LandingCopy = {
  nav: { how: "Si funksionon", features: "Veçoritë", studio: "Studio", pricing: "Çmimet", faq: "Pyetje", login: "Hyr", cta: "Provo falas" },
  hero: {
    badge: "Për shitësit shqiptarë",
    h1a: "Kthe Instagramin",
    h1b: "në dyqan online",
    h1c: "brenda pak minutash.",
    sub: "AI i kthen postimet e tua në dyqan të vërtetë. Pa kod. Ti menaxhon gjithçka nga një panel.",
    ctaPrimary: "Fillo falas",
    ctaSecondary: "Shiko demo live",
    risk: "Pa kartë krediti · 2 minuta",
    circular: "VELA • DYQANI YT ONLINE • ",
    dm: {
      ask: "Sa kushton fustani? 🙏",
      reply: "Porosite direkt këtu 👇",
      linkTitle: "Shop Name",
      linkSub: "vela.al/butiku-i-eliras",
    },
  },
  interest: {
    badge: "Kontakt",
    title: "I interesuar? Na shkruaj",
    sub: "Një klik ose një mesazh — të kthehemi brenda ditës.",
    name: "Emri yt",
    message: "Mesazhi",
    placeholder: "Përshëndetje! Më intereson Vela për dyqanin tim…",
    send: "Dërgo",
    quick: "Shpreh interes me një klik",
    or: "ose",
  },
  screen: {
    shop: "Shop Name",
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
    title: "Për çdo lloj dyqani",
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
    title: "Me Vela",
    items: [
      "Klientët porosisin vetë",
      "Gjithçka në një panel",
      "Pagesa me kartë, në Lekë",
      "Dyqani shet 24/7",
    ],
  },
  how: {
    badge: "Si funksionon",
    title: "Aktiv në tre hapa",
    sub: "Pa ndërtuar dyqan, pa u marrë me tema. Lidhu dhe nis.",
    step: "HAPI",
    steps: [
      { title: "Lidh Instagramin", body: "Lidh Instagram Business me një prekje — pa kod." },
      { title: "AI ndërton produktet", body: "AI lexon postimet dhe krijon produktet — emra, çmime, variante." },
      { title: "Ndaj linkun e dyqanit", body: "Publiko vitrinën dhe merr porosi që sot." },
    ],
  },
  journey: {
    badge: "Udhëtimi i plotë",
    title: "Nga postimi te porosia",
    sub: "Krejt procesi, ashtu siç ndodh vërtet.",
    divider: "NGA POSTIMI · TE PAGESA · ",
    phases: ["Lidhja", "Lansimi", "Klienti", "Porosia"],
    steps: [
      { t: "Postimet e Instagramit", d: "Gjithçka nis me postimet që ke tashmë.", phase: 0 },
      { t: "Hyr në Vela", d: "Krijo llogari dhe lidh Instagram me një klik.", phase: 0 },
      { t: "Sinkronizo produktet", d: "AI nxjerr emrin, çmimin dhe kategorinë.", phase: 0 },
      { t: "Produktet gati në panel", d: "Katalogu yt shfaqet i plotë në panel.", phase: 1 },
      { t: "Vitrina live", d: "Dyqani publikohet në linkun tënd.", phase: 1 },
      { t: "Klienti gjen produktin", d: "Vizitorët shfletojnë direkt në vitrinë.", phase: 2 },
      { t: "Shton në shportë", d: "Zgjedh variantin, pa asnjë DM.", phase: 2 },
      { t: "Paguan online ose në dorë", d: "Me kartë (RaiAccept) ose para në dorë.", phase: 2 },
      { t: "Porosia mbërrin në panel", d: "Njoftim në çast, me të gjitha detajet.", phase: 3 },
      { t: "Përmbushe me një klik", d: "Ndrysho statusin, klienti njoftohet. Kaq.", phase: 3 },
    ],
  },
  features: {
    badge: "Veçoritë",
    title: "Gjithçka për dyqanin tënd",
    sub: "Një mjet zëvendëson Excel-in, DM-të dhe hamendjet.",
    items: [
      { title: "Analizë me AI", body: "Çdo postim bëhet produkt — emri, çmimi, kategoria." },
      { title: "Storefront Studio", body: "Dizajno vitrinën tënde, me pamje live." },
      { title: "Inventar & variante", body: "Stoku rezervohet vetë. S'shet kurrë tepër." },
      { title: "Pagesa me kartë", body: "Raiffeisen (RaiAccept) ose para në dorë." },
      { title: "Menaxhim porosish", body: "Nga krijimi te dorëzimi, në një vend." },
      { title: "Analitikë & oferta", body: "Shiko çfarë shitet. Bëj oferta." },
    ],
  },
  studio: {
    badge: "Storefront Studio",
    titleA: "Një vitrinë që duket si",
    titleB: "marka jote",
    body: "Ngjyra, fonte, seksione — gjithçka me pamje live.",
    checklist: ["8 tema gati", "Palete ngjyrash & fontesh", "Faqe me tërhiq-e-lësho", "Pamje live ndërsa redakton", "Modalitet i çelët & errët", "Perfekte në celular"],
    cta: "Dizajno dyqanin tënd",
    demoShop: "Dyqani im",
  },
  pricing: {
    badge: "Çmimet",
    title: "Çmime të thjeshta, në Lekë",
    sub: "Çdo plan nis me 7 ditë provë falas — pa kartë.",
    monthly: "Mujore",
    annual: "Vjetore",
    save: "deri në 2 muaj falas",
    saveMonths: (n: number) => (n === 1 ? "1 muaj dhuratë" : `${n} muaj dhuratë`),
    perMonth: "ALL / muaj",
    billedMonthly: "Faturim mujor",
    billedYearly: (n) => `Faturohet ${n} ALL në vit`,
    popular: "Më i zgjedhuri",
    cta: "Provo falas",
    freeLabel: "Falas",
    freeForever: "Përgjithmonë falas · pa kartë",
    freeCta: "Fillo falas",
    trialCta: "Provo 7 ditë falas",
    trialNote: "7 ditë falas · pa kartë · anulo kurdo",
    reassure: "Regjistrohu për 2 minuta. Pas provës, zgjidh një plan që dyqani të mbetet online — produktet ruhen gjithmonë.",
    plans: [
      { id: "starter", name: "Starter", blurb: "Katalogu yt online, super i lirë.", features: ["Deri në 10 produkte", "Vitrinë Instagram me linkun tënd", "Vetëm para në dorë (COD)", "Analitikë bazë", "7 ditë provë falas"] },
      { id: "pro", name: "Pro", blurb: "Gjithçka për të shitur.", features: ["Deri në 100 produkte aktive", "Pagesa me kartë + para në dorë", "Analitikë e avancuar", "Promocione & oferta", "Vlerësime produktesh"] },
      { id: "business", name: "Business", blurb: "Për dyqane në rritje.", features: ["Gjithçka e Pro-s", "Mbështetje me përparësi", "Analitikë e plotë", "Limite më të larta AI", "Storefront Studio i plotë"] },
    ],
  },
  testimonials: {
    title: "I besuar nga shitësit shqiptarë",
    items: [
      { name: "Elira K.", role: "Pronare butiku, Tiranë", quote: "Më parë përgjigjesha DM-ve gjithë ditën. Tani klientët porosisin vetë nga linku. U shlye për një javë." },
      { name: "Andi M.", role: "Rishitës atletesh, Durrës", quote: "AI ndërtoi gjithë katalogun nga postimet për pak minuta. S'e besoja sa shpejt dola live." },
      { name: "Sara D.", role: "Bizhuteri artizanale", quote: "Dyqani më në fund duket profesional. Storefront Studio e bëri të ndihet si marka ime." },
    ],
  },
  faq: {
    title: "Pyetjet, të përgjigjura",
    items: [
      { q: "Si funksionon prova falas 7-ditore?", a: "Regjistrohu pa kartë dhe merr akses të plotë Pro për 7 ditë. Pas provës, zgjidh një plan — produktet ruhen gjithmonë." },
      { q: "Më duhet faqe interneti apo njohuri kodimi?", a: "Jo. Vela i kthen postimet në vitrinë automatikisht — ti vetëm lidh llogarinë dhe ndan linkun." },
      { q: "Si paguajnë klientët?", a: "Me kartë përmes Raiffeisen (RaiAccept) ose para në dorë. Çmimet shfaqen në Lekë." },
      { q: "A mund ta personalizoj pamjen e dyqanit?", a: "Po. Me Storefront Studio kontrollon ngjyrat, fontet dhe seksionet me pamje live, ose nis nga një shabllon." },
      { q: "Çfarë ndodh me postimet e mia në Instagram?", a: "Asgjë nuk ndryshon. Ne lexojmë postimet publike për të ndërtuar produktet — ti vendos çfarë publikohet." },
      { q: "A mund të anuloj kurdo?", a: "Absolutisht. Anulo ose ndrysho planin kurdo nga cilësimet e faturimit." },
    ],
  },
  cta: {
    title: "Çfarë po pret? Ngri velën!",
    sub: "Nga Instagram në e-commerce për pak minuta.",
    button: "Fillo falas",
  },
  footer: {
    signup: "Regjistrohu",
    tagline: "Instagrami yt, një dyqan i vërtetë.",
    product: "Produkti",
    account: "Llogaria",
    made: "Bërë me ♥ për shitësit shqiptarë",
  },
};

export const en: LandingCopy = {
  nav: { how: "How it works", features: "Features", studio: "Studio", pricing: "Pricing", faq: "FAQ", login: "Log in", cta: "Try free" },
  hero: {
    badge: "For Albanian sellers",
    h1a: "Turn your Instagram",
    h1b: "into an online store",
    h1c: "in minutes.",
    sub: "AI turns your posts into a real store. No code.",
    ctaPrimary: "Start free",
    ctaSecondary: "See live demo",
    risk: "No credit card · 2 minutes",
    circular: "VELA • YOUR SHOP ONLINE • ",
    dm: {
      ask: "How much is the dress? 🙏",
      reply: "Order it right here 👇",
      linkTitle: "Elira's Boutique",
      linkSub: "vela.al/butiku-i-eliras",
    },
  },
  interest: {
    badge: "Contact",
    title: "Interested? Write to us",
    sub: "One click or a message — we reply within the day.",
    name: "Your name",
    message: "Message",
    placeholder: "Hi! I'm interested in Vela for my shop…",
    send: "Send",
    quick: "Show interest in one click",
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
    title: "For every kind of shop",
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
    title: "With Vela",
    items: [
      "Customers order themselves",
      "Everything in one panel",
      "Card payments, in Lek",
      "Your shop sells 24/7",
    ],
  },
  how: {
    badge: "How it works",
    title: "Live in three steps",
    sub: "No store to build, no theme to fight. Connect and go.",
    step: "STEP",
    steps: [
      { title: "Connect Instagram", body: "Link Instagram Business in one tap — no code." },
      { title: "AI builds your products", body: "AI reads your posts and creates products — names, prices, variants." },
      { title: "Share your shop link", body: "Publish your storefront and take orders today." },
    ],
  },
  journey: {
    badge: "The full journey",
    title: "From post to order",
    sub: "The whole process, exactly as it happens.",
    divider: "FROM POST · TO PAYMENT · ",
    phases: ["Connect", "Launch", "Customer", "Orders"],
    steps: [
      { t: "Your Instagram posts", d: "It starts with the posts you already have.", phase: 0 },
      { t: "Log in to Vela", d: "Create an account and connect Instagram in one click.", phase: 0 },
      { t: "Sync your products", d: "AI extracts the name, price and category.", phase: 0 },
      { t: "Products ready in the panel", d: "Your full catalog appears in the panel.", phase: 1 },
      { t: "Storefront goes live", d: "Your shop publishes on your link.", phase: 1 },
      { t: "Customer finds a product", d: "Visitors browse right on your storefront.", phase: 2 },
      { t: "Adds it to cart", d: "Picks a variant — no DMs needed.", phase: 2 },
      { t: "Pays online or on delivery", d: "By card (RaiAccept) or cash on delivery.", phase: 2 },
      { t: "Order lands in your panel", d: "Instant notification, with every detail.", phase: 3 },
      { t: "Fulfill it in one click", d: "Change the status, the customer is notified. Done.", phase: 3 },
    ],
  },
  features: {
    badge: "Features",
    title: "Everything for your shop",
    sub: "One tool replaces the spreadsheet, DMs and guesswork.",
    items: [
      { title: "AI analysis", body: "Every post becomes a product — name, price, category." },
      { title: "Storefront Studio", body: "Design your storefront, with live preview." },
      { title: "Inventory & variants", body: "Stock reserves itself. Never oversell." },
      { title: "Card payments", body: "Raiffeisen (RaiAccept) or cash on delivery." },
      { title: "Order management", body: "From placed to fulfilled, in one place." },
      { title: "Analytics & offers", body: "See what sells. Run offers." },
    ],
  },
  studio: {
    badge: "Storefront Studio",
    titleA: "A storefront that looks like",
    titleB: "your brand",
    body: "Colors, fonts, sections — all with live preview.",
    checklist: ["8 ready-made themes", "Color & font palettes", "Drag-to-build homepage", "Live preview while editing", "Light & dark modes", "Mobile-perfect layouts"],
    cta: "Design your shop",
    demoShop: "My Shop",
  },
  pricing: {
    badge: "Pricing",
    title: "Simple pricing, in Lek",
    sub: "Every plan starts with a 7-day free trial — no card required.",
    monthly: "Monthly",
    annual: "Annual",
    save: "up to 2 months free",
    saveMonths: (n: number) => (n === 1 ? "1 month gifted" : `${n} months gifted`),
    perMonth: "ALL / mo",
    billedMonthly: "Billed monthly",
    billedYearly: (n) => `Billed ${n} ALL yearly`,
    popular: "Most popular",
    cta: "Try free",
    freeLabel: "Free",
    freeForever: "Free forever · no card",
    freeCta: "Start free",
    trialCta: "Try 7 days free",
    trialNote: "7 days free · no card · cancel anytime",
    reassure: "Sign up in 2 minutes. After the trial, pick a plan to keep your shop online — products are always saved.",
    plans: [
      { id: "starter", name: "Starter", blurb: "Your catalogue online, super affordable.", features: ["Up to 10 products", "Instagram storefront with your link", "Cash on delivery only (COD)", "Basic analytics", "7-day free trial"] },
      { id: "pro", name: "Pro", blurb: "Everything to sell.", features: ["Up to 100 active products", "Card payments + cash on delivery", "Advanced analytics", "Promotions & offers management", "Product reviews"] },
      { id: "business", name: "Business", blurb: "For growing shops.", features: ["Everything in Pro", "Priority support", "Full analytics", "Higher AI usage limits", "Full Storefront Studio access"] },
    ],
  },
  testimonials: {
    title: "Trusted by Albanian sellers",
    items: [
      { name: "Elira K.", role: "Boutique owner, Tiranë", quote: "I used to answer DMs all day. Now customers order from my link. Paid off in a week." },
      { name: "Andi M.", role: "Sneaker reseller, Durrës", quote: "AI built my whole catalog from my posts in minutes. I couldn't believe how fast I went live." },
      { name: "Sara D.", role: "Handmade jewelry", quote: "My shop finally looks professional. Storefront Studio made it feel like my brand." },
    ],
  },
  faq: {
    title: "Questions, answered",
    items: [
      { q: "How does the 7-day free trial work?", a: "Sign up with no card and get full Pro access for 7 days. After the trial, pick a plan — your products are always saved." },
      { q: "Do I need a website or coding skills?", a: "No. Vela turns your posts into a storefront automatically — you just connect and share your link." },
      { q: "How do customers pay?", a: "By card via Raiffeisen (RaiAccept) or cash on delivery. Prices show in Lek." },
      { q: "Can I customize how my shop looks?", a: "Yes. Storefront Studio controls colors, fonts and sections with a live preview, or start from a template." },
      { q: "What happens to my Instagram posts?", a: "Nothing changes. We read your public posts to build products — you decide what goes live." },
      { q: "Can I cancel anytime?", a: "Absolutely. Cancel or change your plan anytime from billing settings." },
    ],
  },
  cta: {
    title: "What are you waiting for? Raise the sail!",
    sub: "From Instagram to e-commerce in minutes.",
    button: "Start free",
  },
  footer: {
    signup: "Sign up",
    tagline: "Your Instagram, a real store.",
    product: "Product",
    account: "Account",
    made: "Made with ♥ for Albanian sellers",
  },
};
