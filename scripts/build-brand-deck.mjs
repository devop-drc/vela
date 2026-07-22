/**
 * Rebuild branding/guidelines/Vela-Brand-Guidelines.pptx so it looks like the
 * LANDING PAGE design language: cream + night sections, Clash Display headlines
 * with a single gradient-clipped keyword, gradient-dot eyebrows, warm-glass
 * cards, the aurora mesh on dark slides, the real mark and app screenshots.
 *
 * Pipeline: build one self-contained HTML (real fonts embedded, 16:9 slides) →
 * puppeteer screenshots each slide → pptxgenjs packs them full-bleed into a
 * widescreen deck. Run:  node scripts/build-brand-deck.mjs
 */
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import PptxGenJS from "pptxgenjs";

const ROOT = process.cwd();
const TMP = path.join(ROOT, "branding/guidelines/.deck-build");
fs.mkdirSync(TMP, { recursive: true });

/* ── asset helpers ───────────────────────────────────────────────────── */
const b64 = (p) => fs.readFileSync(path.join(ROOT, p)).toString("base64");
const dataFont = (p, fmt) => `url(data:font/${fmt};base64,${b64(p)}) format('${fmt === "otf" ? "opentype" : "woff2"}')`;
const dataImg = (p) => {
  const ext = path.extname(p).slice(1);
  const mime = ext === "svg" ? "image/svg+xml" : `image/${ext}`;
  return `data:${mime};base64,${b64(p)}`;
};

const FONTS = `
@font-face{font-family:'Clash Display';font-weight:500;src:${dataFont("public/fonts/clash/ClashDisplay-Medium.otf","otf")}}
@font-face{font-family:'Clash Display';font-weight:600;src:${dataFont("public/fonts/clash/ClashDisplay-Semibold.otf","otf")}}
@font-face{font-family:'Clash Display';font-weight:700;src:${dataFont("public/fonts/clash/ClashDisplay-Bold.otf","otf")}}
@font-face{font-family:'Satoshi';font-weight:500;src:${dataFont("public/fonts/satoshi/Satoshi-500.woff2","woff2")}}
@font-face{font-family:'Satoshi';font-weight:700;src:${dataFont("public/fonts/satoshi/Satoshi-700.woff2","woff2")}}
`;

// logos + screenshots as data URIs
const A = {
  mark: dataImg("branding/logo/icon.svg"),
  markDark: dataImg("branding/logo/icon-dark.svg"),
  markFlat: dataImg("public/brand/icon-flat.svg"),
  markBnw: dataImg("branding/logo/icon-bnw.svg"),
  markBnwDark: dataImg("branding/logo/icon-bnw-dark.svg"),
  wmLight: dataImg("branding/logo/wordmark-horizontal-dark.svg"), // dark ink → light bg
  wmDark: dataImg("branding/logo/wordmark-horizontal.svg"), // light → dark bg
  wmVert: dataImg("branding/logo/wordmark-vertical-dark.svg"),
  ship: dataImg("public/ship-icon-colored.svg"),
  shipWhite: dataImg("public/ship-icon-white.svg"),
  dash: dataImg("public/marketing/app/01-dashboard.png"),
  dashDark: dataImg("public/marketing/app/08-dashboard-dark.png"),
  products: dataImg("public/marketing/app/02-products.png"),
  store: dataImg("public/marketing/app/06-storefront-live.png"),
  studio: dataImg("public/marketing/app/04-storefront-studio.png"),
  igstudio: dataImg("public/marketing/app/03-instagram-studio.png"),
};

/* ── design tokens (landing-faithful) ────────────────────────────────── */
const C = {
  paper: "#FBF6F4", ink: "#2A1D22", muted: "#796770", border: "#EDE4E1",
  wine: "#A31234", neon: "#FF2E4D", gold: "#FACC15", deep: "#7F1D3B", amber: "#F59E0B",
  night: "#140A0E",
};
const GRAD = `linear-gradient(115deg,${C.deep},${C.wine} 40%,${C.neon} 75%,${C.amber} 115%)`;
const TEXTGRAD = `linear-gradient(100deg,#FACC15 5%,#F59E0B 30%,#FF2E4D 62%,#A31234 95%)`;

const CSS = `
${FONTS}
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased}
body{font-family:'Satoshi','Inter',system-ui,sans-serif}
.slide{width:1920px;height:1080px;position:relative;overflow:hidden;color:${C.ink};background:${C.paper};padding:88px 140px 150px;display:flex;flex-direction:column}
.slide.dark{background:${C.night};color:#fff}
/* aurora on dark */
.aurora{position:absolute;inset:-25%;background:conic-gradient(from 20deg at 50% 40%,rgba(255,46,77,.18),rgba(250,204,21,.12),rgba(245,158,11,.15),rgba(200,30,60,.11),rgba(127,29,59,.16),rgba(255,46,77,.18));filter:blur(120px)}
.vignette{position:absolute;inset:0;background:radial-gradient(100% 75% at 50% 32%,transparent 42%,rgba(9,6,11,.6) 100%)}
.grain{position:absolute;inset:0;opacity:.04;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.wash{position:absolute;border-radius:999px;filter:blur(50px);pointer-events:none}
.z{position:relative;z-index:2;display:flex;flex-direction:column;height:100%}
/* eyebrow */
.eyebrow{display:inline-flex;align-items:center;gap:16px;font-family:'Clash Display';font-weight:600;font-size:24px;letter-spacing:.18em;text-transform:uppercase;color:${C.muted}}
.dark .eyebrow{color:rgba(255,255,255,.6)}
.dot{width:16px;height:16px;border-radius:999px;background:${GRAD}}
/* headline */
h1{font-family:'Clash Display';font-weight:600;letter-spacing:-.02em;line-height:1.02;font-size:84px;margin-top:18px}
h1.big{font-size:116px}
.g{background-image:${TEXTGRAD};-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{font-size:28px;line-height:1.5;color:${C.muted};max-width:1180px;margin-top:18px}
.dark .sub{color:rgba(255,255,255,.62)}
.spacer{flex:1}
/* cards */
.cards{display:grid;gap:26px;margin-top:auto}
.card{background:#fff;border:1px solid ${C.border};border-radius:26px;padding:30px 34px;box-shadow:0 1px 2px rgba(120,20,40,.05),0 22px 50px -26px rgba(120,20,40,.14);position:relative}
.card::after{content:'';position:absolute;top:0;left:34px;right:34px;height:2px;border-radius:9px;background:linear-gradient(90deg,transparent,${C.neon},${C.gold},transparent);opacity:.7}
.dark .card{background:rgba(22,18,28,.9);border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 70px -34px rgba(0,0,0,.7)}
.card h3{font-family:'Clash Display';font-weight:600;font-size:29px;color:${C.ink};margin-bottom:12px}
.dark .card h3{color:#fff}
.card p{font-size:21px;line-height:1.45;color:${C.muted}}
.dark .card p{color:rgba(255,255,255,.62)}
.card .ico{width:60px;height:60px;border-radius:16px;display:grid;place-items:center;margin-bottom:22px;font-size:30px}
/* chips + pills */
.chip{display:inline-flex;align-items:center;gap:12px;padding:16px 34px;border-radius:999px;font-family:'Clash Display';font-weight:600;font-size:26px}
.chip.grad{background:${GRAD};color:#fff;box-shadow:0 24px 50px -22px rgba(163,18,52,.6)}
.chip.outline{border:2px solid ${C.border};color:${C.ink}}
.dark .chip.outline{border-color:rgba(255,255,255,.35);color:#fff}
/* footer */
.foot{position:absolute;left:140px;right:140px;bottom:52px;display:flex;align-items:center;justify-content:space-between;font-family:'Clash Display';font-weight:600;font-size:22px;letter-spacing:.02em;color:${C.muted};z-index:3}
.dark .foot{color:rgba(255,255,255,.5)}
.foot .l{display:flex;align-items:center;gap:14px}
/* misc */
.row{display:flex;gap:26px}
.list{display:flex;flex-direction:column;gap:22px;margin-top:14px}
.li{display:flex;align-items:flex-start;gap:18px;font-size:26px;line-height:1.4;color:${C.ink}}
.dark .li{color:rgba(255,255,255,.9)}
.li .k{flex-shrink:0;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;font-size:24px;color:${C.gold};background:rgba(250,204,21,.14)}
.li .x{color:${C.neon};font-weight:700;font-size:30px;line-height:1}
.mono{font-family:'Clash Display';font-weight:500}
.swatch{border-radius:22px;padding:26px;display:flex;flex-direction:column;justify-content:flex-end;height:182px;border:1px solid ${C.border}}
.swatch .n{font-family:'Clash Display';font-weight:600;font-size:26px}
.swatch .h{font-size:20px;opacity:.8;margin-top:6px}
.shot{border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,.14);box-shadow:0 50px 110px -50px rgba(0,0,0,.7);background:#1E1014}
.shot img{width:100%;display:block}
.logoTile{border-radius:22px;display:grid;place-items:center;height:188px;padding:26px;overflow:hidden}
.logoTile img{max-width:78%;max-height:112px;object-fit:contain;display:block}
.cap{font-size:19px;color:${C.muted};text-align:center;margin-top:12px;font-family:'Clash Display';font-weight:500}
.dark .cap{color:rgba(255,255,255,.55)}
`;

/* ── slide content builders (faithful to the v3 book, restyled) ──────── */
const foot = (n) => `<div class="foot"><div class="l"><span class="dot" style="width:12px;height:12px"></span> Vela · Brand &amp; Style Guidelines · v4.0</div><div>${String(n).padStart(2, "0")}</div></div>`;
const head = (eyebrow, h, gword, sub, big) =>
  `<div class="eyebrow"><span class="dot"></span>${eyebrow}</div>
   <h1 class="${big ? "big" : ""}">${h}${gword ? ` <span class="g">${gword}</span>` : ""}</h1>
   ${sub ? `<div class="sub">${sub}</div>` : ""}`;
const card = (title, desc, ico, tint) =>
  `<div class="card">${ico ? `<div class="ico" style="background:${tint || "rgba(163,18,52,.1)"}">${ico}</div>` : ""}<h3>${title}</h3><p>${desc}</p></div>`;
const cardsGrid = (cols, items) => `<div class="cards" style="grid-template-columns:repeat(${cols},1fr)">${items.join("")}</div>`;

const SLIDES = [
  // 1 · cover
  { dark: true, html: `
    <div class="z" style="align-items:center;justify-content:center;text-align:center">
      <img src="${A.shipWhite}" style="width:230px;filter:drop-shadow(0 30px 70px rgba(127,29,59,.6))"/>
      <div class="eyebrow" style="margin-top:44px">Udhëzimet e Markës · Brand &amp; Style Guidelines</div>
      <h1 class="big" style="margin-top:30px">Kthe Instagramin<br/>në <span class="g">dyqan online.</span></h1>
      <div class="sub" style="text-align:center;color:rgba(255,255,255,.6)">Version 4.0 · July 2026 · vela.al</div>
    </div>` },

  // 2 · the brand
  { html: head("01 · The Brand", "Instagram in. A real shop", "out.") +
    `<div class="sub">Vela turns a merchant's Instagram Business profile into a complete online shop — the system reads their posts and extracts products, prices, categories and variants, then gives them a storefront, orders, card payments in Lekë and a dashboard that runs the whole business. No code, no migration, no friction.</div>` +
    cardsGrid(4, [
      card("Speed", "From connecting Instagram to a live shop in minutes. Every flow is measured against that promise.", "⚡", "rgba(245,158,11,.14)"),
      card("Albanian-first", "Built for the market: language, Lekë, cash-on-delivery, RaiAccept. English always one tap away.", "🇦🇱", "rgba(163,18,52,.1)"),
      card("Momentum", "The arrow in our hull. Everything moves forward — sync, orders, growth. Never static.", "↗", "rgba(255,46,77,.12)"),
      card("Warmth", "Cream, not sterile white. Rounded, not sharp. A helping hand, not an ERP.", "◗", "rgba(250,204,21,.16)"),
    ]) },

  // 3 · name & story
  { dark: true, html: head("02 · Name &amp; Story", "“Vela” — the sail.", "Wind behind commerce.") +
    `<div class="sub">Vela is the Albanian (and Latin) word for sail. A merchant's page is a boat tied to the dock — posts full of products, sales stuck in messages. Vela raises the sails: the same products, now moving — searchable, orderable, payable.</div>
     <div class="spacer"></div>
     <div class="card" style="max-width:1400px"><h3>Positioning</h3><p style="font-size:26px;color:rgba(255,255,255,.8)">For Instagram merchants in Albania who sell through messages, Vela is the commerce platform that turns their existing posts into a real online shop in minutes — because the shop builds itself from what they already have.</p></div>
     <div class="row" style="margin-top:30px"><span class="chip grad">brenda pak minutash</span><span class="chip outline">pa kod</span><span class="chip outline">pagesa në Lekë</span></div>` },

  // 4 · the mark
  { dark: true, html: `<div class="eyebrow"><span class="dot"></span>03 · The Mark</div>
    <div class="row" style="align-items:center;gap:80px;margin-top:20px"><img src="${A.ship}" style="width:280px"/><div><h1>Two price tags, <span class="g">sailing.</span></h1><div class="sub">A boat whose sails are price tags — the product itself, catching wind. Read it twice: a shop that moves, and products that travel.</div></div></div>` +
    cardsGrid(4, [
      card("The sails", "Two price tags — red and gold. Every product gets a price and a place; the overlap makes depth and family."),
      card("The tag holes", "The punch-holes of real price tags. They double as the mark's identity detail — keep them visible at every size."),
      card("The hull → arrow", "The hull sweeps into a golden arrow, up and forward: growth, momentum, the brand's optimism in one stroke."),
      card("The gradient", "Deep wine through neon red to gold — sunset over the Adriatic. Warmth and energy; never cold, never corporate blue."),
    ]) },

  // 5 · logo system
  { html: head("04 · Logo System", "One mark, a disciplined", "family.") +
    `<div class="spacer"></div>
     <div style="display:flex;gap:24px">
      ${[[A.mark, C.paper, `border:1px solid ${C.border}`, "App icon · light"],
         [A.markDark, C.night, "", "App icon · dark"],
         [A.markFlat, C.paper, `border:1px solid ${C.border}`, "Flat · UI &amp; small"],
         [A.markBnw, "#fff", `border:1px solid ${C.border}`, "Grayscale · print"]].map(([img, bg, bd, cap]) =>
        `<div style="flex:1;display:flex;flex-direction:column;gap:12px"><div class="logoTile" style="background:${bg};${bd}"><img src="${img}"/></div><div class="cap">${cap}</div></div>`).join("")}
     </div>
     <div style="display:flex;gap:24px;margin-top:24px">
      <div style="flex:1;display:flex;flex-direction:column;gap:12px"><div class="logoTile" style="background:${C.night}"><img src="${A.wmDark}" style="max-width:64%"/></div><div class="cap">wordmark-horizontal — on dark &amp; photo</div></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:12px"><div class="logoTile" style="background:${C.paper};border:1px solid ${C.border}"><img src="${A.wmLight}" style="max-width:64%"/></div><div class="cap">wordmark-horizontal-dark — on light &amp; paper</div></div>
     </div>` },

  // 6 · usage rules
  { html: head("05 · Usage Rules", "Clearspace, sizes,", "backgrounds.") +
    `<div class="row" style="gap:40px;margin-top:44px">
      <div class="card" style="flex:1"><h3>Clearspace &amp; sizes</h3><div class="list">
        <div class="li"><span class="k">◱</span> Margin of 3× the tag-hole diameter on every side — nothing enters it.</div>
        <div class="li"><span class="k">▸</span> Flat symbol min 16px · shaded 32px · horizontal lockup 90px wide.</div>
        <div class="li"><span class="k">▸</span> Below the shaded minimum, switch to the flat icon.</div>
      </div></div>
      <div class="card" style="flex:1"><h3>Background logic</h3><div class="list">
        <div class="li"><span class="k">☼</span> Calm light → full-color mark or dark-ink lockup.</div>
        <div class="li"><span class="k">☾</span> Dark / photo → light wordmark; mark keeps its gradient.</div>
        <div class="li"><span class="k">▦</span> Busy photo → flat grayscale or white, never the gradient.</div>
        <div class="li"><span class="k">▤</span> Print, single colour → the bnw family only.</div>
      </div></div>
    </div>` },

  // 7 · don'ts
  { dark: true, html: head("06 · Don'ts", "What never happens to the", "mark.") +
    `<div class="cards" style="grid-template-columns:repeat(2,1fr);margin-top:50px">
      ${["Don't stretch, squash, rotate or mirror the boat","Don't recolor the sails or invent new gradients","Don't add shadows, glows, outlines or bevels","Don't place the gradient mark over busy photography","Don't rebuild the wordmark in another font","Don't mix the legacy ship or old lockups with this system"].map(x => `<div class="li"><span class="x">✕</span> ${x}</div>`).join("")}
    </div>` },

  // 8 · color
  { html: head("07 · Color", "Deep wine, neon red,", "gold.") +
    `<div class="sub">The palette travels from deep wine to gold — sunset over the sea. Neon red acts, gold rewards, wine anchors; cream and ink do the everyday work.</div>
     <div class="cards" style="grid-template-columns:repeat(4,1fr);gap:22px;margin-top:26px">
      ${[["Deep Wine",C.deep,"#fff"],["Wine · Primary",C.wine,"#fff"],["Neon Red · Accent",C.neon,"#fff"],["Amber",C.amber,C.ink],["Gold",C.gold,C.ink],["Ink",C.ink,"#fff"],["Cream",C.paper,C.ink],["Night",C.night,"#fff"]].map(([n,hex,fg]) =>
        `<div class="swatch" style="background:${hex};color:${fg}"><div class="n">${n}</div><div class="h mono">${hex}</div></div>`).join("")}
     </div>
     <div class="sub" style="margin-top:22px;font-size:24px;max-width:none">Ratio rule: cream surfaces dominate (~60%), ink and structure carry (~30%), wine · neon · gold accent (~10%). The louder the colour, the smaller its area.</div>` },

  // 9 · the gradient
  { dark: true, html: head("08 · The Gradient", "Spice, not", "surface.") +
    `<div style="height:150px;border-radius:26px;background:${GRAD};margin-top:44px;box-shadow:0 40px 90px -40px rgba(163,18,52,.6);display:flex;align-items:center;padding:0 46px;color:#fff;font-family:'Clash Display';font-weight:600;font-size:30px">115° · #7F1D3B → #A31234 → #FF2E4D → #F59E0B</div>
     <div class="cards" style="grid-template-columns:repeat(2,1fr);margin-top:40px">
      ${["Primary CTA = gradient pill + white text; secondary = glass outline","Text over the gradient is always white — no exceptions","As a highlight, clip to a short phrase — never a whole heading","In motion it drifts like a lava lamp; scale never pulses","On photos or data-dense UI, drop to solid wine"].map(x => `<div class="li"><span class="k">▸</span> ${x}</div>`).join("")}
     </div>` },

  // 10 · typography
  { html: head("09 · Typography", "Clash Display speaks.", "Satoshi explains.") +
    `<div class="row" style="gap:40px;margin-top:40px">
      <div class="card" style="flex:1.2"><div class="cap" style="text-align:left">DISPLAY · CLASH DISPLAY</div><div style="font-family:'Clash Display';font-weight:600;font-size:96px;letter-spacing:-.02em;color:${C.ink};line-height:1">Aa Ëë Çç</div><p style="margin-top:16px">Headlines — tracking −2%, balanced wrap, one gradient keyword.</p></div>
      <div class="card" style="flex:1"><div class="cap" style="text-align:left">BODY · SATOSHI / INTER</div><div style="font-family:'Satoshi';font-weight:500;font-size:56px;color:${C.ink};line-height:1.1">Aa Ëë Çç</div><p style="margin-top:16px">Body 15–17px · secondary 13.5px · captions 11px · tabular numerals in tables.</p></div>
     </div>
     <div class="list" style="margin-top:34px"><div class="li"><span class="k">▸</span> Eyebrows: uppercase, 600, letter-spacing .18em.</div><div class="li"><span class="k">▸</span> Albanian diacritics (ë, ç) verified in both fonts.</div></div>` },

  // 11 · layout hierarchy
  { html: head("10 · Layout Hierarchy", "Eyebrow → headline → one", "sentence.") +
    `<div class="card" style="margin-top:50px;padding:70px"><div class="eyebrow"><span class="dot"></span>The section anatomy</div><h1 style="font-size:88px;margin-top:24px">A claim, <span class="g">not a description.</span></h1><div class="sub">One short sub-sentence in muted ink, never more than two lines — then cards carry the detail while the page carries the rhythm.</div></div>
     <div class="list" style="margin-top:40px"><div class="li"><span class="k">1</span> Every section opens with the gradient-dot eyebrow.</div><div class="li"><span class="k">2</span> One headline — a claim, with a single gradient keyword.</div><div class="li"><span class="k">3</span> Generous whitespace; sections breathe, never crowd.</div></div>` },

  // 12 · UI design language
  { html: head("11 · UI Design Language", "Warm glass, 24-pixel", "corners.") +
    cardsGrid(3, [
      card("Radius", "1.5rem (24px) everywhere · full pills for CTAs.", "◗"),
      card("Surfaces", "White glass on warm cream; hairline borders #EDE4E1.", "▢"),
      card("Shadows", "Soft, warm-tinted, never harsh.", "◐"),
      card("Focus & selection", "Neon-red focus ring; selection at 20% alpha.", "◉"),
      card("Icons", "lucide, 1.5px stroke — consistent weight.", "✦"),
      card("Light-first", "Light theme is the source; dark derives from it, never the reverse.", "☀"),
    ]) },

  // 13 · components & status
  { html: head("12 · Components & Status", "Semantic colour does the", "talking.") +
    `<div class="row" style="gap:20px;margin-top:40px">
      ${[["Success · emerald","#10B981","active, fulfilled, in stock"],["Warning · amber","#F59E0B","pending, low stock"],["Info · blue","#3B82F6","in-progress steps"],["Danger · red","#E11D48","out of stock, failed"]].map(([n,hex,d]) =>
        `<div class="card" style="flex:1"><div style="display:flex;align-items:center;gap:12px;margin-bottom:14px"><span style="width:20px;height:20px;border-radius:999px;background:${hex}"></span><h3 style="font-size:26px;margin:0">${n}</h3></div><p>${d}</p></div>`).join("")}
     </div>
     <div class="list" style="margin-top:36px"><div class="li"><span class="k">▸</span> Buttons: primary gradient pill · secondary outline · ghost for toolbars.</div><div class="li"><span class="k">▸</span> Chips: tinted pills, 10–15% alpha fill, full-strength text.</div><div class="li"><span class="k">▸</span> Tables: hairline rows, tabular numbers, status chips right-aligned.</div><div class="li"><span class="k">▸</span> Every interactive element has a visible focus ring.</div></div>` },

  // 14 · the product is the brand
  { dark: true, html: head("13 · The Product is the Brand", "Calm, dense, warm — the", "admin.") +
    `<div class="row" style="gap:40px;margin-top:auto;align-items:flex-end">
      <div style="flex:1"><div class="shot"><img src="${A.dash}"/></div><div class="cap">Dashboard — KPIs first, one glance tells the day.</div></div>
      <div style="flex:1"><div class="shot"><img src="${A.products}"/></div><div class="cap">Products — command bar, status pills, inline filters.</div></div>
     </div>
     <div class="sub" style="text-align:center;margin:34px auto 0">Screenshots are the living style guide — when a new screen doesn't look like these, the new screen is wrong.</div>` },

  // 15 · dark mode
  { dark: true, html: head("14 · Dark Mode", "Night is rose-cast,", "never black.") +
    `<div class="row" style="gap:40px;margin-top:auto;align-items:flex-end">
      <div style="flex:1.3"><div class="shot"><img src="${A.dashDark}"/></div><div class="cap">Admin dark — hsl(350 20% 6%) canvas, neon-red primary.</div></div>
      <div style="flex:1"><div class="list"><div class="li"><span class="k">▸</span> Backgrounds keep the wine hue — never neutral #000.</div><div class="li"><span class="k">▸</span> Primary lifts from wine to neon red for contrast.</div><div class="li"><span class="k">▸</span> Text opacity, not grey, creates hierarchy.</div><div class="li"><span class="k">▸</span> Every surface ships in both themes.</div></div></div>
     </div>` },

  // 16 · merchant storefronts
  { html: head("15 · Merchant Storefronts", "Vela frames. The merchant's brand", "fills.") +
    `<div class="row" style="gap:40px;margin-top:auto;align-items:flex-end">
      <div style="flex:1"><div class="shot" style="background:#fff;border-color:${C.border}"><img src="${A.studio}"/></div><div class="cap">Storefront Studio — templates give taste, tokens give control.</div></div>
      <div style="flex:1"><div class="list"><div class="li"><span class="k">▸</span> Shops are the merchant's brand — their colours, fonts, radius (sf-* tokens).</div><div class="li"><span class="k">▸</span> Vela chrome inside shops stays neutral and minimal.</div><div class="li"><span class="k">▸</span> Every storefront ships light + dark, Albanian + English.</div><div class="li"><span class="k">▸</span> “Powered by Vela” is quiet — small, muted, footer only.</div></div></div>
     </div>` },

  // 17 · motion
  { dark: true, html: head("16 · Motion", "Weight, not", "decoration.") +
    `<div class="sub">Motion sells the product's speed — springy and physical. Things arrive with weight and settle; nothing shimmers on a loop.</div>` +
    cardsGrid(2, [
      card("Springs with small overshoot", "Entrances use spring physics (damping ~16) — a landing, not a fade."),
      card("Blur-reveal for big type", "Display text rises softly from blur; never slams or bounces twice."),
      card("Lava gradients", "Brand gradients drift position slowly. Scale never pulses."),
      card("One pipeline", "In-app: GSAP + ScrollTrigger. Films & renders: Remotion (src/compositions)."),
    ]) },

  // 18 · voice & tone
  { html: head("17 · Voice &amp; Tone", "Direct, warm,", "Albanian-first.") +
    `<div class="row" style="gap:40px;margin-top:44px">
      <div class="card" style="flex:1"><div class="cap" style="text-align:left;color:${C.wine}">SOUNDS LIKE VELA</div><div class="list" style="margin-top:18px">${["“Kthe Instagramin në dyqan online — brenda pak minutash.”","“Ti poston. Vela shet.”","“Pa kod. Pa migrime. Në Lekë.”"].map(s=>`<div class="li" style="font-size:26px"><span class="k">”</span>${s}</div>`).join("")}</div></div>
      <div class="card" style="flex:1"><div class="cap" style="text-align:left;color:${C.muted}">NEVER SOUNDS LIKE</div><div class="list" style="margin-top:18px">${["“Leverage our AI-powered omnichannel solution” — jargon","“Revolucionizo biznesin tënd!!” — hype stacks","Long feature lists where one promise would do"].map(s=>`<div class="li" style="font-size:26px"><span class="x">✕</span>${s}</div>`).join("")}</div></div>
     </div>` },

  // 19 · applications & files
  { dark: true, html: head("18 · Applications &amp; Files", "Where the brand", "lives.") +
    cardsGrid(2, [
      card("App &amp; favicon", "icon.svg / icon-dark.svg drive the PWA icon, favicon and dashboard brand block."),
      card("Instagram · @vela.al", "Feed tiles + Remotion story films: night backgrounds, gradient accents, flat mark."),
      card("Files · branding/", "logo/ · fonts/ (Clash + Satoshi) · motion/ (Remotion stings) · guidelines/ (this deck)."),
      card("Questions", "info@vela.al · vela.al — the brand is a system, not a screenshot."),
    ]) },
];

/* ── per-slide HTML (rendered one at a time so the page stays small) ──── */
const slideHtml = (s, i) => {
  const bg = s.dark
    ? `<div class="aurora"></div><div class="vignette"></div><div class="grain"></div>`
    : `<div class="wash" style="width:760px;height:760px;left:-200px;top:-240px;background:radial-gradient(circle,rgba(163,18,52,.06),transparent 70%)"></div><div class="wash" style="width:700px;height:700px;right:-220px;bottom:-200px;background:radial-gradient(circle,rgba(245,158,11,.07),transparent 70%)"></div>`;
  return `<div class="slide ${s.dark ? "dark" : ""}">${bg}<div class="z">${s.html}</div>${foot(i + 1)}</div>`;
};
const doc = (inner) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body style="margin:0">${inner}</body></html>`;

/* ── render slides → PNG (one document per slide) ────────────────────── */
const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"], protocolTimeout: 180000 });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
const pngs = [];
for (let i = 0; i < SLIDES.length; i++) {
  await page.setContent(doc(slideHtml(SLIDES[i], i)), { waitUntil: "load" });
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 350));
  const p = path.join(TMP, `slide-${String(i + 1).padStart(2, "0")}.png`);
  await page.screenshot({ path: p, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  pngs.push(p);
}
await browser.close();
console.log("rendered", pngs.length, "slides");

/* ── pack into PPTX (16:9) ───────────────────────────────────────────── */
const pptx = new PptxGenJS();
pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
pptx.layout = "WIDE";
pptx.author = "Vela";
pptx.title = "Vela — Brand & Style Guidelines v4.0";
for (const p of pngs) {
  const slide = pptx.addSlide();
  slide.background = { color: "140A0E" };
  slide.addImage({ path: p, x: 0, y: 0, w: 13.333, h: 7.5 });
}
const outPath = path.join(ROOT, "branding/guidelines/Vela-Brand-Guidelines.pptx");
await pptx.writeFile({ fileName: outPath });
console.log("wrote", outPath);
