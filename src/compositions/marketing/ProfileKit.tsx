/**
 * Profile kit — highlight covers, highlight stories, and a clean white wave
 * of reels/post videos for the Vela Instagram profile. Ink-on-paper style
 * (cream #FBF6F4, minimal, hook-first). Copy: Albanian, "sistemi" never AI.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { BRAND, CLASH } from "../stories/storyKit";
import { SATOSHI, springy, rise, exitUp, Eyebrow, CurrencyRoll } from "./mkKit";
import { LightShell, InkCta, LIgPost, LProductCard, LNotif } from "./Light";

const INK = BRAND.dark;
const CREAM = "#FBF6F4";
const WINE = "#A31234";

/* ── minimal stroke pictograms for highlight covers ── */
const ICONS: Record<string, React.ReactNode> = {
  nisja: <path d="M50 10 C65 25 70 45 60 70 L40 70 C30 45 35 25 50 10 Z M50 70 L50 88 M38 78 L30 92 M62 78 L70 92" />,
  dyqani: <path d="M18 40 L24 16 L76 16 L82 40 M18 40 C18 50 30 50 30 40 C30 50 42 50 42 40 C42 50 56 50 56 40 C56 50 70 50 70 40 C70 50 82 50 82 40 M24 50 L24 84 L76 84 L76 50 M42 84 L42 64 L58 64 L58 84" />,
  pagesat: <path d="M14 30 L86 30 L86 72 L14 72 Z M14 42 L86 42 M22 58 L44 58" />,
  porosite: <path d="M28 34 L34 22 L66 22 L72 34 M22 34 L78 34 L74 84 L26 84 Z M38 46 C38 56 62 56 62 46" />,
  postimet: <path d="M14 46 L86 16 L64 84 L48 60 Z M48 60 L86 16" />,
  pyetje: <path d="M34 34 C34 14 66 14 66 34 C66 48 50 46 50 60 M50 74 L50 78" />,
};

export const hlSchema = z.object({ icon: z.enum(["nisja", "dyqani", "pagesat", "porosite", "postimet", "pyetje"]) });
export const hlDefaults = { icon: "nisja" as const };

/** Highlight cover — 1080×1920 still: ink ring + pictogram on cream. */
export const HlCover: React.FC<z.infer<typeof hlSchema>> = ({ icon }) => (
  <AbsoluteFill style={{ background: CREAM, alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: 560, height: 560, borderRadius: 999, border: `7px solid ${INK}`, display: "grid", placeItems: "center" }}>
      <svg width={330} height={330} viewBox="0 0 100 100" style={{ overflow: "visible" }}>
        <g fill="none" stroke={INK} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round">{ICONS[icon]}</g>
      </svg>
    </div>
    <div style={{ position: "absolute", bottom: 200, width: 120, height: 8, borderRadius: 99, background: WINE }} />
  </AbsoluteFill>
);

/* ── highlight stories: headline + 3 steps + sticker zone (y 1560-1800 free) ── */
const HL_STORIES: Record<string, { eyebrow: string; h1: string; steps: string[] }> = {
  nisja: { eyebrow: "SI NIS", h1: "Nga profili te dyqani, për 5 minuta.", steps: ["Lidh Instagramin me 1 klikim", "Sistemi i kthen postimet në produkte", "Dyqani yt është online"] },
  dyqani: { eyebrow: "DYQANI", h1: "Një dyqan i vërtetë, jo thjesht një link.", steps: ["Produkte me foto, çmime, masa e ngjyra", "Filtra e kategori automatike", "Dizajni yt, me Storefront Studio"] },
  pagesat: { eyebrow: "PAGESAT", h1: "Kartë apo kesh — ti paguhesh.", steps: ["Karta procesohen nga RaiAccept (Raiffeisen)", "Të dhënat e kartës s'i sheh askush", "Çdo monedhë: Lekë, Euro, Dollarë…"] },
  porosite: { eyebrow: "POROSITË", h1: "Çdo porosi, në një panel të vetëm.", steps: ["Njoftim në sekondën që porositet", "Stoku ulet vetë, pa Excel", "Konfirmo, dërgo, gati"] },
  postimet: { eyebrow: "POSTIMET", h1: "Krijo produktin. Postimi bëhet vetë.", steps: ["Shto produktin në Vela", "Sistemi shkruan përshkrimin & dizajnon foton", "Publikohet në profilin tënd me 1 klikim"] },
  pyetje: { eyebrow: "PYETJE", h1: "Përgjigju një herë. Përgjithmonë.", steps: ["“Sa kushton?” — çmimi është në dyqan", "“A ka masën M?” — stoku është live", "“Si paguaj?” — kartë ose kesh"] },
};

export const HlStory: React.FC<z.infer<typeof hlSchema>> = ({ icon }) => {
  const s = HL_STORIES[icon];
  return (
    <AbsoluteFill style={{ background: CREAM, fontFamily: SATOSHI, color: INK, padding: "170px 90px" }}>
      <Eyebrow style={{ borderColor: INK, color: INK }}>{s.eyebrow}</Eyebrow>
      <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 96, lineHeight: 1.04, letterSpacing: "-0.02em", margin: "44px 0 70px" }}>{s.h1}</div>
      {s.steps.map((step, i) => (
        <div key={i} style={{ display: "flex", gap: 30, alignItems: "flex-start", marginBottom: 46 }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: i === 2 ? WINE : INK, color: CREAM, display: "grid", placeItems: "center", fontFamily: CLASH, fontWeight: 600, fontSize: 32, flexShrink: 0 }}>{i + 1}</div>
          <div style={{ fontSize: 42, fontWeight: 500, lineHeight: 1.25, paddingTop: 8 }}>{step}</div>
        </div>
      ))}
      {/* sticker zone: bottom ~360px left free for link/poll stickers */}
      <div style={{ position: "absolute", bottom: 120, left: 90, right: 90, height: 220, border: `3px dashed rgba(20,10,14,0.18)`, borderRadius: 28, display: "grid", placeItems: "center", color: "rgba(20,10,14,0.3)", fontSize: 30 }}>
        vendi i link-ut / sticker-it
      </div>
    </AbsoluteFill>
  );
};

/* ══ Reel 1 — Convert: profili yt → dyqani yt ══ */
export const CleanReelConvert: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sc = (n: number) => springy(frame, fps, n);
  const beat2 = frame >= 120;
  const beat3 = frame >= 250;
  return (
    <LightShell reel>
      {!beat2 && (
        <div style={{ textAlign: "center", ...exitUp(interpolate(frame, [100, 118], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) }}>
          <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 108, lineHeight: 1.05, letterSpacing: "-0.02em", color: INK, ...rise(sc(4)) }}>
            Ky postim<br />është produkt.
          </div>
          <div style={{ fontSize: 44, color: "rgba(20,10,14,0.55)", marginTop: 34, ...rise(sc(16)) }}>Thjesht s'e dije akoma.</div>
        </div>
      )}
      {beat2 && !beat3 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 44 }}>
          <div style={{ ...rise(springy(frame - 120, fps, 0)) }}><LIgPost width={560} /></div>
          <div style={{ fontFamily: CLASH, fontSize: 60, color: WINE, ...rise(springy(frame - 120, fps, 10)) }}>↓ sistemi ↓</div>
          <div style={{ ...rise(springy(frame - 120, fps, 18)) }}><LProductCard width={560} /></div>
        </div>
      )}
      {beat3 && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 92, color: INK, lineHeight: 1.06, ...rise(springy(frame - 250, fps, 0)) }}>
            Gjithë profili.<br />Për 5 minuta.
          </div>
          <div style={{ marginTop: 60, ...rise(springy(frame - 250, fps, 14)) }}><InkCta>Provo falas → instantshop.al</InkCta></div>
        </div>
      )}
    </LightShell>
  );
};
export const CLEAN_CONVERT_FRAMES = 360;

/* ══ Reel 2 — AutoPost: krijo produktin, postimi bëhet vetë ══ */
export const CleanReelAutoPost: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat2 = frame >= 130;
  const beat3 = frame >= 280;
  const typed = "Çantë lëkure natyrale 🤎 4,500 L — porosite online 👇";
  const chars = Math.floor(interpolate(frame, [160, 240], [0, typed.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <LightShell reel>
      {!beat2 && (
        <div style={{ textAlign: "center", ...exitUp(interpolate(frame, [110, 128], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) }}>
          <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 100, lineHeight: 1.06, color: INK, ...rise(springy(frame, fps, 4)) }}>
            Tani punon<br />edhe mbrapsht.
          </div>
          <div style={{ fontSize: 44, color: "rgba(20,10,14,0.55)", marginTop: 34, ...rise(springy(frame, fps, 16)) }}>
            Krijo produktin në Vela → posto në Instagram.
          </div>
        </div>
      )}
      {beat2 && !beat3 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
          <div style={{ ...rise(springy(frame - 130, fps, 0)) }}><LProductCard width={540} /></div>
          <div style={{ width: 640, background: "#fff", borderRadius: 24, padding: "30px 34px", boxShadow: "0 30px 70px -30px rgba(20,10,14,0.25)", ...rise(springy(frame - 130, fps, 12)) }}>
            <div style={{ fontSize: 26, color: "rgba(20,10,14,0.45)", marginBottom: 12 }}>Sistemi shkruan përshkrimin:</div>
            <div style={{ fontSize: 34, fontWeight: 500, color: INK, minHeight: 90, lineHeight: 1.3 }}>
              {typed.slice(0, chars)}<span style={{ opacity: frame % 20 < 10 ? 1 : 0 }}>|</span>
            </div>
          </div>
          <div style={{ ...rise(springy(frame - 130, fps, 20)) }}>
            <InkCta size={34} style={{ background: WINE }}>Publiko në Instagram ✓</InkCta>
          </div>
        </div>
      )}
      {beat3 && (
        <div style={{ textAlign: "center" }}>
          <div style={{ ...rise(springy(frame - 280, fps, 0)) }}><LNotif width={700} name="Postimi u publikua" amount="✓" /></div>
          <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 84, color: INK, margin: "56px 0", lineHeight: 1.08, ...rise(springy(frame - 280, fps, 10)) }}>
            Ti shite.<br />Sistemi postoi.
          </div>
          <div style={{ ...rise(springy(frame - 280, fps, 18)) }}><InkCta>instantshop.al</InkCta></div>
        </div>
      )}
    </LightShell>
  );
};
export const CLEAN_AUTOPOST_FRAMES = 400;

/* ══ Reel 3 — Pay: kartë apo kesh ══ */
export const CleanReelPay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat2 = frame >= 120;
  const beat3 = frame >= 240;
  return (
    <LightShell reel>
      {!beat2 && (
        <div style={{ textAlign: "center", ...exitUp(interpolate(frame, [100, 118], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) }}>
          <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 104, lineHeight: 1.05, color: INK, ...rise(springy(frame, fps, 4)) }}>
            "A pranon<br />kartë?"
          </div>
          <div style={{ fontSize: 46, color: "rgba(20,10,14,0.55)", marginTop: 34, ...rise(springy(frame, fps, 16)) }}>Po. Dhe kesh. Dhe çdo monedhë.</div>
        </div>
      )}
      {beat2 && !beat3 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 48 }}>
          <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 120, color: INK, display: "flex", alignItems: "baseline", gap: 24, ...rise(springy(frame - 120, fps, 0)) }}>
            4,500 <CurrencyRoll size={110} color={WINE} />
          </div>
          <div style={{ width: 700, background: "#fff", borderRadius: 26, padding: "36px 42px", boxShadow: "0 30px 70px -30px rgba(20,10,14,0.25)", textAlign: "center", ...rise(springy(frame - 120, fps, 12)) }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: INK }}>Pagesa me kartë nga RaiAccept</div>
            <div style={{ fontSize: 28, color: "rgba(20,10,14,0.55)", marginTop: 10 }}>Raiffeisen Bank · të dhënat e kartës s'i sheh askush</div>
          </div>
        </div>
      )}
      {beat3 && (
        <div style={{ textAlign: "center" }}>
          <div style={{ ...rise(springy(frame - 240, fps, 0)) }}><LNotif width={700} /></div>
          <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 88, color: INK, margin: "56px 0", lineHeight: 1.08, ...rise(springy(frame - 240, fps, 10)) }}>
            Ti paguhesh.<br />Gjithmonë.
          </div>
          <div style={{ ...rise(springy(frame - 240, fps, 18)) }}><InkCta>Provo falas → instantshop.al</InkCta></div>
        </div>
      )}
    </LightShell>
  );
};
export const CLEAN_PAY_FRAMES = 340;

/* ══ Post video 1 — Import: ke një Excel? ke një dyqan ══ */
export const CleanPostImport: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat2 = frame >= 110;
  const rows = ["Çantë lëkure — 4,500 L", "Bluzë pambuku — 1,900 L", "Atlete vrapi — 6,200 L"];
  return (
    <LightShell>
      {!beat2 && (
        <div style={{ textAlign: "center", ...exitUp(interpolate(frame, [92, 108], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) }}>
          <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 96, lineHeight: 1.06, color: INK, ...rise(springy(frame, fps, 4)) }}>
            Ke një Excel?<br />Ke një dyqan.
          </div>
        </div>
      )}
      {beat2 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ width: 720, background: "#fff", borderRadius: 20, padding: "26px 34px", boxShadow: "0 24px 60px -28px rgba(20,10,14,0.22)", display: "flex", justifyContent: "space-between", alignItems: "center", ...rise(springy(frame - 110, fps, i * 8)) }}>
              <span style={{ fontSize: 32, fontWeight: 500, color: INK }}>{r}</span>
              <span style={{ fontSize: 26, fontWeight: 700, color: WINE, opacity: springy(frame - 150, fps, i * 8) }}>✓ produkt</span>
            </div>
          ))}
          <div style={{ fontSize: 36, color: "rgba(20,10,14,0.55)", marginTop: 8, ...rise(springy(frame - 110, fps, 28)) }}>
            Ngarko skedarin — sistemi i lexon vetë kolonat.
          </div>
          <div style={{ ...rise(springy(frame - 110, fps, 36)) }}><InkCta size={36}>instantshop.al</InkCta></div>
        </div>
      )}
    </LightShell>
  );
};
export const CLEAN_IMPORT_FRAMES = 280;

/* ══ Post video 2 — Studio: dizajne gati për çdo postim ══ */
export const CleanPostStudio: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat2 = frame >= 100;
  const swatches = [WINE, "#FF2E4D", "#C9A227", INK];
  return (
    <LightShell>
      {!beat2 && (
        <div style={{ textAlign: "center", ...exitUp(interpolate(frame, [84, 98], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) }}>
          <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 92, lineHeight: 1.06, color: INK, ...rise(springy(frame, fps, 4)) }}>
            Fotot e tua.<br />Dizajni i sistemit.
          </div>
        </div>
      )}
      {beat2 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
          <div style={{ position: "relative", ...rise(springy(frame - 100, fps, 0)) }}>
            <LProductCard width={600} />
            {/* the overlay banner slides onto the card */}
            <div style={{
              position: "absolute", left: 0, right: 0, bottom: 0, background: "rgba(20,10,14,0.94)",
              borderRadius: "0 0 24px 24px", padding: "22px 28px", display: "flex", justifyContent: "space-between", alignItems: "center",
              transform: `translateY(${(1 - springy(frame - 130, fps, 0)) * 80}px)`, opacity: springy(frame - 130, fps, 0),
            }}>
              <span style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 32, color: CREAM }}>Atlete Vrapi Air</span>
              <span style={{ background: WINE, color: "#fff", borderRadius: 999, padding: "10px 22px", fontSize: 26, fontWeight: 700 }}>6,200 L</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, ...rise(springy(frame - 100, fps, 18)) }}>
            {swatches.map((c, i) => (
              <div key={i} style={{ width: 62, height: 62, borderRadius: 999, background: c, border: i === 0 ? `4px solid ${INK}` : "none" }} />
            ))}
          </div>
          <div style={{ fontSize: 36, color: "rgba(20,10,14,0.55)", textAlign: "center", ...rise(springy(frame - 100, fps, 26)) }}>
            Template, ngjyra, përshkrime — Instagram Studio.
          </div>
          <div style={{ ...rise(springy(frame - 100, fps, 34)) }}><InkCta size={36}>instantshop.al</InkCta></div>
        </div>
      )}
    </LightShell>
  );
};
export const CLEAN_STUDIO_FRAMES = 270;
