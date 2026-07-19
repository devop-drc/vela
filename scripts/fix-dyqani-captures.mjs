/* 1) Seed a Studio design for the demo shop (in-browser via Vite TS imports),
   2) recapture storefront-custom/shop with a proper hero image,
   3) recapture studio.png from the /demo mirror (real Studio is plan-gated). */
import puppeteer from "puppeteer";
import fs from "fs";

const local = Object.fromEntries(
  fs.readFileSync("scripts/.demo-account.local", "utf-8").trim().split("\n").map((l) => l.split("=")),
);
const BASE = `http://localhost:${process.env.PORT || "5175"}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HERO_IMG = "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&q=80"; // shopping street

const b = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

try {
  await p.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2000);
  await p.type('input[type="email"]', local.email, { delay: 10 });
  await p.type('input[type="password"]', local.password, { delay: 10 });
  await p.keyboard.press("Enter");
  await sleep(6500);

  const result = await p.evaluate(async (heroImg) => {
    const { TEMPLATES } = await import("/src/storefront/templates/index.ts");
    const { supabase } = await import("/src/integrations/supabase/client.ts");
    const names = TEMPLATES.map((t) => t.name || t.id);
    const tpl = TEMPLATES.find((t) => /vivid|boutique|studio/i.test(t.name || t.id)) || TEMPLATES[0];
    const config = JSON.parse(JSON.stringify(tpl.config));
    config.hero = { mediaUrl: heroImg, mediaType: "image" };
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: "no session" };
    const { error } = await supabase
      .from("design_settings")
      .upsert({ user_id: session.user.id, settings: { storefront: config } }, { onConflict: "user_id" });
    return { error: error?.message || null, used: tpl.name || tpl.id, names };
  }, HERO_IMG);
  console.log("design seed:", JSON.stringify(result));
  if (result.error) throw new Error(result.error);

  /* recapture custom storefront */
  await p.goto(`${BASE}/shop/${local.slug}?preview=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await sleep(8000); // let unsplash media land
  await p.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  await p.screenshot({ path: "public/hero/storefront-custom.png" });
  await p.screenshot({ path: "public/hero/storefront-shop.png" });
  console.log("storefront recaptured");

  /* studio from the demo mirror */
  await p.goto(`${BASE}/demo`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await sleep(4000);
  await p.evaluate(() => {
    [...document.querySelectorAll("div")].find((d) => /Interactive demo with sample data/i.test(d.textContent || "") && d.className.includes("border-b") && d.querySelectorAll("*").length < 6)?.remove();
    const btn = [...document.querySelectorAll("nav button")].find((x) => (x.textContent || "").trim() === "Storefront Studio");
    btn?.click();
  });
  await sleep(4500);
  await p.evaluate(() => {
    [...document.querySelectorAll("div")].find((d) => /Interactive demo with sample data/i.test(d.textContent || "") && d.className.includes("border-b") && d.querySelectorAll("*").length < 6)?.remove();
  });
  await sleep(600);
  await p.screenshot({ path: "public/hero/studio.png" });
  console.log("studio recaptured (demo mirror)");
} finally {
  await b.close();
}
