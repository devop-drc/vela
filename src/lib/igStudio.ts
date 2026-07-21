/**
 * Instagram Studio — template overlays rendered on product media before
 * publishing. One canvas renderer serves both the Studio previews and the
 * actual publish flow (rendered → uploaded to storage → posted).
 *
 * Product images may live on Instagram's CDN (no CORS headers), which would
 * taint the canvas — every image is therefore loaded through the wsrv.nl
 * proxy, which serves `Access-Control-Allow-Origin: *`.
 */

export type TemplateId = 'gradient' | 'banner' | 'badge' | 'card' | 'spotlight' | 'editorial' | 'frame' | 'sticker';
export type PostMode = 'light' | 'dark';

/** Mode palette — every template reads these instead of hardcoded colors. */
const MODE: Record<PostMode, {
  bg: string; panel: string; text: string; sub: string; scrim: [number, number, number]; line: string; onAccent: string;
}> = {
  dark:  { bg: '#140A0E', panel: '#1E1216', text: '#FFFFFF', sub: 'rgba(255,255,255,0.66)', scrim: [20, 10, 14], line: 'rgba(255,255,255,0.16)', onAccent: '#FFFFFF' },
  light: { bg: '#FBF6F4', panel: '#FFFFFF', text: '#221A1C', sub: 'rgba(34,26,28,0.55)', scrim: [251, 246, 244], line: 'rgba(34,26,28,0.10)', onAccent: '#FFFFFF' },
};

/** How the product image sits inside the canvas. */
export interface ImageTransform {
  scale: number;    // 1–3 zoom
  offsetX: number;  // -1..1 of the overflow range
  offsetY: number;
  fit: 'cover' | 'contain';
  removeBg: boolean;
}

export const DEFAULT_TRANSFORM: ImageTransform = { scale: 1, offsetX: 0, offsetY: 0, fit: 'cover', removeBg: false };

export interface CaptionStyle {
  structure: 'descriptive' | 'paragraph' | 'structured' | 'minimal';
  tone: 'friendly' | 'professional' | 'luxury' | 'playful';
  emojis: 'none' | 'light' | 'rich';
  hashtags: number;
  language: 'sq' | 'en';
}

export type CarouselTemplateId = 'ribbon' | 'gallery' | 'story-arc';
export type VideoTemplateId = 'gradient' | 'banner' | 'badge';
export type MediaKind = 'post' | 'story' | 'carousel' | 'video';

export interface StudioSettings {
  /** Post template (feed single image). */
  template: TemplateId;
  /** Independent styles for the other three content types. */
  storyTemplate: TemplateId;
  carouselTemplate: CarouselTemplateId;
  videoTemplate: VideoTemplateId;
  /** Light or dark post background. */
  postMode: PostMode;
  accent: string;
  showPrice: boolean;
  showName: boolean;
  showLogo: boolean;
  captionStyle: CaptionStyle;
  transform: ImageTransform;
}

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  template: 'gradient',
  storyTemplate: 'spotlight',
  carouselTemplate: 'ribbon',
  videoTemplate: 'gradient',
  postMode: 'dark',
  accent: '#A31234',
  showPrice: true,
  showName: true,
  showLogo: true,
  captionStyle: { structure: 'descriptive', tone: 'friendly', emojis: 'light', hashtags: 6, language: 'sq' },
  transform: DEFAULT_TRANSFORM,
};

export const TEMPLATE_IDS: TemplateId[] = ['gradient', 'banner', 'badge', 'card', 'spotlight', 'editorial', 'frame', 'sticker'];

/* ── background removal (client-side, lazy-loaded, cached per URL) ── */
const cutoutCache = new Map<string, string>();

/**
 * Cut the product out of its background; returns an object URL to a PNG.
 * Robust: the source is first fetched to a same-origin blob (the model needs
 * pixel access — a cross-origin URL would be tainted/blocked), the proxy is
 * contained-not-cropped so nothing is lost, and a clear error is thrown if
 * the model can't run so the caller can surface it and revert the toggle.
 */
export async function removeImageBackground(url: string): Promise<string> {
  const hit = cutoutCache.get(url);
  if (hit) return hit;

  // Fetch through the proxy to a blob so the model gets real, CORS-clean
  // pixels regardless of the source CDN's headers.
  const fetchSource = async (): Promise<Blob> => {
    const proxiedUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1080&h=1080&fit=inside&output=png`;
    for (const src of [proxiedUrl, url]) {
      try {
        const res = await fetch(src, { mode: 'cors' });
        if (res.ok) {
          const blob = await res.blob();
          if (blob.size > 0) return blob;
        }
      } catch { /* try the next source */ }
    }
    throw new Error('Could not load the image for background removal.');
  };

  let removeBackground: typeof import('@imgly/background-removal').removeBackground;
  try {
    ({ removeBackground } = await import('@imgly/background-removal'));
  } catch {
    throw new Error('Background remover failed to load. Check your connection and try again.');
  }

  const source = await fetchSource();
  const out = await removeBackground(source, {
    output: { format: 'image/png', quality: 0.9 },
  });
  const objectUrl = URL.createObjectURL(out);
  cutoutCache.set(url, objectUrl);
  return objectUrl;
}

export interface RenderInput {
  imageUrl: string;
  name: string;
  price: number | null;
  currency: string;
  shopName: string;
  settings: StudioSettings;
  format?: 'post' | 'story';
  /** True when imageUrl is a background-removed subject (draw it floating). */
  cutout?: boolean;
}

/** Remote CDN images need the CORS proxy; local/same-origin ones don't. */
const needsProxy = (url: string) => /^https?:\/\//.test(url);
const proxied = (url: string, w: number, h: number) =>
  `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${w}&h=${h}&fit=cover&output=jpg&q=90`;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the product image.'));
    img.src = src;
  });

const fmtPrice = (price: number | null, currency: string) =>
  price == null ? '' : `${Math.round(price).toLocaleString('sq-AL')} ${currency || 'ALL'}`;

const ensureFonts = async () => {
  try {
    await Promise.all([
      document.fonts.load('700 72px "Clash Display"'),
      document.fonts.load('500 44px "Satoshi"'),
    ]);
  } catch { /* fall back to sans-serif silently */ }
};

const HEAD = (px: number) => `700 ${px}px "Clash Display", system-ui, sans-serif`;
const BODY = (px: number) => `500 ${px}px "Satoshi", system-ui, sans-serif`;

const rounded = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const fitText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, font: (px: number) => string, startPx: number, minPx = 28) => {
  let px = startPx;
  ctx.font = font(px);
  while (ctx.measureText(text).width > maxWidth && px > minPx) {
    px -= 2;
    ctx.font = font(px);
  }
  return px;
};

/** Draw the product image into a rect: cover-clip for photos, contain +
 *  soft shadow for cutouts / 'contain' fit. Applies zoom + pan. */
function drawMedia(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  rect: { x: number; y: number; w: number; h: number },
  opts: { contain: boolean; scale: number; ox: number; oy: number; radius?: number; shadow?: boolean },
) {
  const { contain, scale, radius = 0 } = opts;
  if (contain) {
    const fit = Math.min(rect.w / img.width, rect.h / img.height) * scale;
    const dw = img.width * fit, dh = img.height * fit;
    const dx = rect.x + (rect.w - dw) / 2 + opts.ox * rect.w * 0.25;
    const dy = rect.y + (rect.h - dh) / 2 + opts.oy * rect.h * 0.25;
    if (opts.shadow) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 34; }
    ctx.drawImage(img, dx, dy, dw, dh);
    if (opts.shadow) ctx.restore();
  } else {
    const cover = Math.max(rect.w / img.width, rect.h / img.height) * scale;
    const dw = img.width * cover, dh = img.height * cover;
    const ex = (dw - rect.w) / 2, ey = (dh - rect.h) / 2;
    ctx.save();
    if (radius) rounded(ctx, rect.x, rect.y, rect.w, rect.h, radius); else ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.drawImage(img, rect.x - ex + opts.ox * ex, rect.y - ey + opts.oy * ey, dw, dh);
    ctx.restore();
  }
}

/** A rounded pill with centered text; returns its width. */
function pill(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, fill: string, textColor: string, fontPx = 44) {
  ctx.font = BODY(fontPx);
  const tw = ctx.measureText(text).width;
  const pw = tw + fontPx * 1.6, ph = fontPx * 2.05;
  ctx.fillStyle = fill;
  rounded(ctx, cx - pw / 2, cy - ph / 2, pw, ph, ph / 2);
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.fillText(text, cx, cy + 2);
  return pw;
}

/** Render one template composition into `canvas`. */
export async function renderTemplate(canvas: HTMLCanvasElement, input: RenderInput): Promise<void> {
  const { settings } = input;
  const W = 1080;
  const H = input.format === 'story' ? 1920 : 1350;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  await ensureFonts();

  const tpl = settings.template;
  const m = MODE[settings.postMode ?? 'dark'];
  const accent = settings.accent || '#A31234';
  const accentBright = accent.toUpperCase() === '#A31234' ? '#FF2E4D' : accent;
  const name = settings.showName ? input.name : '';
  const price = settings.showPrice ? fmtPrice(input.price, input.currency) : '';
  const shop = settings.showLogo ? input.shopName : '';
  const transform = settings.transform ?? DEFAULT_TRANSFORM;
  const cutout = Boolean(input.cutout) || input.imageUrl.startsWith('blob:');
  const scale = Math.min(Math.max(transform.scale || 1, 0.4), 3);
  const scrim = (a: number) => `rgba(${m.scrim[0]},${m.scrim[1]},${m.scrim[2]},${a})`;

  ctx.fillStyle = m.bg;
  ctx.fillRect(0, 0, W, H);

  // Templates where a solid mode panel/margin frames the media.
  const media =
    tpl === 'card' ? { x: 80, y: 96, w: W - 160, h: Math.round(H * 0.60) }
    : tpl === 'editorial' ? { x: 0, y: 0, w: W, h: Math.round(H * 0.62) }
    : tpl === 'spotlight' ? { x: 130, y: 180, w: W - 260, h: Math.round(H * 0.52) }
    : { x: 0, y: 0, w: W, h: H };

  const img = await loadImage(cutout || !needsProxy(input.imageUrl) ? input.imageUrl : proxied(input.imageUrl, media.w, media.h));

  // Spotlight radial glow sits behind the (usually cut-out) product.
  if (tpl === 'spotlight') {
    const glow = ctx.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.42, W * 0.78);
    glow.addColorStop(0, accent + 'B0');
    glow.addColorStop(0.5, accent + '33');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  const contain = cutout || transform.fit === 'contain' || tpl === 'spotlight';
  drawMedia(ctx, img, media, {
    contain, scale, ox: transform.offsetX, oy: transform.offsetY,
    radius: tpl === 'card' ? 40 : 0,
    shadow: cutout || tpl === 'spotlight',
  });
  // Card gets a hairline around the media.
  if (tpl === 'card' && !contain) {
    ctx.strokeStyle = m.line; ctx.lineWidth = 2;
    rounded(ctx, media.x, media.y, media.w, media.h, 40); ctx.stroke();
  }

  ctx.textBaseline = 'middle';

  switch (tpl) {
    /* full-bleed photo, bottom scrim, stacked copy */
    case 'gradient': {
      const gh = Math.round(H * 0.44);
      const g = ctx.createLinearGradient(0, H - gh, 0, H);
      g.addColorStop(0, scrim(0)); g.addColorStop(0.55, scrim(0.72)); g.addColorStop(1, scrim(0.97));
      ctx.fillStyle = g; ctx.fillRect(0, H - gh, W, gh);
      let y = H - 92;
      if (shop) { ctx.textAlign = 'left'; ctx.font = BODY(32); ctx.fillStyle = m.sub; ctx.fillText(shop.toUpperCase(), 56, y); y -= 66; }
      if (price) { ctx.textAlign = 'left'; ctx.font = HEAD(60); ctx.fillStyle = accentBright; ctx.fillText(price, 56, y); y -= 90; }
      if (name) { ctx.textAlign = 'left'; ctx.fillStyle = m.text; fitText(ctx, name, W - 112, HEAD, 78); ctx.fillText(name, 56, y, W - 112); }
      break;
    }

    /* full-bleed photo, solid panel bar bottom */
    case 'banner': {
      const bh = 168, by = H - bh;
      ctx.fillStyle = m.panel; ctx.fillRect(0, by, W, bh);
      ctx.fillStyle = accent; ctx.fillRect(0, by, W, 7);
      if (name) { ctx.textAlign = 'left'; ctx.fillStyle = m.text; fitText(ctx, name, price ? W - 440 : W - 112, HEAD, 54); ctx.fillText(name, 52, by + bh / 2 + 2, price ? W - 440 : W - 112); }
      if (price) pill(ctx, price, W - 52 - (ctx.measureText(price).width + 64) / 2, by + bh / 2, accent, m.onAccent, 42);
      break;
    }

    /* clean photo, just a corner price tag + small handle */
    case 'badge': {
      if (price) {
        ctx.font = BODY(46); const tw = ctx.measureText(price).width;
        const pw = tw + 74, ph = 96, bx = W - pw - 48, by = 48;
        pill(ctx, price, bx + pw / 2, by + ph / 2, accent, m.onAccent, 46);
      }
      if (shop) {
        ctx.font = BODY(36); ctx.textAlign = 'left';
        ctx.fillStyle = (settings.postMode ?? "dark") === 'light' ? scrim(0.85) : 'rgba(255,255,255,0.94)';
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 14;
        ctx.fillText('@' + shop.toLowerCase().replace(/\s+/g, ''), 48, H - 64);
        ctx.shadowBlur = 0;
      }
      break;
    }

    /* photo in a rounded card on a solid mode background, copy below */
    case 'card': {
      let y = media.y + media.h + 96;
      if (name) { ctx.textAlign = 'center'; ctx.fillStyle = m.text; fitText(ctx, name, W - 200, HEAD, 66); ctx.fillText(name, W / 2, y, W - 200); y += 92; }
      if (price) { ctx.textAlign = 'center'; ctx.font = HEAD(52); ctx.fillStyle = accentBright; ctx.fillText(price, W / 2, y); }
      if (shop) { ctx.textAlign = 'center'; ctx.font = BODY(30); ctx.fillStyle = m.sub; ctx.fillText('@' + shop.toLowerCase().replace(/\s+/g, ''), W / 2, H - 70); }
      break;
    }

    /* cut-out product on accent glow, centered copy */
    case 'spotlight': {
      let y = H - 118;
      if (price) { pill(ctx, price, W / 2, y - 46, accent, m.onAccent, 46); y -= 148; }
      if (name) { ctx.textAlign = 'center'; ctx.fillStyle = m.text; fitText(ctx, name, W - 160, HEAD, 74); ctx.fillText(name, W / 2, y, W - 160); }
      if (shop) { ctx.textAlign = 'center'; ctx.font = BODY(30); ctx.fillStyle = m.sub; ctx.fillText(shop.toUpperCase(), W / 2, 90); }
      break;
    }

    /* photo top, magazine panel below with big name + rule */
    case 'editorial': {
      const py = media.h;
      ctx.fillStyle = m.panel; ctx.fillRect(0, py, W, H - py);
      const cx = 64;
      let y = py + 92;
      if (shop) { ctx.textAlign = 'left'; ctx.font = BODY(28); ctx.fillStyle = accent; ctx.fillText(shop.toUpperCase(), cx, y); y += 30; }
      ctx.fillStyle = accent; ctx.fillRect(cx, y, 64, 6); y += 54;
      if (name) { ctx.textAlign = 'left'; ctx.fillStyle = m.text; fitText(ctx, name, W - 128, HEAD, 72); ctx.fillText(name, cx, y, W - 128); y += 88; }
      if (price) { ctx.textAlign = 'left'; ctx.font = BODY(48); ctx.fillStyle = m.sub; ctx.fillText(price, cx, y); }
      break;
    }

    /* photo inside a double border + centered caption chip */
    case 'frame': {
      ctx.strokeStyle = accent; ctx.lineWidth = 12; ctx.strokeRect(40, 40, W - 80, H - 80);
      ctx.strokeStyle = (settings.postMode ?? "dark") === 'light' ? scrim(0.9) : 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.strokeRect(62, 62, W - 124, H - 124);
      const label = [name, price].filter(Boolean).join('   ·   ');
      if (label) {
        const px = fitText(ctx, label, W - 300, BODY, 42);
        ctx.font = BODY(px); const tw = ctx.measureText(label).width;
        const bw = tw + 96, bh = 104;
        ctx.fillStyle = m.panel; rounded(ctx, (W - bw) / 2, H - 168, bw, bh, 20); ctx.fill();
        ctx.fillStyle = m.text; ctx.textAlign = 'center'; ctx.fillText(label, W / 2, H - 168 + bh / 2 + 2);
      }
      if (shop) {
        ctx.font = BODY(30); const tw = ctx.measureText(shop).width;
        pill(ctx, shop, W / 2, 96, accent, m.onAccent, 30);
        void tw;
      }
      break;
    }

    /* playful — rotated price sticker + shop tag */
    case 'sticker': {
      if (price) {
        ctx.save();
        ctx.translate(W - 176, 176); ctx.rotate(-0.14);
        ctx.font = HEAD(52); const tw = ctx.measureText(price).width;
        const r = Math.max(tw / 2 + 46, 96);
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, r - 12, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = m.onAccent; ctx.textAlign = 'center'; ctx.fillText(price, 0, 2);
        ctx.restore();
      }
      if (name || shop) {
        const label = name || shop;
        ctx.font = HEAD(46); const tw = ctx.measureText(label).width;
        const bw = Math.min(tw + 72, W - 96), bh = 100;
        ctx.save(); ctx.translate(56, H - 120); ctx.rotate(-0.03);
        ctx.fillStyle = m.panel; rounded(ctx, 0, 0, bw, bh, 16); ctx.fill();
        ctx.fillStyle = accent; ctx.fillRect(0, 0, 10, bh);
        ctx.fillStyle = m.text; ctx.textAlign = 'left'; ctx.font = HEAD(46); ctx.fillText(label, 32, bh / 2 + 2, bw - 56);
        ctx.restore();
      }
      break;
    }
  }
}

/** Render and hand back a JPEG blob ready for storage upload. */
export async function renderToJpegBlob(input: RenderInput): Promise<Blob> {
  const canvas = document.createElement('canvas');
  await renderTemplate(canvas, input);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not export the design.'))), 'image/jpeg', 0.92)
  );
}

/* ══ Connected carousel ══════════════════════════════════════════════════
 * Slides are windows into ONE virtual panorama (total width = n × 1080):
 * the accent ribbon, baseline and swipe arrows are drawn in panorama
 * coordinates and offset per slide, so every element flows seamlessly
 * across slide boundaries when the viewer swipes. */

export interface CarouselInput {
  images: string[];              // one per slide (1-10); reused cyclically if short
  name: string;
  price: number | null;
  currency: string;
  shopName: string;
  settings: StudioSettings;
  slideCount?: number;           // default: images.length (min 2, max 10)
}

export async function renderCarouselSlide(canvas: HTMLCanvasElement, input: CarouselInput, index: number): Promise<void> {
  const W = 1080, H = 1350;
  const n = Math.min(Math.max(input.slideCount ?? input.images.length, 2), 10);
  const total = W * n;
  const off = index * W; // panorama → slide space: x_slide = x_pan - off
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  await ensureFonts();
  const s = input.settings;
  const accent = s.accent || '#A31234';
  const tpl = s.carouselTemplate || 'ribbon';
  const price = s.showPrice ? fmtPrice(input.price, input.currency) : '';
  const isLast = index === n - 1;

  // Shared canvas background per template family
  const dark = tpl !== 'gallery';
  ctx.fillStyle = dark ? '#140A0E' : '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Panorama-space diagonal ribbon (crosses every boundary)
  if (tpl !== 'gallery') {
    ctx.save();
    ctx.translate(-off, 0);
    const grad = ctx.createLinearGradient(0, 0, total, 0);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, '#FF2E4D');
    ctx.strokeStyle = grad;
    ctx.lineWidth = tpl === 'story-arc' ? 10 : 26;
    ctx.beginPath();
    if (tpl === 'story-arc') {
      // gentle sine arc through the whole panorama
      for (let x = 0; x <= total; x += 24) {
        const y = H * 0.5 + Math.sin((x / total) * Math.PI * 2.2) * H * 0.16;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    } else {
      ctx.moveTo(-60, H * 0.78);
      ctx.lineTo(total + 60, H * 0.22);
    }
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Media card per slide, slightly offset alternately so the flow feels alive
  const carSrc = input.images[index % input.images.length];
  const img = await loadImage(needsProxy(carSrc) ? proxied(carSrc, 840, 900) : carSrc);
  const cardW = tpl === 'gallery' ? 900 : 820;
  const cardH = tpl === 'gallery' ? 980 : 880;
  const cx = (W - cardW) / 2;
  const cy = (H - cardH) / 2 + (tpl === 'gallery' ? 0 : (index % 2 === 0 ? -40 : 40));
  ctx.save();
  rounded(ctx, cx, cy, cardW, cardH, 28);
  ctx.clip();
  const cover = Math.max(cardW / img.width, cardH / img.height);
  ctx.drawImage(img, cx + (cardW - img.width * cover) / 2, cy + (cardH - img.height * cover) / 2, img.width * cover, img.height * cover);
  ctx.restore();
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.16)' : 'rgba(20,10,14,0.1)';
  ctx.lineWidth = 2;
  rounded(ctx, cx, cy, cardW, cardH, 28);
  ctx.stroke();

  // Continuous baseline + slide counter dots (panorama-aware)
  ctx.save();
  ctx.translate(-off, 0);
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.25)' : 'rgba(20,10,14,0.18)';
  ctx.fillRect(80, H - 96, total - 160, 4);
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(80 + ((total - 160) / (n - 1)) * i, H - 94, i === index ? 14 : 8, 0, Math.PI * 2);
    ctx.fillStyle = i === index ? accent : (dark ? 'rgba(255,255,255,0.35)' : 'rgba(20,10,14,0.25)');
    ctx.fill();
  }
  ctx.restore();

  ctx.textBaseline = 'middle';
  // Swipe arrow straddling the right boundary (not on the last slide)
  if (!isLast) {
    ctx.font = HEAD(64);
    ctx.textAlign = 'left';
    ctx.fillStyle = accent;
    ctx.fillText('⟶', W - 70, H / 2);
  }

  // Copy: name on slide 1, price + CTA on the last, shop pill on every slide
  if (input.shopName && s.showLogo) {
    ctx.font = BODY(28);
    ctx.textAlign = 'center';
    const tw = ctx.measureText(input.shopName).width;
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(20,10,14,0.06)';
    rounded(ctx, (W - tw - 56) / 2, 40, tw + 56, 60, 999);
    ctx.fill();
    ctx.fillStyle = dark ? '#FFFFFF' : '#140A0E';
    ctx.fillText(input.shopName, W / 2, 71);
  }
  if (index === 0 && s.showName && input.name) {
    ctx.textAlign = 'left';
    ctx.fillStyle = dark ? '#FFFFFF' : '#140A0E';
    fitText(ctx, input.name, W - 200, HEAD, 60);
    ctx.shadowColor = dark ? 'rgba(0,0,0,0.6)' : 'transparent';
    ctx.shadowBlur = 16;
    ctx.fillText(input.name, 88, cy + cardH - 60, cardW - 100);
    ctx.shadowBlur = 0;
  }
  if (isLast && price) {
    ctx.font = BODY(46);
    const tw = ctx.measureText(price).width;
    const pw = tw + 80, ph = 96;
    ctx.fillStyle = accent;
    rounded(ctx, (W - pw) / 2, cy + cardH - ph / 2, pw, ph, ph / 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(price, W / 2, cy + cardH + 2);
  }
}

/** Render every slide of the connected carousel as JPEG blobs. */
export async function renderCarouselToBlobs(input: CarouselInput): Promise<Blob[]> {
  const n = Math.min(Math.max(input.slideCount ?? input.images.length, 2), 10);
  const out: Blob[] = [];
  for (let i = 0; i < n; i++) {
    const canvas = document.createElement('canvas');
    await renderCarouselSlide(canvas, input, i);
    out.push(await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('export failed'))), 'image/jpeg', 0.92)));
  }
  return out;
}
