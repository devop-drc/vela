import { useState } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";
import { optimizedImage, optimizedSrcSet } from "@/lib/optimizedImage";

interface MediaItemProps {
  src: string;
  alt: string;
  type?: 'IMAGE' | 'VIDEO' | string | null;
  className?: string;
  /** LCP candidates (hero/detail first image): eager + high fetch priority. */
  priority?: boolean;
  /** Rendered-size hint for the responsive srcset (default: card-ish). */
  sizes?: string;
}

export const MediaItem = ({ src, alt, type, className, priority = false, sizes = "(max-width: 640px) 50vw, 320px" }: MediaItemProps) => {
  // Image-CDN delivery with a one-shot fallback: if the proxy errors (down,
  // blocked, unsupported source) we swap to the original URL and stay there.
  const [useOriginal, setUseOriginal] = useState(false);
  // Both the proxy AND the original 404'd (genuinely missing asset) — fall back
  // to the neutral placeholder instead of the browser's broken-image + alt text.
  const [failed, setFailed] = useState(false);

  // No source (common right after an Instagram import) → a neutral placeholder
  // instead of a broken-image icon (an empty src resolves to the page URL).
  if (!src || failed) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-muted text-muted-foreground", className)} aria-label={alt} role="img">
        <ImageOff className="h-6 w-6 opacity-40" />
      </div>
    );
  }

  const isVideo = type?.toUpperCase() === 'VIDEO' || src?.endsWith('.mp4') || src?.endsWith('.mov');

  if (isVideo) {
    return (
      <video
        src={src}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        className={cn("h-full w-full object-contain", className)}
        aria-label={alt}
      />
    );
  }

  const proxied = !useOriginal;
  return (
    <img
      src={proxied ? optimizedImage(src, 640) : src}
      srcSet={proxied ? optimizedSrcSet(src) : undefined}
      sizes={proxied ? sizes : undefined}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      {...(priority ? { fetchpriority: "high" } : {})}
      decoding="async"
      onError={() => { if (proxied) setUseOriginal(true); else setFailed(true); }}
      className={cn("h-full w-full object-contain", className)}
      referrerPolicy="no-referrer"
    />
  );
};
