/* Capture admin hero screenshots from the /demo mirror (no auth needed).
   Strips the demo banner so frames read as the real app. 1440×900 @ dsf1. */
import puppeteer from "puppeteer";

const BASE = "http://localhost:5175";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

const stripChrome = () =>
  page.evaluate(() => {
    // demo banner strip
    [...document.querySelectorAll("div")].find((d) => /Interactive demo with sample data/i.test(d.textContent || "") && d.className.includes("border-b") && d.querySelectorAll("*").length < 6)?.remove();
  });

const clickNav = (label) =>
  page.evaluate((l) => {
    const b = [...document.querySelectorAll("nav button")].find((x) => (x.textContent || "").trim() === l);
    if (b) b.click();
    return !!b;
  }, label);

const shot = async (name) => {
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await sleep(400);
  await page.screenshot({ path: `public/hero/${name}.png` });
  console.log(`captured ${name}.png`);
};

try {
  await page.goto(`${BASE}/demo`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await sleep(3500);
  await stripChrome();
  const labels = await page.evaluate(() => [...document.querySelectorAll("nav button span")].map((s) => s.textContent?.trim()));
  console.log("nav labels:", JSON.stringify(labels));

  await shot("dashboard");

  const targets = [
    [["Products", "Produktet"], "products", 2500],
    [["Orders", "Porositë"], "orders", 2000],
    [["Storefront", "Storefront Studio", "Vitrina"], "studio", 3500],
  ];
  for (const [names, file, wait] of targets) {
    let ok = false;
    for (const n of names) { if (await clickNav(n)) { ok = true; break; } }
    console.log(file, "nav clicked:", ok);
    await sleep(wait);
    await stripChrome();
    await shot(file);
  }
  console.log("DEMO CAPTURES DONE");
} finally {
  await browser.close();
}
