import React from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type IgChromeKind = "post" | "story" | "carousel";

export interface IgPostChromeProps {
  /** @-handle shown in the header / caption / story overlay. */
  handle: string;
  /** Optional avatar; falls back to the handle's initials. */
  avatarUrl?: string | null;
  /** The media itself (a <canvas> or <img>, or a scrollable carousel track). */
  children: React.ReactNode;
  kind: IgChromeKind;
  /** Caption body shown after the handle (feed layouts only). */
  caption?: string;
  /** Hashtags rendered in blue after the caption. */
  tags?: string;
  /** Carousel slide count — drives the "1/N" badge and the footer dots. */
  slideCount?: number;
  /** Width/appearance override for the outer frame (defaults to max-w-[340px]). */
  className?: string;
  /**
   * Story overlay richness. "full" adds the progress bars, timestamp and a
   * reply pill + heart/send; "minimal" shows only the avatar + handle.
   */
  storyOverlay?: "full" | "minimal";
  /** Optional "liked by …" line under the footer icons (feed layouts). */
  likesLabel?: string;
  /** Optional "see translation" note under the caption (feed layouts). */
  translationLabel?: string;
  /** Timestamp shown in the full story overlay (defaults to "2h"). */
  timestampLabel?: string;
  /** Placeholder text for the story reply pill (full overlay only). */
  replyLabel?: string;
}

/**
 * Realistic Instagram post / story / carousel preview chrome.
 *
 * Shared by the Instagram Studio (design preview) and the Publish-to-Instagram
 * dialog (publish preview) so the look a merchant configures in one screen can
 * never visually drift from the look they confirm in the other. All copy is
 * passed in as props to keep this component free of any i18n namespace.
 */
export const IgPostChrome = ({
  handle,
  avatarUrl,
  children,
  kind,
  caption,
  tags,
  slideCount,
  className,
  storyOverlay = "full",
  likesLabel,
  translationLabel,
  timestampLabel = "2h",
  replyLabel,
}: IgPostChromeProps) => {
  const avatar = avatarUrl
    ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
    : <div className="grid h-full w-full place-items-center bg-primary/15 text-[10px] font-bold text-primary">{handle.slice(0, 2).toUpperCase()}</div>;
  const fullscreen = kind === "story";

  return (
    <div className={cn("mx-auto w-full max-w-[340px] overflow-hidden rounded-2xl border bg-background shadow-lg", className)}>
      {!fullscreen && (
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="h-8 w-8 overflow-hidden rounded-full ring-2 ring-pink-500/60 ring-offset-1">{avatar}</span>
          <span className="text-sm font-semibold">{handle}</span>
          <MoreHorizontal className="ml-auto h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="relative">
        {children}
        {fullscreen && storyOverlay === "full" && (
          <>
            <div className="absolute inset-x-2 top-2 flex gap-1">
              <div className="h-0.5 flex-1 rounded bg-white" /><div className="h-0.5 flex-1 rounded bg-white/40" />
            </div>
            <div className="absolute left-2 top-4 flex items-center gap-2">
              <span className="h-7 w-7 overflow-hidden rounded-full">{avatar}</span>
              <span className="text-xs font-semibold text-white drop-shadow">{handle}</span>
              <span className="text-[10px] text-white/70">{timestampLabel}</span>
            </div>
            <div className="absolute inset-x-4 bottom-3 flex items-center gap-2">
              <div className="flex-1 rounded-full border border-white/60 px-3 py-1.5 text-xs text-white/80">{replyLabel}</div>
              <Heart className="h-5 w-5 text-white" /><Send className="h-5 w-5 text-white" />
            </div>
          </>
        )}
        {fullscreen && storyOverlay === "minimal" && (
          <div className="absolute left-2 top-3 flex items-center gap-2">
            <span className="h-7 w-7 overflow-hidden rounded-full">{avatar}</span>
            <span className="text-xs font-semibold text-white drop-shadow">{handle}</span>
          </div>
        )}
        {kind === "carousel" && slideCount ? (
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">1/{slideCount}</span>
        ) : null}
      </div>
      {!fullscreen && (
        <div className="space-y-1.5 px-3 py-2.5">
          <div className="flex items-center gap-3.5">
            <Heart className="h-5 w-5" /><MessageCircle className="h-5 w-5" /><Send className="h-5 w-5" />
            {kind === "carousel" && (
              <span className="mx-auto flex gap-1">
                {Array.from({ length: Math.min(slideCount ?? 3, 6) }).map((_, i) => (
                  <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i === 0 ? "bg-primary" : "bg-muted-foreground/40")} />
                ))}
              </span>
            )}
            <Bookmark className="ml-auto h-5 w-5" />
          </div>
          {likesLabel && <p className="text-xs font-semibold">{likesLabel}</p>}
          {(caption || tags) && (
            <p className="whitespace-pre-line text-xs leading-snug">
              <span className="font-semibold">{handle}</span> {caption}
              {tags && <span className="text-blue-600 dark:text-blue-400"> {tags}</span>}
            </p>
          )}
          {translationLabel && <p className="text-[10px] uppercase text-muted-foreground">{translationLabel}</p>}
        </div>
      )}
    </div>
  );
};
