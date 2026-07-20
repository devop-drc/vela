/* Temp: print the brand book HTML to PDF + page previews. */
import puppeteer from "puppeteer";
import path from "path";
const OUT = String.raw`C:\Users\Desktop\AppData\Local\Temp\claude\C--Users-Desktop-Desktop-Work-Work-InstantShop\1d89c7f8-aeb3-448f-9a41-995fa9770cdd\scratchpad\audit`;
const b = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
await p.goto("file:///" + path.resolve("branding/guidelines/vela-brand.html").replace(/\\/g, "/"), { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 1200));
await p.pdf({ path: "branding/guidelines/Vela-Brand-Guidelines.pdf", printBackground: true, preferCSSPageSize: true });
console.log("pdf written");
/* page previews */
await p.setViewport({ width: 794, height: 1122, deviceScaleFactor: 1.4 });
const pages = await p.$$(".page");
for (let i = 0; i < pages.length; i++) {
  await pages[i].screenshot({ path: `${OUT}\\book-${i + 1}.png` });
}
console.log("previews:", pages.length);
await b.close();
