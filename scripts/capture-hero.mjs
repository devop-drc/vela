/**
 * One-off helper to recapture hero-film screenshots from the live demo storefront
 * (dev server on :5173, demo shop `user-shop-d6d3`, public/no-auth). Run with the
 * dev server already running:  node scripts/capture-hero.mjs
 * Matches the existing hero images: 1440×900, deviceScaleFactor 1.
 */
import puppeteer from "puppeteer";

const BASE = "http://localhost:5173";
const SHOP = "user-shop-d6d3";
const PRODUCTS = [
  "f44e61ad-d0e3-4be2-970d-043b70f69dd2", // Fustan liri
  "9670a9d5-3910-4649-bf40-4e9d0fb5ec93", // Shall mëndafshi
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const clickText = (re) =>
    page.evaluate((src) => {
      const rx = new RegExp(src, "i");
      const b = [...document.querySelectorAll("button")].find((x) => rx.test(x.textContent || ""));
      if (b) b.click();
      return !!b;
    }, re.source);

  // Add a couple of products so the order summary has real line items.
  for (const pid of PRODUCTS) {
    await page.goto(`${BASE}/shop/${SHOP}/product/${pid}?preview=1`, { waitUntil: "networkidle0", timeout: 60000 });
    await sleep(1300);
    await clickText(/add to cart/);
    await sleep(800);
  }

  // Cart → checkout (contact & shipping step).
  await page.goto(`${BASE}/shop/${SHOP}/cart?preview=1`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1500);
  await clickText(/proceed to checkout/);
  await sleep(1600);
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);

  await page.screenshot({ path: "public/hero/storefront-checkout.png" });
  console.log("✓ captured public/hero/storefront-checkout.png");
} finally {
  await browser.close();
}
