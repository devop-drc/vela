/* Dark-mode variants of the six hero-film screenshots → public/hero/dark/.
   Forces html.dark (the app's token overrides) after each load; admin pages
   need the temporary SubscriptionGuard bypass note in capture-dyqani-yt.mjs
   if the demo trial is expired. */
import puppeteer from "puppeteer";
import fs from "fs";

const local = Object.fromEntries(
  fs.readFileSync("scripts/.demo-account.local", "utf-8").trim().split("\n").map((l) => l.split("=")),
);
const BASE = `http://localhost:${process.env.PORT || "5173"}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync("public/hero/dark", { recursive: true });

const b = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

// AppearanceContext writes LIGHT tokens inline on :root (they beat .dark
// CSS) — so like Demo.tsx we set the dark token set inline ourselves and
// keep re-asserting it against re-renders.
const DARK_VARS = {
  "--background": "350 20% 6%", "--foreground": "350 12% 96%",
  "--muted": "348 14% 15%", "--muted-foreground": "345 8% 68%",
  "--card": "348 18% 9%", "--card-foreground": "350 12% 96%",
  "--popover": "348 18% 9%", "--popover-foreground": "350 12% 96%",
  "--primary": "351 100% 62%", "--primary-foreground": "350 45% 8%",
  "--secondary": "348 14% 16%", "--secondary-foreground": "350 12% 92%",
  "--accent": "348 22% 18%", "--accent-foreground": "350 12% 92%",
  "--destructive": "0 72% 55%", "--destructive-foreground": "0 0% 98%",
  "--success": "142 55% 55%", "--success-foreground": "150 40% 8%",
  "--warning": "42 92% 60%", "--warning-foreground": "40 96% 8%",
  "--info": "213 90% 66%", "--info-foreground": "214 60% 10%",
  "--border": "348 14% 20%", "--input": "348 14% 20%", "--ring": "351 92% 60%",
};
const forceDark = async () => {
  await p.evaluate((vars) => {
    const apply = () => {
      document.documentElement.classList.add("dark");
      for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v);
    };
    apply();
    // re-assert every 400ms — AppearanceContext refetches can rewrite vars
    if (!window.__darkKeeper) window.__darkKeeper = setInterval(apply, 400);
  }, DARK_VARS);
};
const dismiss = async () => {
  await p.evaluate(() => {
    const shqip = [...document.querySelectorAll("button, [role='button']")].find((x) => /shqip/i.test(x.textContent || ""));
    shqip?.click();
  });
  await sleep(700);
  await p.evaluate(() => {
    const skip = [...document.querySelectorAll("button")].find((x) => /mos i shfaq|kalo|skip/i.test(x.textContent || ""));
    skip?.click();
  });
  await p.keyboard.press("Escape");
  await sleep(500);
};
const settle = async (extra = 2200) => {
  await p.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await sleep(extra);
  await p.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);
};
const shot = async (name) => {
  await p.screenshot({ path: `public/hero/dark/${name}.png` });
  console.log("captured dark", name);
};

try {
  await p.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.evaluate(() => sessionStorage.setItem("vela-capture-bypass", "1"));
  await sleep(1800);
  await p.type('input[type="email"]', local.email, { delay: 10 });
  await p.type('input[type="password"]', local.password, { delay: 10 });
  await p.keyboard.press("Enter");
  await sleep(7000);
  console.log("after login:", p.url());

  for (const [path, name, wait] of [
    ["/dashboard", "dashboard", 5000],
    ["/products", "products", 5000],
    ["/orders", "orders", 4200],
  ]) {
    await p.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
    await forceDark();
    await sleep(wait);
    await dismiss();
    await forceDark();
    await sleep(1200);
    await dismiss();
    await settle(1400);
    await shot(name);
  }

  /* storefront pages: try forcing dark; whatever renders is what we ship */
  await p.goto(`${BASE}/shop/${local.slug}?preview=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await forceDark();
  await settle(4200);
  await shot("storefront-custom");

  const prodHref = await p.evaluate(() => [...document.querySelectorAll("a")].map((x) => x.getAttribute("href") || "").find((h) => /\/product\//.test(h)));
  if (prodHref) {
    await p.goto(`${BASE}${prodHref}${prodHref.includes("?") ? "&" : "?"}preview=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await forceDark();
    await settle(3000);
    await shot("storefront-product");
    await p.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((x) => /add to cart|shto në shportë/i.test(x.textContent || ""));
      btn?.click();
    });
    await sleep(1300);
    await p.keyboard.press("Escape");
    await sleep(500);
  }
  await p.goto(`${BASE}/shop/${local.slug}/cart?preview=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await forceDark();
  await settle(2200);
  await p.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((x) => /proceed|vazhdo/i.test(x.textContent || ""));
    btn?.click();
  });
  await sleep(2200);
  await forceDark();
  await settle(600);
  await shot("storefront-checkout");
  console.log("DARK CAPTURES DONE");
} finally {
  await b.close();
}
