import { cn } from "@/lib/utils";

interface MediaItemProps {
  src: string;
  alt: string;
  type?: 'IMAGE' | 'VIDEO' | string | null;
  className?: string;
}

export const MediaItem = ({ src, alt, type, className }: MediaItemProps) => {
  const isVideo = type === 'VIDEO' || src?.endsWith('.mp4') || src?.endsWith('.mov');

  if (isVideo) {
    return (
      <video
        src={src}
        muted
        loop
        playsInline
        autoPlay
        className={cn("h-full w-full object-cover", className)}
        aria-label={alt}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
    />
  );
};