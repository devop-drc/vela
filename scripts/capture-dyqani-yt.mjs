/* Hero screenshots from the seeded "Dyqani yt" demo account.
   Reads creds from scripts/.demo-account.local (gitignored). */
import puppeteer from "puppeteer";
import fs from "fs";

const local = Object.fromEntries(
  fs.readFileSync("scripts/.demo-account.local", "utf-8").trim().split("\n").map((l) => l.split("=")),
);
const BASE = `http://localhost:${process.env.PORT || "5175"}`;
const SLUG = local.slug;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

const dismiss = async () => {
  await p.evaluate(() => {
    const shqip = [...document.querySelectorAll("button, [role='button']")].find((x) => /shqip/i.test(x.textContent || ""));
    shqip?.click();
  });
  await sleep(800);
  await p.evaluate(() => {
    const skip = [...document.querySelectorAll("button")].find((x) => /mos i shfaq|kalo|skip/i.test(x.textContent || ""));
    skip?.click();
  });
  await p.keyboard.press("Escape");
  await sleep(600);
};
const settle = async (extra = 2500) => {
  await p.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await sleep(extra);
  await p.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);
};
const shot = async (name) => {
  await p.screenshot({ path: `public/hero/${name}.png` });
  console.log("captured", name);
};
const bodyPeek = () => p.evaluate(() => document.body.innerText.slice(0, 130).replace(/\n+/g, " | "));

try {
  /* login */
  await p.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  // NOTE: the demo account's trial may be expired (status "incomplete") — if
  // admin pages redirect to /billing, temporarily add the dev-only bypass in
  // SubscriptionGuard.tsx:  if (import.meta.env.DEV &&
  // sessionStorage.getItem("vela-capture-bypass")) return <Outlet />;
  await p.evaluate(() => sessionStorage.setItem("vela-capture-bypass", "1"));
  await sleep(2000);
  await p.type('input[type="email"]', local.email, { delay: 10 });
  await p.type('input[type="password"]', local.password, { delay: 10 });
  await p.keyboard.press("Enter");
  await sleep(7000);
  console.log("after login:", p.url());

  /* admin */
  for (const [path, name, wait] of [
    ["/dashboard", "dashboard", 5000],
    ["/products", "products", 5000],
    ["/orders", "orders", 4200],
    ["/storefront-studio", "studio", 6500],
  ]) {
    await p.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
    await sleep(wait);
    await dismiss();
    await sleep(1200);
    await dismiss(); // tutorials can pop late
    await settle(1200);
    console.log(name, "->", p.url());
    await shot(name);
  }

  /* custom storefront via preview param */
  await p.goto(`${BASE}/shop/${SLUG}?preview=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await settle(4500);
  console.log("custom storefront:", await bodyPeek());
  await shot("storefront-custom");
  await shot("storefront-shop");

  const prodHref = await p.evaluate(() => [...document.querySelectorAll("a")].map((x) => x.getAttribute("href") || "").find((h) => /\/product\//.test(h)));
  console.log("product link:", prodHref);
  if (prodHref) {
    await p.goto(`${BASE}${prodHref}${prodHref.includes("?") ? "&" : "?"}preview=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await settle(3200);
    await shot("storefront-product");
    await p.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((x) => /add to cart|shto në shportë/i.test(x.textContent || ""));
      btn?.click();
    });
    await sleep(1400);
    await p.keyboard.press("Escape");
    await sleep(600);
  }
  await p.goto(`${BASE}/shop/${SLUG}/cart?preview=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await settle(2400);
  await shot("storefront-cart");
  await p.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((x) => /proceed|vazhdo/i.test(x.textContent || ""));
    btn?.click();
  });
  await sleep(2200);
  await settle(600);
  await shot("storefront-checkout");

  /* IG storefront (the public type for this shop) */
  await p.goto(`${BASE}/instagramShop/${SLUG}?preview=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await settle(4500);
  console.log("ig storefront:", await bodyPeek());
  await shot("storefront-ig");

  console.log("DYQANI YT CAPTURES DONE");
} finally {
  await b.close();
}
