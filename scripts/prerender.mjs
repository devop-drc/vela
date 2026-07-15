/**
 * Build-time prerender for the marketing landing page.
 *
 * Why a real browser (Puppeteer) and not string SSG: the app is a client-only
 * SPA that touches window/document/GSAP/Lenis/Supabase at runtime — rendering
 * it to a string in Node would crash. A headless browser runs it exactly like a
 * user's browser, so it's safe.
 *
 * Why we scroll before snapshotting: entrance animations start elements at
 * opacity:0 and reveal them on scroll (GSAP ScrollTrigger). If we snapshot at
 * the top, below-fold text would be captured hidden. Scrolling the whole page
 * first drives every reveal to its final *visible* state, so the static HTML is
 * fully crawlable.
 *
 * Fail-safe: ANY error here just warns and exits 0, leaving the normal SPA
 * index.html untouched — a prerender hiccup must never break the deploy.
 *
 * Output: dist/index.html gets the rendered markup injected into <div id="root">.
 * The client still uses createRoot() and re-renders identical content on top —
 * so there's no hydration-mismatch risk on this highly dynamic page; the static
 * HTML is purely for crawlers (Google / ChatGPT / Gemini / Claude) and fast paint.
 */
import http from "node:http";
import { readFile, writeFile, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = resolve(__dirname, "..", "dist");
const ROUTE = "/";            // only the landing page for now
const LANG = "sq";            // prerender the primary (Albanian) market

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".mp4": "video/mp4", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".webmanifest": "application/manifest+json",
};

function serveDist() {
  return http.createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      let filePath = join(DIST, urlPath);
      let ext = extname(filePath);
      // SPA fallback: no file extension → serve index.html so the router handles the route.
      if (!ext) {
        try { const s = await stat(filePath); if (!s.isFile()) throw 0; }
        catch { filePath = join(DIST, "index.html"); ext = ".html"; }
      }
      const body = await readFile(filePath);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404); res.end("not found");
    }
  });
}

async function main() {
  const { default: puppeteer } = await import("puppeteer");

  // Listen on an ephemeral port (0 → OS picks a free one) so repeated/overlapping
  // runs can never collide on a fixed port (EADDRINUSE). The 'error' event is
  // turned into a promise rejection so it's caught by the outer .catch and never
  // crashes the build as an uncaught exception.
  const server = serveDist();
  const PORT = await new Promise((res, rej) => {
    server.once("error", rej);
    server.listen(0, () => res(server.address().port));
  });

  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

    // Skip the splash overlay and force the primary language before the app boots.
    await page.evaluateOnNewDocument((lang) => {
      try {
        sessionStorage.setItem("vela-splash-seen", "1");
        localStorage.setItem("i18nextLng", lang);
        localStorage.setItem("landing-lang-chosen", "1");
      } catch { /* ignore */ }
    }, LANG);

    await page.goto(`http://localhost:${PORT}${ROUTE}`, { waitUntil: "networkidle0", timeout: 60000 });
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});

    // Drive every ScrollTrigger reveal to its final visible state, then return to top.
    await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const step = Math.round(window.innerHeight * 0.8);
      for (let y = 0; y <= document.body.scrollHeight; y += step) { window.scrollTo(0, y); await sleep(120); }
      window.scrollTo(0, document.body.scrollHeight); await sleep(300);
      window.scrollTo(0, 0); await sleep(500);
    });

    const { html, len } = await page.evaluate(() => {
      const root = document.getElementById("root");
      return { html: root ? root.innerHTML : "", len: root ? root.innerText.trim().length : 0 };
    });

    // Sanity gate: if the snapshot is suspiciously empty, don't touch index.html.
    if (!html || len < 500) throw new Error(`snapshot too small (innerText ${len} chars) — leaving SPA index.html as-is`);

    const indexPath = join(DIST, "index.html");
    let index = await readFile(indexPath, "utf8");
    const rootRe = /<div id="root">\s*<\/div>/;
    if (!rootRe.test(index)) throw new Error('could not find empty <div id="root"></div> to inject into');
    index = index
      .replace(rootRe, `<div id="root">${html}</div>`)
      .replace(/<html lang="[^"]*"/, `<html lang="${LANG}"`);
    // Marker for debugging / verification.
    index = index.replace("</head>", `  <meta name="x-prerendered" content="${new Date().toISOString()}" />\n  </head>`);
    await writeFile(indexPath, index, "utf8");

    console.log(`✓ prerendered ${ROUTE} → dist/index.html (${(html.length / 1024).toFixed(1)} kB markup, ${len} chars of text)`);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.warn(`⚠ prerender skipped: ${err.message}`);
  process.exit(0); // never fail the build
});
