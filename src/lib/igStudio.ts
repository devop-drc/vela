/**
 * Instagram Studio — template overlays rendered on product media before
 * publishing. One canvas renderer serves both the Studio previews and the
 * actual publish flow (rendered → uploaded to storage → posted).
 *
 * Product images may live on Instagram's CDN (no CORS headers), which would
 * taint the canvas — every image is therefore loaded through the wsrv.nl
 * proxy, which serves `Access-Control-Allow-Origin: *`.
 */

export type TemplateId = 'plain' | 'badge' | 'banner' | 'gradient' | 'frame' | 'polaroid' | 'spotlight' | 'minimal' | 'split';

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
  accent: '#A31234',
  showPrice: true,
  showName: true,
  showLogo: true,
  captionStyle: { structure: 'descriptive', tone: 'friendly', emojis: 'light', hashtags: 6, language: 'sq' },
  transform: DEFAULT_TRANSFORM,
};

export const TEMPLATE_IDS: TemplateId[] = ['plain', 'badge', 'banner', 'gradient', 'frame', 'polaroid', 'spotlight', 'minimal', 'split'];

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
}

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

/** Render one template composition into `canvas`. */
export async function renderTemplate(canvas: HTMLCanvasElement, input: RenderInput): Promise<void> {
  const { settings } = input;
  const W = 1080;
  const H = input.format === 'story' ? 1920 : 1350;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  await ensureFonts();

  const accent = settings.accent || '#A31234';
  const name = settings.showName ? input.name : '';
  const price = settings.showPrice ? fmtPrice(input.price, input.currency) : '';
  const shop = settings.showLogo ? input.shopName : '';

  const transform = settings.transform ?? DEFAULT_TRANSFORM;
  // blob: URLs are pre-processed cutouts — same-origin, drawn directly.
  const isBlob = input.imageUrl.startsWith('blob:');

  // Media area per template (the rest is chrome).
  const matte =
    settings.template === 'polaroid' ? { x: 60, y: 60, w: W - 120, h: H - 320 }
    : settings.template === 'minimal' ? { x: 90, y: 90, w: W - 180, h: Math.round(H * 0.62) }
    : settings.template === 'spotlight' ? { x: 110, y: 150, w: W - 220, h: Math.round(H * 0.58) }
    : settings.template === 'split' ? { x: 0, y: 0, w: W, h: Math.round(H * 0.72) }
    : { x: 0, y: 0, w: W, h: H };

  const img = await loadImage(isBlob ? input.imageUrl : proxied(input.imageUrl, matte.w, matte.h));

  // Backdrop
  if (settings.template === 'minimal') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);
  } else if (settings.template === 'spotlight') {
    ctx.fillStyle = '#140A0E';
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.42, W * 0.75);
    glow.addColorStop(0, accent + 'AA');
    glow.addColorStop(0.55, accent + '33');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  } else if (settings.template === 'polaroid') {
    ctx.fillStyle = '#FBF6F4';
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = '#140A0E';
    ctx.fillRect(0, 0, W, H);
  }

  // Draw the media with zoom/offset. Cutouts and 'contain' keep the whole
  // subject visible; 'cover' fills the matte and pans inside the overflow.
  const useContain = transform.fit === 'contain' || isBlob || settings.template === 'spotlight' || settings.template === 'minimal';
  const scale = Math.min(Math.max(transform.scale || 1, 0.4), 3);
  if (useContain) {
    const fitScale = Math.min(matte.w / img.width, matte.h / img.height) * scale;
    const dw = img.width * fitScale, dh = img.height * fitScale;
    const dx = matte.x + (matte.w - dw) / 2 + transform.offsetX * matte.w * 0.25;
    const dy = matte.y + (matte.h - dh) / 2 + transform.offsetY * matte.h * 0.25;
    if (settings.template === 'spotlight') {
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 70;
      ctx.shadowOffsetY = 40;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  } else {
    const coverScale = Math.max(matte.w / img.width, matte.h / img.height) * scale;
    const dw = img.width * coverScale, dh = img.height * coverScale;
    const ox = (dw - matte.w) / 2, oy = (dh - matte.h) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(matte.x, matte.y, matte.w, matte.h);
    ctx.clip();
    ctx.drawImage(img, matte.x - ox + transform.offsetX * ox, matte.y - oy + transform.offsetY * oy, dw, dh);
    ctx.restore();
  }

  ctx.textBaseline = 'middle';

  switch (settings.template) {
    case 'plain':
      break;

    case 'badge': {
      if (price) {
        ctx.font = BODY(44);
        const tw = ctx.measureText(price).width;
        const bw = tw + 72, bh = 92, bx = W - bw - 48, by = 48;
        ctx.fillStyle = accent;
        rounded(ctx, bx, by, bw, bh, bh / 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(price, bx + bw / 2, by + bh / 2 + 2);
      }
      if (shop) {
        ctx.font = BODY(34);
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 12;
        ctx.fillText(shop, 48, H - 64);
        ctx.shadowBlur = 0;
      }
      break;
    }

    case 'banner': {
      const bh = 150, by = H - bh;
      ctx.fillStyle = 'rgba(20,10,14,0.94)';
      ctx.fillRect(0, by, W, bh);
      ctx.fillStyle = accent;
      ctx.fillRect(0, by, W, 6);
      if (name) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFFFFF';
        fitText(ctx, name, price ? W - 420 : W - 96, HEAD, 52);
        ctx.fillText(name, 48, by + bh / 2 + 2, price ? W - 420 : W - 96);
      }
      if (price) {
        ctx.font = BODY(42);
        const tw = ctx.measureText(price).width;
        const pw = tw + 64, ph = 84;
        ctx.fillStyle = accent;
        rounded(ctx, W - pw - 48, by + (bh - ph) / 2, pw, ph, ph / 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(price, W - pw / 2 - 48, by + bh / 2 + 2);
      }
      break;
    }

    case 'gradient': {
      const gh = Math.round(H * 0.42);
      const grad = ctx.createLinearGradient(0, H - gh, 0, H);
      grad.addColorStop(0, 'rgba(20,10,14,0)');
      grad.addColorStop(0.55, 'rgba(20,10,14,0.72)');
      grad.addColorStop(1, 'rgba(20,10,14,0.96)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, H - gh, W, gh);
      let y = H - 92;
      if (shop) {
        ctx.textAlign = 'left';
        ctx.font = BODY(32);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText(shop.toUpperCase(), 56, y);
        y -= 66;
      }
      if (price) {
        ctx.textAlign = 'left';
        ctx.font = HEAD(58);
        ctx.fillStyle = accent === '#A31234' ? '#FF2E4D' : accent;
        ctx.fillText(price, 56, y);
        y -= 88;
      }
      if (name) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFFFFF';
        fitText(ctx, name, W - 112, HEAD, 76);
        ctx.fillText(name, 56, y, W - 112);
      }
      break;
    }

    case 'frame': {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 10;
      ctx.strokeRect(36, 36, W - 72, H - 72);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.strokeRect(56, 56, W - 112, H - 112);
      if (name || price) {
        const label = [name, price].filter(Boolean).join('  ·  ');
        ctx.font = BODY(40);
        const px = fitText(ctx, label, W - 260, BODY, 40);
        const tw = ctx.measureText(label).width;
        const bw = tw + 88, bh = 96;
        ctx.fillStyle = 'rgba(20,10,14,0.92)';
        rounded(ctx, (W - bw) / 2, H - 150, bw, bh, 18);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.font = BODY(px);
        ctx.fillText(label, W / 2, H - 150 + bh / 2 + 2);
      }
      if (shop) {
        ctx.font = BODY(30);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        const tw = ctx.measureText(shop).width;
        ctx.fillStyle = accent;
        rounded(ctx, (W - tw - 64) / 2, 24, tw + 64, 56, 12);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(shop, W / 2, 24 + 30);
      }
      break;
    }

    case 'spotlight': {
      let y = H - 110;
      if (price) {
        ctx.font = BODY(44);
        const tw = ctx.measureText(price).width;
        const pw = tw + 76, ph = 92;
        ctx.fillStyle = accent;
        rounded(ctx, (W - pw) / 2, y - ph, pw, ph, ph / 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(price, W / 2, y - ph / 2 + 2);
        y -= ph + 44;
      }
      if (name) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        fitText(ctx, name, W - 160, HEAD, 72);
        ctx.fillText(name, W / 2, y - 30, W - 160);
      }
      if (shop) {
        ctx.textAlign = 'center';
        ctx.font = BODY(30);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(shop.toUpperCase(), W / 2, 84);
      }
      break;
    }

    case 'minimal': {
      let y = matte.y + matte.h + 110;
      if (name) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#140A0E';
        fitText(ctx, name, W - 200, HEAD, 64);
        ctx.fillText(name, W / 2, y, W - 200);
        y += 96;
      }
      if (price) {
        ctx.textAlign = 'center';
        ctx.font = BODY(46);
        ctx.fillStyle = accent;
        ctx.fillText(price, W / 2, y);
      }
      if (shop) {
        ctx.textAlign = 'center';
        ctx.font = BODY(28);
        ctx.fillStyle = 'rgba(20,10,14,0.45)';
        ctx.fillText(shop.toUpperCase(), W / 2, H - 70);
      }
      // thin accent baseline under the media
      ctx.fillStyle = accent;
      ctx.fillRect(W / 2 - 60, matte.y + matte.h + 34, 120, 8);
      break;
    }

    case 'split': {
      const bandY = matte.h;
      ctx.fillStyle = '#FBF6F4';
      ctx.fillRect(0, bandY, W, H - bandY);
      ctx.fillStyle = accent;
      ctx.fillRect(0, bandY, W, 8);
      const cx = 56, cw = price ? W - 420 : W - 112;
      if (name) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#140A0E';
        fitText(ctx, name, cw, HEAD, 58);
        ctx.fillText(name, cx, bandY + (H - bandY) * 0.42, cw);
      }
      if (shop) {
        ctx.textAlign = 'left';
        ctx.font = BODY(30);
        ctx.fillStyle = 'rgba(20,10,14,0.5)';
        ctx.fillText(shop, cx, bandY + (H - bandY) * 0.72);
      }
      if (price) {
        ctx.font = BODY(42);
        const tw = ctx.measureText(price).width;
        const pw = tw + 68, ph = 88;
        ctx.fillStyle = accent;
        rounded(ctx, W - pw - 52, bandY + (H - bandY - ph) / 2, pw, ph, ph / 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(price, W - pw / 2 - 52, bandY + (H - bandY) / 2 + 2);
      }
      break;
    }

    case 'polaroid': {
      let y = H - 170;
      if (name) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#140A0E';
        fitText(ctx, name, W - 200, HEAD, 60);
        ctx.fillText(name, W / 2, y, W - 200);
        y += 84;
      }
      const line = [price, shop].filter(Boolean).join('  —  ');
      if (line) {
        ctx.textAlign = 'center';
        ctx.font = BODY(38);
        ctx.fillStyle = accent;
        ctx.fillText(line, W / 2, y);
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
  const img = await loadImage(proxied(input.images[index % input.images.length], 840, 900));
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
