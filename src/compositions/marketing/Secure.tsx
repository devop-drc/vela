/**
 * SECURE SET (10) — the trust message: every card payment on Vela runs
 * through RaiAccept, the official payment gateway of Raiffeisen Bank.
 * Clean light-trust styling (ink on paper, Raiffeisen-yellow accent chip),
 * with a night payoff on the reel. One asset per format:
 *
 *  ReelSecure      ~11.7s  hook "Po kartat?" → padlock closes → RaiAccept flow → night payoff
 *  PostSecure      ~8.3s   the payment flow assembling on paper
 *  StillSecure     9:16    poster: padlock + flow + badge
 *  StillSecurePost 4:5     condensed trust card
 */
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND, CLASH, SATOSHI, GRAD_TEXT, Grain, Blobs, Cta, springy, rise, exitUp } from "./mkKit";

const clamp = (f: number, a: [number, number], b: [number, number], ease?: (t: number) => number) =>
  interpolate(f, a, b, { extrapolateLeft: "clamp", extrapolateRight: "clamp", ...(ease ? { easing: ease } : {}) });

const INK = BRAND.dark;
const MUTED = "#796770";
const LINE = "#EDE4E1";
const CREAM = "#FBF6F4";
const WINE = "#A31234";
const RAI_YELLOW = "#FFDE21";
const SHADOW = "0 30px 70px -34px rgba(20,10,14,0.28)";

const PaperBg: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: CREAM, fontFamily: SATOSHI }}>
    <div style={{ position: "absolute", right: -260, top: -300, width: 940, height: 940, borderRadius: 999, background: "rgba(163,18,52,0.05)", filter: "blur(160px)" }} />
    <div style={{ position: "absolute", left: -300, bottom: -340, width: 980, height: 980, borderRadius: 999, background: "rgba(255,222,33,0.10)", filter: "blur(160px)" }} />
    <Grain opacity={0.028} />
    {children}
  </AbsoluteFill>
);
const NightBg: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BRAND.dark, fontFamily: SATOSHI }}>
      <Blobs frame={frame} />
      <Grain />
      {children}
    </AbsoluteFill>
  );
};

/** RaiAccept badge — the trust anchor of the whole set. */
const RaiBadge: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 14, background: RAI_YELLOW, borderRadius: 999, padding: `${size * 0.5}px ${size * 1.1}px`, boxShadow: "0 20px 50px -22px rgba(180,150,0,0.55)", fontFamily: SATOSHI }}>
    <span style={{ fontSize: size * 1.05 }}>🔒</span>
    <span style={{ fontWeight: 800, fontSize: size, color: "#151002" }}>
      RaiAccept · Raiffeisen Bank
    </span>
  </div>
);

/** Padlock whose shackle drops shut. */
const Padlock: React.FC<{ closed: number; size?: number }> = ({ closed, size = 210 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120">
    <path
      d="M38 58 V40 a22 22 0 0 1 44 0 V58"
      fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round"
      style={{ transform: `translateY(${(1 - closed) * -13}px)` }}
    />
    <rect x={24} y={54} width={72} height={52} rx={14} fill={INK} />
    <circle cx={60} cy={76} r={7} fill={CREAM} />
    <rect x={56.5} y={80} width={7} height={13} rx={3.5} fill={CREAM} />
  </svg>
);

/** The three-step payment flow with a traveling pulse. */
const FLOW = [
  ["💳", "Karta e klientit"],
  ["🛡️", "RaiAccept"],
  ["✓", "Pagesa u krye"],
];
const FlowRow: React.FC<{ frame: number; fps: number; from?: number; width?: number; still?: boolean }> = ({ frame, fps, from = 0, width = 880, still }) => {
  const dotLoop = still ? 0.5 : ((frame - from) % 70) / 70;
  const nodeW = 250;
  const gap = (width - nodeW * 3) / 2;
  return (
    <div style={{ position: "relative", width, display: "flex", justifyContent: "space-between", alignItems: "stretch" }}>
      {FLOW.map(([icon, label], i) => {
        const s = still ? 1 : springy(frame, fps, from + i * 14, { damping: 13 });
        return (
          <div key={label} style={{ ...(!still ? rise(s) : {}), width: nodeW, background: "#fff", border: `2px solid ${i === 1 ? RAI_YELLOW : LINE}`, borderRadius: 24, padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, boxShadow: SHADOW, zIndex: 2 }}>
            <span style={{ fontSize: 44, ...(i === 2 ? { color: "#1E7C3F", fontWeight: 800, fontFamily: CLASH } : {}) }}>{icon}</span>
            <span style={{ fontSize: 23, fontWeight: 800, color: INK, textAlign: "center" }}>{label}</span>
          </div>
        );
      })}
      {/* connecting dashes */}
      {[0, 1].map((i) => (
        <div key={i} style={{ position: "absolute", top: "50%", left: nodeW * (i + 1) + gap * i + 8, width: gap - 16, height: 0, borderTop: `4px dashed rgba(20,10,14,0.25)`, zIndex: 1 }} />
      ))}
      {/* traveling encrypted pulse */}
      {(still ? [0.5] : [dotLoop]).map((p) => (
        <div key="dot" style={{ position: "absolute", top: "50%", left: 30 + p * (width - 60), width: 18, height: 18, marginTop: -9, borderRadius: 99, background: RAI_YELLOW, border: `3px solid ${INK}`, zIndex: 3, boxShadow: "0 0 26px 6px rgba(255,222,33,0.6)" }} />
      ))}
    </div>
  );
};

/* ══ REEL 10 — "Po kartat?" ═════════════════════════════════════════════ */
export const ReelSecure: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hookOut = clamp(frame, [52, 64], [0, 1], Easing.in(Easing.cubic));
  const closed = springy(frame, fps, 100, { damping: 11, stiffness: 230 });
  const stageOut = clamp(frame, [242, 254], [0, 1], Easing.in(Easing.cubic));
  const night = clamp(frame, [250, 266], [0, 1], Easing.inOut(Easing.cubic));

  return (
    <AbsoluteFill style={{ fontFamily: SATOSHI }}>
      <PaperBg>
        {frame < 66 && (
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 20, ...exitUp(hookOut) }}>
            <div style={{ ...rise(springy(frame, fps, 6, { damping: 12, stiffness: 210 })), fontFamily: CLASH, fontWeight: 700, fontSize: 120, color: INK }}>
              Po kartat?
            </div>
            <div style={{ ...rise(springy(frame, fps, 24)), fontFamily: CLASH, fontWeight: 600, fontSize: 60, color: WINE }}>
              A janë të sigurta?
            </div>
          </AbsoluteFill>
        )}
        {frame >= 60 && frame < 256 && (
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34, padding: "250px 84px 260px", ...exitUp(stageOut) }}>
            <div style={{ ...rise(springy(frame, fps, 64)) }}>
              <Padlock closed={closed} />
            </div>
            <div style={{ ...rise(springy(frame, fps, 92)) }}>
              <RaiBadge />
            </div>
            <div style={{ ...rise(springy(frame, fps, 112)), textAlign: "center", fontSize: 33, fontWeight: 700, color: INK, lineHeight: 1.5, maxWidth: 840 }}>
              Çdo pagesë me kartë kalon nëpërmjet <span style={{ color: WINE }}>RaiAccept</span> —<br />
              portës zyrtare të pagesave të <span style={{ color: WINE }}>Raiffeisen Bank</span>.
            </div>
            <div style={{ ...rise(springy(frame, fps, 150)), marginTop: 10 }}>
              <FlowRow frame={frame} fps={fps} from={150} />
            </div>
            <div style={{ ...rise(springy(frame, fps, 196)), fontSize: 29, fontWeight: 700, color: MUTED, textAlign: "center" }}>
              Të dhënat e kartës enkriptohen. Ne nuk i shohim kurrë.
            </div>
          </AbsoluteFill>
        )}
      </PaperBg>
      {night > 0.001 && (
        <AbsoluteFill style={{ opacity: night }}>
          <NightBg>
            <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 }}>
              <div style={{ ...rise(springy(frame, fps, 266)), textAlign: "center", fontFamily: CLASH, fontWeight: 700, fontSize: 96, color: "#fff", lineHeight: 1.16 }}>
                Të sigurta.<br />
                <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Si në bankë.</span>
              </div>
              <div style={{ ...rise(springy(frame, fps, 282)) }}>
                <Cta size={40}>Fillo falas → vela.al</Cta>
              </div>
              <div style={{ ...rise(springy(frame, fps, 294)) }}>
                <RaiBadge size={22} />
              </div>
              <div style={{ position: "absolute", bottom: 92, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 24, fontWeight: 700, letterSpacing: "0.3em" }}>
                VELA — DYQANI YT ONLINE
              </div>
            </AbsoluteFill>
          </NightBg>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
export const REEL_SECURE_FRAMES = 350;

/* ══ POST 10 — the payment flow, assembling ═════════════════════════════ */
export const PostSecure: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const closed = springy(frame, fps, 58, { damping: 11, stiffness: 230 });
  return (
    <AbsoluteFill style={{ fontFamily: SATOSHI }}>
      <PaperBg>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30, padding: "120px 80px" }}>
          <div style={{ ...rise(springy(frame, fps, 4, { damping: 12, stiffness: 210 })), fontFamily: CLASH, fontWeight: 700, fontSize: 86, color: INK }}>
            Pagesa? <span style={{ color: WINE }}>Punë banke.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
            <div style={{ ...rise(springy(frame, fps, 30)) }}>
              <Padlock closed={closed} size={150} />
            </div>
            <div style={{ ...rise(springy(frame, fps, 44)) }}>
              <RaiBadge size={28} />
            </div>
          </div>
          <div style={{ ...rise(springy(frame, fps, 70)) }}>
            <FlowRow frame={frame} fps={fps} from={70} width={860} />
          </div>
          <div style={{ ...rise(springy(frame, fps, 120)), textAlign: "center", fontSize: 30, fontWeight: 700, color: INK, lineHeight: 1.5, maxWidth: 860 }}>
            Çdo kartë kalon nëpërmjet <span style={{ color: WINE }}>RaiAccept</span> — portës zyrtare
            të pagesave të <span style={{ color: WINE }}>Raiffeisen Bank</span>.
          </div>
          <div style={{ ...rise(springy(frame, fps, 150)), fontSize: 27, fontWeight: 700, color: MUTED }}>
            Të dhënat enkriptohen. Ne nuk i shohim kurrë.
          </div>
          <div style={{ ...rise(springy(frame, fps, 182)), marginTop: 6, display: "inline-flex", alignItems: "center", gap: 16, padding: "24px 52px", borderRadius: 999, background: INK, color: CREAM, fontFamily: CLASH, fontWeight: 600, fontSize: 36 }}>
            Ti shet. Banka siguron. → vela.al
          </div>
        </AbsoluteFill>
      </PaperBg>
    </AbsoluteFill>
  );
};
export const POST_SECURE_FRAMES = 250;

/* ══ SECURE STILLS ══════════════════════════════════════════════════════ */
export const StillSecure: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ fontFamily: SATOSHI }}>
      <PaperBg>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 36, padding: "260px 70px 270px" }}>
          <div style={{ textAlign: "center", fontFamily: CLASH, fontWeight: 700, fontSize: 92, color: INK, lineHeight: 1.14 }}>
            Të dhënat e kartës?<br /><span style={{ color: WINE }}>Të sigurta.</span>
          </div>
          <Padlock closed={1} size={200} />
          <RaiBadge size={27} />
          <FlowRow frame={frame} fps={fps} still width={880} />
          <div style={{ textAlign: "center", fontSize: 31, fontWeight: 700, color: INK, lineHeight: 1.55, maxWidth: 860 }}>
            Çdo pagesë kalon nëpërmjet <span style={{ color: WINE }}>RaiAccept</span> —<br />
            portës zyrtare të <span style={{ color: WINE }}>Raiffeisen Bank</span>.
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: MUTED }}>Enkriptim i plotë · ne nuk i shohim kurrë</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 16, padding: "24px 52px", borderRadius: 999, background: INK, color: CREAM, fontFamily: CLASH, fontWeight: 600, fontSize: 36 }}>
            Fillo falas → vela.al
          </div>
        </AbsoluteFill>
      </PaperBg>
    </AbsoluteFill>
  );
};

export const StillSecurePost: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ fontFamily: SATOSHI }}>
      <PaperBg>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30, padding: "110px 80px" }}>
          <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 84, color: INK }}>
            Pagesa? <span style={{ color: WINE }}>Punë banke.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
            <Padlock closed={1} size={140} />
            <RaiBadge size={27} />
          </div>
          <FlowRow frame={frame} fps={fps} still width={860} />
          <div style={{ textAlign: "center", fontSize: 30, fontWeight: 700, color: INK, lineHeight: 1.5, maxWidth: 860 }}>
            Çdo kartë kalon nëpërmjet <span style={{ color: WINE }}>RaiAccept</span> — portës zyrtare
            të pagesave të <span style={{ color: WINE }}>Raiffeisen Bank</span>.
          </div>
          <div style={{ fontSize: 27, fontWeight: 700, color: MUTED }}>Enkriptim i plotë · ne nuk i shohim kurrë</div>
          <div style={{ display: "inline-flex", padding: "22px 48px", borderRadius: 999, background: INK, color: CREAM, fontFamily: CLASH, fontWeight: 600, fontSize: 34 }}>
            Ti shet. Banka siguron. → vela.al
          </div>
        </AbsoluteFill>
      </PaperBg>
    </AbsoluteFill>
  );
};
