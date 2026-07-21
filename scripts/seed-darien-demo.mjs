/**
 * One-off: seed mock catalog + orders into the Darien demo account so the app
 * UI has believable data for marketing screenshots. Anon-key sign-in + RLS
 * inserts (same as seed-dyqani-yt). Creds via env: DARIEN_EMAIL / DARIEN_PASS.
 * Keeps the account's existing shop slug; seeds products only when the shop has
 * <3 products so re-runs don't pile up duplicates.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf-8");
const URL = env.match(/VITE_SUPABASE_URL="?([^"\r\n]+)/)?.[1];
const KEY = env.match(/VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY="?([^"\r\n]+)/)?.[1];
if (!URL || !KEY) throw new Error("env keys missing");

const EMAIL = process.env.DARIEN_EMAIL;
const PASS = process.env.DARIEN_PASS;
if (!EMAIL || !PASS) throw new Error("Set DARIEN_EMAIL and DARIEN_PASS");
const supabase = createClient(URL, KEY);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;
const CATS = ["Teknologji", "Moda & Veshje", "Këpucë", "Aksesorë", "Bizhuteri", "Shtëpi"];
const PRODUCTS = [
  { name: "iPhone 15 Pro", cat: "Teknologji", price: 145000, inv: 6, img: U("1592750475338-74b7b21085ab"), tags: ["apple", "smartphone"] },
  { name: "Kufje Bluetooth Pro", cat: "Teknologji", price: 8900, inv: 22, img: U("1505740420928-5e560c06d30e"), tags: ["audio", "wireless"] },
  { name: "Orë Smart Fit", cat: "Teknologji", price: 12500, inv: 14, img: U("1523275335684-37898b6baf30"), tags: ["smartwatch"] },
  { name: "Fustan liri veror", cat: "Moda & Veshje", price: 3500, inv: 18, img: U("1595777457583-95e059d581b8"), tags: ["fustan", "verë"] },
  { name: "Xhaketë lëkure", cat: "Moda & Veshje", price: 8900, inv: 7, img: U("1551028719-00167b16eac5"), tags: ["xhaketë"] },
  { name: "Bluzë pambuku", cat: "Moda & Veshje", price: 1900, inv: 40, img: U("1576566588028-4147f3842f27"), tags: ["bluzë"] },
  { name: "Atlete Vrapi Air", cat: "Këpucë", price: 11900, inv: 12, img: U("1542291026-7eec264c27ff"), tags: ["atlete", "sport"] },
  { name: "Sneakers Classic", cat: "Këpucë", price: 7500, inv: 16, img: U("1600185365926-3a2ce3cdb9eb"), tags: ["sneakers"] },
  { name: "Çantë shpine urbane", cat: "Aksesorë", price: 4900, inv: 20, img: U("1553062407-98eeb64c6a62"), tags: ["çantë"] },
  { name: "Syze dielli Aviator", cat: "Aksesorë", price: 2900, inv: 25, img: U("1572635196237-14b3f281503f"), tags: ["syze"] },
  { name: "Çantë dore lëkure", cat: "Aksesorë", price: 6900, inv: 9, img: U("1548036328-c9fa89d128fa"), tags: ["çantë"] },
  { name: "Unazë argjendi", cat: "Bizhuteri", price: 3900, inv: 15, img: U("1605100804763-247f67b3557e"), tags: ["unazë"] },
  { name: "Varëse ari 14K", cat: "Bizhuteri", price: 18500, inv: 4, img: U("1599643478518-a784e5dc4c8f"), tags: ["varëse", "ar"] },
  { name: "Qiri aromatik soje", cat: "Shtëpi", price: 1500, inv: 30, img: U("1603006905003-be475563bc59"), tags: ["qiri", "shtëpi"] },
];
const CUSTOMERS = [
  ["Ana Krasniqi", "ana.k@example.com"], ["Bledi Marku", "bledi.m@example.com"],
  ["Sara Dervishi", "sara.d@example.com"], ["Erion Kola", "erion.k@example.com"],
  ["Mirela Hoxha", "mirela.h@example.com"], ["Andi Prifti", "andi.p@example.com"],
  ["Lediana Basha", "led.b@example.com"], ["Gent Shehu", "gent.s@example.com"],
];

/* 1 · sign in (account already exists) */
const { data: sd, error: se } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASS });
if (se) throw se;
const session = sd.session;
const uid = session.user.id;
console.log("signed in:", uid);

/* 2 · business */
let biz = null;
for (let i = 0; i < 12 && !biz; i++) {
  const { data } = await supabase.from("businesses").select("id, name").eq("user_id", uid).maybeSingle();
  biz = data;
  if (!biz) await sleep(1000);
}
if (!biz) throw new Error("no business for this user");
console.log("business:", biz.id, biz.name);

/* 3 · shop details — keep existing slug, enrich copy for nicer screenshots */
const { data: existingShop } = await supabase.from("shop_details").select("slug").eq("business_id", biz.id).maybeSingle();
await supabase.from("shop_details").update({
  headline: "Koleksioni i verës ☀️",
  about: "Nga postimet e Instagramit te dyqani yt online — teknologji, modë, bizhuteri e më shumë.",
  currency: "ALL",
}).eq("business_id", biz.id);
console.log("shop slug (kept):", existingShop?.slug);

/* 4 · categories + products (only when the shop is near-empty) */
const { data: existing } = await supabase.from("products").select("id").eq("business_id", biz.id).limit(3);
if (existing && existing.length >= 3) {
  console.log(`shop already has ${existing.length}+ products — skipping inserts`);
} else {
  const { error: catErr } = await supabase.from("categories").insert(CATS.map((name) => ({ name, user_id: uid })));
  if (catErr && !/duplicate/i.test(catErr.message)) console.log("categories:", catErr.message);

  const rows = PRODUCTS.map((p, i) => ({
    user_id: uid,
    business_id: biz.id,
    name: p.name,
    status: "Active",
    price: p.price,
    inventory: p.inv,
    currency: "ALL",
    category: p.cat,
    media_url: p.img,
    thumbnail_url: p.img,
    media_type: "IMAGE",
    caption: `${p.name} ✨ çmimi ${p.price.toLocaleString("sq-AL")} L`,
    tags: p.tags,
    created_at: new Date(Date.now() - (PRODUCTS.length - i) * 36e5 * 30).toISOString(),
  }));
  const { data: inserted, error: prodErr } = await supabase.from("products").insert(rows).select("id, name, price");
  if (prodErr) throw prodErr;
  console.log("products:", inserted.length);

  /* 5 · orders over ~6 months */
  const STATUSES = ["Fulfilled", "Fulfilled", "Fulfilled", "Given to Courier", "Order Packaged", "Pending", "Pending"];
  const orders = [];
  for (let i = 0; i < 30; i++) {
    const p = inserted[Math.floor(Math.random() * inserted.length)];
    const qty = Math.random() < 0.8 ? 1 : 2;
    const [cn, ce] = CUSTOMERS[i % CUSTOMERS.length];
    const daysAgo = Math.floor(Math.pow(Math.random(), 1.6) * 180);
    orders.push({
      business_id: biz.id, customer_name: cn, customer_email: ce,
      status: STATUSES[i % STATUSES.length],
      total_amount: Number(p.price) * qty, currency: "ALL",
      payment_method: Math.random() < 0.6 ? "cash" : "card",
      payment_status: Math.random() < 0.8 ? "paid" : "pending",
      shipping_address: "Rr. Myslym Shyri 12", shipping_city: "Tiranë", shipping_country: "AL",
      created_at: new Date(Date.now() - daysAgo * 864e5 - Math.random() * 864e5).toISOString(),
      _pid: p.id, _qty: qty, _price: p.price,
    });
  }
  for (const o of orders) {
    const { _pid, _qty, _price, ...row } = o;
    const { data: ins, error: oErr } = await supabase.from("orders").insert(row).select("id").single();
    if (oErr) { console.log("order err:", oErr.message); continue; }
    await supabase.from("order_items").insert({ order_id: ins.id, product_id: _pid, quantity: _qty, price_at_purchase: _price });
  }
  console.log("orders seeded");
}
console.log("DONE");
