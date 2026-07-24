/**
 * Hero-film storefront captures — the "nice" custom theme (velaeshop) instead
 * of the old default-blue dyqani-yt shots, plus the Instagram-theme phone shot.
 *
 *   PORT=5175 node scripts/capture-hero-storefronts.mjs
 *
 * Writes light → public/hero/, dark → public/hero/dark/:
 *   storefront-custom.png    1440×900  · /shop/velaeshop/products
 *   storefront-product.png   1440×900  · first product detail
 *   storefront-checkout.png  1440×900  · cart → checkout
 *   storefront-ig-phone.png   440×932  · /instagramShop/velaeshop
 *
 * It also prints the measured centre of the "add to cart" / "pay" buttons as
 * fractions of the 1440×900 frame — feed those into HeroFilm's CART/PAY.
 */
import puppeteer from "puppeteer";
import fs from "fs";

const BASE = `http://localhost:${process.env.PORT || "5175"}`;
const SLUG = process.env.SLUG || "velaeshop";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync("public/hero/dark", { recursive: true });

const b = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();

const setMode = async (dark) => {
  await p.evaluate((d) => localStorage.setItem("sf-visitor-mode", d ? "dark" : "light"), dark);
};
const imagesSettled = async () => {
  await p.evaluate(() => Promise.all(
    [...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; }))
  )).catch(() => {});
  await sleep(900);
};
const settle = async (extra = 3000) => {
  await p.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await sleep(extra);
  await imagesSettled();
  await p.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);
};
const shot = async (name, dark) => {
  const path = dark ? `public/hero/dark/${name}.png` : `public/hero/${name}.png`;
  await p.screenshot({ path });
  console.log("captured", path);
};
/** centre of the first element whose text matches `re`, as a 0..1 frame fraction */
const measure = async (re, label) => {
  const r = await p.evaluate((src) => {
    const rx = new RegExp(src, "i");
    const el = [...document.querySelectorAll("button, a")].find((x) => rx.test(x.textContent || ""));
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }, re.source);
  if (r) console.log(`  ▸ ${label}: fx=${(r.x / 1440).toFixed(3)} fy=${(r.y / 900).toFixed(3)}`);
  else console.log(`  ▸ ${label}: NOT FOUND`);
  return r;
};

const run = async (dark) => {
  console.log(`\n=== ${dark ? "DARK" : "LIGHT"} ===`);
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  /* 1 · all-products grid */
  await p.goto(`${BASE}/shop/${SLUG}/products?preview=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await setMode(dark);
  // start each pass from an empty cart so both themes show the same "1 item"
  await p.evaluate((slug) => localStorage.removeItem(`cartItems:${slug}`), SLUG);
  await p.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForSelector('a[href*="/product/"]', { timeout: 45000 });
  await settle(3500);
  await shot("storefront-custom", dark);

  /* 2 · product detail — the film's cursor clicks the add-to-cart CTA, so pick
     a product whose whole buy box fits the fold (few option groups) and shoot
     it unscrolled: hero image, title, price and CTA all in one frame. */
  const hrefs = await p.evaluate(() => [...new Set(
    [...document.querySelectorAll("a")].map((x) => x.getAttribute("href") || "").filter((h) => /\/product\//.test(h)))].slice(0, 10));
  if (!hrefs.length) throw new Error("no product link found");
  let picked = null;
  for (const href of hrefs) {
    await p.goto(`${BASE}${href}${href.includes("?") ? "&" : "?"}preview=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await settle(2600);
    // every option group needs a choice before add-to-cart works — and a
    // pre-picked variant reads better on camera too
    await p.evaluate(() => {
      document.querySelectorAll('[role="radiogroup"]').forEach((g) => g.querySelector('button[role="radio"]')?.click());
    });
    await sleep(700);
    const fits = await p.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((x) => /add to cart|shto në shport/i.test(x.textContent || ""));
      if (!btn) return false;
      const r = btn.getBoundingClientRect();
      return r.bottom < window.innerHeight - 40;
    });
    if (fits) { picked = href; break; }
  }
  if (!picked) throw new Error("no product fits the fold — widen the search");
  console.log("  ▸ product beat:", picked);
  await imagesSettled();
  await shot("storefront-product", dark);
  if (!dark) await measure(/add to cart|shto në shport/i, "CART button");

  /* 3 · cart → checkout */
  await p.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((x) => /add to cart|shto në shport/i.test(x.textContent || ""));
    btn?.click();
  });
  await sleep(1800);
  await p.keyboard.press("Escape");
  await sleep(600);
  await p.goto(`${BASE}/shop/${SLUG}/cart?preview=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await settle(2600);
  const proceeded = await p.evaluate(() => {
    const btn = [...document.querySelectorAll("button, a")].find((x) => /proceed|vazhdo|checkout|arka|përfundo/i.test(x.textContent || ""));
    btn?.click();
    return !!btn;
  });
  if (!proceeded) console.log("  ! no checkout CTA on cart page (empty cart?)");
  await sleep(2600);
  await settle(1000);
  // a filled form reads like a real purchase in progress, not a blank page
  const fields = ["Ana", "Hoxha", "ana.hoxha@gmail.com", "069 55 12 340", "Rr. Myslym Shyri 42", "Tiranë", "1001"];
  const inputs = await p.$$("form input[type='text'], form input[type='email'], form input[type='tel'], form input:not([type])");
  for (let i = 0; i < Math.min(inputs.length, fields.length); i++) {
    await inputs[i].click({ clickCount: 3 }).catch(() => {});
    await inputs[i].type(fields[i], { delay: 8 }).catch(() => {});
  }
  // blur the last field — a focused/validating input shows a red ring, which
  // reads as an error on camera
  await p.evaluate(() => (document.activeElement instanceof HTMLElement) && document.activeElement.blur());
  await p.evaluate(() => window.scrollTo(0, 0));
  await sleep(900);
  await shot("storefront-checkout", dark);
  if (!dark) await measure(/porosit|paguaj|place order|confirm|përfundo/i, "PAY button");

  /* 4 · Instagram-theme phone */
  await p.setViewport({ width: 440, height: 932, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto(`${BASE}/instagramShop/${SLUG}?preview=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await setMode(dark);
  await p.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
  await settle(4000);
  await shot("storefront-ig-phone", dark);
};

try {
  await run(false);
  await run(true);
  console.log("\nSTOREFRONT CAPTURES DONE");
} finally {
  await b.close();
}
