// Centralized image-CDN helper. Product photos are stored full-size
// (~1080px JPEG); rendering them at card size wastes ~90% of the bytes and
// tanks mobile LCP. Every customer-facing <img> funnels through here so the
// whole delivery strategy can change in ONE place.
//
// Current strategy: wsrv.nl (free, cached, WebP-converting image proxy).
// Supabase's own /render/image endpoint returns 403 on this plan — if Image
// Transformations get enabled later, swap the URL builder below and nothing
// else changes. MediaItem falls back to the original URL on proxy error.

const PROXY = "https://wsrv.nl/?url=";

/** URLs we must never proxy: local assets, data/blob URIs, and Instagram's
    signed CDN (scontent) which rejects non-browser fetchers. */
const skipProxy = (url: string): boolean =>
  !/^https?:\/\//i.test(url) ||
  /(^https?:\/\/(localhost|127\.)|scontent|cdninstagram|fbcdn)/i.test(url) ||
  /\.(mp4|mov|webm)(\?|$)/i.test(url);

export const optimizedImage = (url: string, width: number, quality = 75): string => {
  if (!url || skipProxy(url)) return url;
  return `${PROXY}${encodeURIComponent(url)}&w=${width}&q=${quality}&output=webp`;
};

/** srcset across common card/detail widths, capped at the largest useful size. */
export const optimizedSrcSet = (url: string, widths: number[] = [320, 640, 960, 1280]): string | undefined => {
  if (!url || skipProxy(url)) return undefined;
  return widths.map((w) => `${optimizedImage(url, w)} ${w}w`).join(", ");
};
