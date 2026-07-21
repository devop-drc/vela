/**
 * ProductPromo — the Instagram Studio motion-graphics overlay, as a real
 * Remotion composition. Takes a merchant's product video (or photo, which
 * gets a slow Ken Burns drift) and animates the Studio template over it:
 * shop name pill, product name, price — springing in, holding, easing out.
 *
 * Fully prop-driven so the same composition renders anywhere: locally via
 * scripts/render-product-video.mjs today, Lambda/worker later.
 */
import {
  AbsoluteFill, OffthreadVideo, Img, interpolate, spring,
  useCurrentFrame, useVideoConfig, staticFile, delayRender, continueRender,
} from "remotion";
import { useEffect, useState } from "react";
import { z } from "zod";

export const productPromoSchema = z.object({
  videoUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  name: z.string(),
  price: z.number().nullable(),
  currency: z.string(),
  shopName: z.string(),
  accent: z.string(),
  template: z.enum(["gradient", "banner", "badge"]),
});
export type ProductPromoProps = z.infer<typeof productPromoSchema>;

export const productPromoDefaults: ProductPromoProps = {
  videoUrl: null,
  imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1080&q=80",
  name: "Atlete Retro Runner",
  price: 4900,
  currency: "ALL",
  shopName: "Dyqani Yt",
  accent: "#A31234",
  template: "gradient",
};

export const PROMO_FPS = 30;
export const PROMO_DEFAULT_FRAMES = 15 * PROMO_FPS;

const CLASH = "PromoClash";
const SATOSHI = "PromoSatoshi";

const useFonts = () => {
  const [handle] = useState(() => delayRender("promo-fonts"));
  useEffect(() => {
    Promise.all([
      new FontFace(CLASH, `url('${staticFile("fonts/clash/ClashDisplay-Semibold.otf")}') format('opentype')`, { weight: "600" }).load(),
      new FontFace(SATOSHI, `url('${staticFile("fonts/satoshi/Satoshi-500.woff2")}') format('woff2')`, { weight: "500" }).load(),
      new FontFace(SATOSHI, `url('${staticFile("fonts/satoshi/Satoshi-700.woff2")}') format('woff2')`, { weight: "700" }).load(),
    ]).then((fonts) => {
      fonts.forEach((f) => document.fonts.add(f));
      continueRender(handle);
    }).catch(() => continueRender(handle));
  }, [handle]);
};

const fmtPrice = (price: number | null, currency: string) =>
  price == null ? "" : `${Math.round(price).toLocaleString("sq-AL")} ${currency || "ALL"}`;

/** Spring-in from below + fade, easing out near the end of the video. */
const useEnterExit = (enterAt: number) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame: frame - enterAt, fps, config: { damping: 16, mass: 0.7 } });
  const exit = interpolate(frame, [durationInFrames - 20, durationInFrames - 4], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return { opacity: Math.min(enter, exit), y: (1 - enter) * 46 };
};

const Media = ({ videoUrl, imageUrl }: { videoUrl: string | null; imageUrl: string | null }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  if (videoUrl) {
    return <OffthreadVideo src={videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted={false} />;
  }
  // Photo fallback: slow Ken Burns drift so a still image feels alive.
  const scale = interpolate(frame, [0, durationInFrames], [1.04, 1.14]);
  const drift = interpolate(frame, [0, durationInFrames], [0, -24]);
  return imageUrl
    ? <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale}) translateY(${drift}px)` }} />
    : <AbsoluteFill style={{ background: "#140A0E" }} />;
};

export const ProductPromo = (props: ProductPromoProps) => {
  useFonts();
  const { width } = useVideoConfig();
  const price = fmtPrice(props.price, props.currency);
  const shop = useEnterExit(10);
  const title = useEnterExit(18);
  const pricePop = useEnterExit(28);

  const pricePill = price && (
    <div style={{
      display: "inline-block", background: props.accent, color: "#fff",
      fontFamily: SATOSHI, fontWeight: 700, fontSize: 46, lineHeight: 1,
      padding: "24px 40px", borderRadius: 999,
      opacity: pricePop.opacity, transform: `translateY(${pricePop.y}px)`,
      boxShadow: "0 18px 50px -12px rgba(0,0,0,0.55)",
    }}>{price}</div>
  );

  return (
    <AbsoluteFill style={{ background: "#140A0E" }}>
      <Media videoUrl={props.videoUrl} imageUrl={props.imageUrl} />

      {props.template === "gradient" && (
        <AbsoluteFill style={{ justifyContent: "flex-end" }}>
          <div style={{
            padding: "260px 56px 84px",
            background: "linear-gradient(to top, rgba(20,10,14,0.96), rgba(20,10,14,0.7) 45%, transparent)",
          }}>
            {props.shopName && (
              <div style={{
                fontFamily: SATOSHI, fontWeight: 500, fontSize: 30, letterSpacing: 4,
                color: "rgba(255,255,255,0.75)", textTransform: "uppercase", marginBottom: 18,
                opacity: shop.opacity, transform: `translateY(${shop.y}px)`,
              }}>{props.shopName}</div>
            )}
            <div style={{
              fontFamily: CLASH, fontWeight: 600, fontSize: 74, color: "#fff",
              lineHeight: 1.05, marginBottom: 26, maxWidth: width - 112,
              opacity: title.opacity, transform: `translateY(${title.y}px)`,
            }}>{props.name}</div>
            {pricePill}
          </div>
        </AbsoluteFill>
      )}

      {props.template === "banner" && (
        <AbsoluteFill style={{ justifyContent: "flex-end" }}>
          <div style={{
            height: 170, background: "rgba(20,10,14,0.94)", borderTop: `6px solid ${props.accent}`,
            display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 52px",
            opacity: title.opacity, transform: `translateY(${title.y}px)`,
          }}>
            <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 52, color: "#fff", maxWidth: width - 480, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {props.name}
            </div>
            {pricePill}
          </div>
        </AbsoluteFill>
      )}

      {props.template === "badge" && (
        <>
          <div style={{ position: "absolute", top: 52, right: 48, opacity: pricePop.opacity, transform: `translateY(${-pricePop.y}px)` }}>
            {pricePill}
          </div>
          {props.shopName && (
            <div style={{
              position: "absolute", left: 48, bottom: 56,
              fontFamily: SATOSHI, fontWeight: 500, fontSize: 34, color: "rgba(255,255,255,0.92)",
              textShadow: "0 4px 16px rgba(0,0,0,0.6)",
              opacity: shop.opacity, transform: `translateY(${shop.y}px)`,
            }}>{props.shopName}</div>
          )}
        </>
      )}
    </AbsoluteFill>
  );
};
