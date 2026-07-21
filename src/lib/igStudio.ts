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

export interface StudioSettings {
  template: TemplateId;
  accent: string;
  showPrice: boolean;
  showName: boolean;
  showLogo: boolean;
  captionStyle: CaptionStyle;
  transform: ImageTransform;
}

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  template: 'gradient',
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

/** Cut the product out of its background; returns an object URL. */
export async function removeImageBackground(url: string): Promise<string> {
  const hit = cutoutCache.get(url);
  if (hit) return hit;
  const { removeBackground } = await import('@imgly/background-removal');
  // Route through wsrv for CORS + a sane size before the model runs.
  const blob = await removeBackground(proxied(url, 1080, 1350), { output: { format: 'image/png' } });
  const objectUrl = URL.createObjectURL(blob);
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
