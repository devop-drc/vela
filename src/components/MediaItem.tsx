import { cn } from "@/lib/utils";

interface MediaItemProps {
  src: string;
  alt: string;
  type?: 'IMAGE' | 'VIDEO' | string | null;
  className?: string;
}

export const MediaItem = ({ src, alt, type, className }: MediaItemProps) => {
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