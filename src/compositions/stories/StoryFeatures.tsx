/**
 * StoryFeatures — "Gjithçka për dyqanin tënd" (1080x1920). The four feature
 * cards are animated with a REAL GSAP timeline, driven deterministically by
 * Remotion via useGsapTimeline (build paused → seek to frame).
 */
import gsap from "gsap";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { useGsapTimeline } from "../../lib/gsapRemotion";
import { exitLift } from "../../lib/motion";
import { StoryShell, Chip, BRAND, gradText, CLASH, INTER } from "./storyKit";

export const storyFeaturesSchema = z.object({ cta: z.string() });
export const storyFeaturesDefaults: z.infer<typeof storyFeaturesSchema> = { cta: "Provo falas 7 ditë" };

const FEATURES = [
  { icon: "💳", color: BRAND.fuchsia, title: "Pagesa me kartë, në Lekë", desc: "RaiAccept ose para në dorë" },
  { icon: "🎨", color: BRAND.amber, title: "Vitrina jote, marka jote", desc: "dizajno gjithçka, me pamje live" },
  { icon: "📦", color: BRAND.red, title: "Porositë në një panel", desc: "njoftim në çast, statuse live" },
  { icon: "📈", color: BRAND.pink, title: "Stoku rezervohet vetë", desc: "s'shet kurrë tepër" },
];

export const StoryFeatures = ({ cta }: z.infer<typeof storyFeaturesSchema>) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const exit = exitLift(frame, durationInFrames, 20, 50);

  const scope = useGsapTimeline<HTMLDivElement>((el) => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(el.querySelectorAll("[data-head] span"), { y: 90, opacity: 0, rotate: 2, duration: 0.7, stagger: 0.08 })
      .from(el.querySelectorAll("[data-card]"), { y: 160, opacity: 0, rotate: (i) => (i % 2 ? 3 : -3), scale: 0.92, duration: 0.8, stagger: 0.28, ease: "back.out(1.4)" }, 0.55)
      .from(el.querySelector("[data-cta]"), { y: 60, opacity: 0, scale: 0.9, duration: 0.6, ease: "back.out(1.7)" }, "-=0.15")
      .to(el.querySelector("[data-cta]"), { scale: 1.045, duration: 0.55, yoyo: true, repeat: 5, ease: "sine.inOut" }, ">-0.1");
    return tl;
  });

  return (
    <StoryShell frame={frame} durationInFrames={durationInFrames}>
      <div ref={scope} style={{ height: "100%" }}>
        <AbsoluteFill style={{ padding: "290px 84px", alignItems: "center", opacity: exit.opacity, transform: `translateY(${exit.y}px)` }}>
          <h1 data-head style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 92, letterSpacing: "-0.02em", lineHeight: 1.08, color: "#fff", textAlign: "center", margin: 0 }}>
            <span style={{ display: "inline-block" }}>Gjithçka&nbsp;</span>
            <span style={{ display: "inline-block" }}>për&nbsp;</span>
            <br />
            <span style={{ display: "inline-block", ...gradText }}>dyqanin&nbsp;tënd.</span>
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: 34, marginTop: 92, width: "100%" }}>
            {FEATURES.map((f) => (
              <div key={f.title} data-card style={{ display: "flex", alignItems: "center", gap: 38, background: "rgba(22,18,28,0.88)", border: "2px solid rgba(255,255,255,0.14)", borderRadius: 48, padding: "38px 44px", boxShadow: "0 50px 120px -50px rgba(0,0,0,0.75)" }}>
                <div style={{ width: 118, height: 118, borderRadius: 34, flex: "0 0 118px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, background: `${f.color}26` }}>{f.icon}</div>
                <div>
                  <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 46, letterSpacing: "-0.01em", color: "#fff" }}>{f.title}</div>
                  <div style={{ fontFamily: INTER, fontSize: 31, color: "rgba(255,255,255,0.58)", marginTop: 8 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div data-cta style={{ marginTop: 78 }}>
            <Chip filled>{cta} →</Chip>
          </div>
        </AbsoluteFill>
      </div>
    </StoryShell>
  );
};
