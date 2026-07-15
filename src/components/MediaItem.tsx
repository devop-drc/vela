import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

interface MediaItemProps {
  src: string;
  alt: string;
  type?: 'IMAGE' | 'VIDEO' | string | null;
  className?: string;
}

export const MediaItem = ({ src, alt, type, className }: MediaItemProps) => {
  // No source (common right after an Instagram import) → a neutral placeholder
  // instead of a broken-image icon (an empty src resolves to the page URL).
  if (!src) {
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

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("h-full w-full object-contain", className)}
      referrerPolicy="no-referrer"
    />
  );
};