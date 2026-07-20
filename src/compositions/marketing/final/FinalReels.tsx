/**
 * FINAL campaign — reels (1080×1920 · 30fps · IG/TikTok safe zones).
 * See branding/marketing/final/PLAN.md for the per-second spec each of
 * these implements. All copy comes from ./copy.ts via the {lang} prop.
 *
 *  FinReelMachine  ~30s  the whole machine in 4 chapters (thorough)
 *  FinReelNoNeed   ~15s  "you don't need:" rapid strike-through beats (quick)
 *  FinReelNight    ~13s  23:47 sells-while-you-sleep + bank-grade trust
 */
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND, CLASH, SATOSHI, GRAD, GRAD_TEXT, Blobs, Grain, Cta, Boat, springy, rise, exitUp, CurrencyRoll } from '../mkKit';
import { LIgPost, LProductCard, LNotif, PanelWindow, LStat } from '../Light';
import { ThemeMorph, ThemeDots } from '../Duo';
import { RaiBadge, Padlock } from '../Secure';
import { COPY, type Lang } from './copy';

const clamp = (f: number, a: [number, number], b: [number, number], ease?: (t: number) => number) =>
  interpolate(f, a, b, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', ...(ease ? { easing: ease } : {}) });

const SAFE_TOP = 170;
const SAFE_BOTTOM = 250;

/** Night canvas + safe padding + optional chapter dots + watermark. */
const Shell: React.FC<{ children: React.ReactNode; dots?: { count: number; active: number }; shake?: number }> = ({ children, dots, shake = 0 }) => {
  const frame = useCurrentFrame();
  const dx = shake > 0 ? Math.sin(frame * 2.9) * 8 * shake : 0;
  const dy = shake > 0 ? Math.cos(frame * 3.4) * 6 * shake : 0;
  return (
    <AbsoluteFill style={{ background: BRAND.dark, fontFamily: SATOSHI }}>
      <Blobs frame={frame} />
      <Grain />
      {dots && (
        <div style={{ position: 'absolute', top: SAFE_TOP - 56, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 14, zIndex: 6 }}>
          {Array.from({ length: dots.count }, (_, i) => (
            <span key={i} style={{
              width: i === dots.active ? 44 : 14, height: 14, borderRadius: 99, transition: 'none',
              ...(i === dots.active ? { backgroundImage: GRAD } : { background: 'rgba(255,255,255,0.25)' }),
            }} />
          ))}
        </div>
      )}
      <AbsoluteFill style={{ padding: `${SAFE_TOP}px 64px ${SAFE_BOTTOM}px`, zIndex: 3, transform: `translate(${dx}px, ${dy}px)` }}>
        {children}
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 156, textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 26, fontWeight: 800, letterSpacing: '0.24em', zIndex: 6 }}>
        VELA.AL
      </div>
    </AbsoluteFill>
  );
};

/** Vertical gradient blade sweeping the frame at chapter boundaries. */
const BladeSweep: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const t = clamp(frame, [at, at + 12], [0, 1], Easing.inOut(Easing.cubic));
  if (t <= 0.001 || t >= 0.999) return null;
  return (
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${t * 118 - 9}%`, width: 12, backgroundImage: GRAD, boxShadow: '0 0 70px 18px rgba(255,46,77,0.5)', zIndex: 8 }} />
  );
};

const GradText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{children}</span>
);

const Caption: React.FC<{ s: number; children: React.ReactNode }> = ({ s, children }) => (
  <div style={{ ...rise(s), textAlign: 'center', fontSize: 33, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{children}</div>
);

/* ══ FR1 — the machine (30s) ════════════════════════════════════════════ */
export const FinReelMachine: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = COPY[lang].fr1;

  // chapter windows: hook 0–60 · ch1 60–210 · ch2 210–360 · ch3 360–510 · ch4 510–720 · payoff 720–900
  const active = frame < 60 ? -1 : frame < 210 ? 0 : frame < 360 ? 1 : frame < 510 ? 2 : frame < 720 ? 3 : -1;
  const out = (end: number) => exitUp(clamp(frame, [end - 10, end], [0, 1], Easing.in(Easing.cubic)));

  // ch1: scan + morph
  const scanY = clamp(frame, [96, 138], [0, 1], Easing.inOut(Easing.cubic));
  const morph = springy(frame, fps, 158, { damping: 14 });
  // ch2: theme + link typing
  const s1 = springy(frame, fps, 250, { damping: 14 });
  const s2 = springy(frame, fps, 300, { damping: 14 });
  const URL = 'dyqani-yt.vela.al';
  const chars = Math.floor(clamp(frame, [232, 292], [0, URL.length]));
  // ch3: success ring
  const R = 40, CIRC = 2 * Math.PI * R;
  const ring = clamp(frame, [428, 462], [0, 1], Easing.out(Easing.cubic));

  const chip = (label: string, d: number) => {
    const s = springy(frame, fps, d, { damping: 12, stiffness: 230 });
    return (
      <span style={{ opacity: Math.min(1, s * 1.6), transform: `translateY(${(1 - s) * 30}px)`, background: 'rgba(255,255,255,0.94)', color: '#141414', borderRadius: 999, padding: '10px 24px', fontSize: 26, fontWeight: 800 }}>
        {label} ✓
      </span>
    );
  };

  return (
    <Shell dots={active >= 0 ? { count: 4, active } : undefined}>
      {/* HOOK */}
      {frame < 62 && (
        <AbsoluteFill style={{ padding: `${SAFE_TOP}px 64px ${SAFE_BOTTOM}px`, alignItems: 'center', justifyContent: 'center', ...out(60) }}>
          <div style={{ ...rise(springy(frame, fps, 2, { damping: 11, stiffness: 240 })), fontFamily: CLASH, fontWeight: 700, fontSize: 78, color: '#fff', textAlign: 'center', lineHeight: 1.16 }}>
            {c.hook1}<br /><GradText>{c.hook2}</GradText>
          </div>
        </AbsoluteFill>
      )}
      {/* CH1 — AI */}
      {frame >= 56 && frame < 212 && (
        <AbsoluteFill style={{ padding: `${SAFE_TOP}px 64px ${SAFE_BOTTOM}px`, alignItems: 'center', justifyContent: 'center', gap: 34, ...out(210) }}>
          <div style={{ position: 'relative', width: 620, height: 800, display: 'grid', placeItems: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: 1 - morph, filter: `blur(${morph * 8}px)` }}>
              <div style={{ ...rise(springy(frame, fps, 62)) }}><LIgPost width={580} /></div>
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: morph, filter: `blur(${(1 - morph) * 8}px)`, transform: `scale(${0.94 + morph * 0.06})` }}>
              <LProductCard width={580} />
            </div>
            {scanY > 0.001 && scanY < 0.999 && (
              <div style={{ position: 'absolute', left: -20, right: -20, top: `${8 + scanY * 78}%`, height: 7, backgroundImage: GRAD, boxShadow: '0 0 46px 12px rgba(255,46,77,0.55)' }} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            {chip(lang === 'sq' ? 'Emri' : 'Name', 112)}
            {chip(lang === 'sq' ? 'Çmimi' : 'Price', 126)}
            {chip(lang === 'sq' ? 'Masat' : 'Sizes', 140)}
          </div>
          <Caption s={springy(frame, fps, 80)}>{c.ch1cap}</Caption>
        </AbsoluteFill>
      )}
      {/* CH2 — SHOP */}
      {frame >= 206 && frame < 362 && (
        <AbsoluteFill style={{ padding: `${SAFE_TOP}px 64px ${SAFE_BOTTOM}px`, alignItems: 'center', justifyContent: 'center', gap: 30, ...out(360) }}>
          <div style={{ ...rise(springy(frame, fps, 212)), width: 840, display: 'flex', alignItems: 'center', gap: 16, background: '#fff', borderRadius: 99, padding: '18px 30px', boxShadow: '0 24px 70px -24px rgba(0,0,0,0.6)' }}>
            <span style={{ width: 26, height: 26, borderRadius: 99, border: '3px solid #796770' }} />
            <span style={{ fontSize: 30, fontWeight: 700, color: '#141414' }}>
              {URL.slice(0, chars)}{frame < 296 && Math.floor(frame / 9) % 2 === 0 ? <span style={{ color: '#A31234' }}>|</span> : null}
            </span>
          </div>
          <div style={{ ...rise(springy(frame, fps, 226)) }}>
            <ThemeMorph s1={s1} s2={s2} width={560} />
          </div>
          <div style={{ ...rise(springy(frame, fps, 240)) }}>
            <ThemeDots s1={s1} s2={s2} />
          </div>
          <Caption s={springy(frame, fps, 254)}>{c.ch2cap}</Caption>
        </AbsoluteFill>
      )}
      {/* CH3 — MONEY */}
      {frame >= 356 && frame < 512 && (
        <AbsoluteFill style={{ padding: `${SAFE_TOP}px 64px ${SAFE_BOTTOM}px`, alignItems: 'center', justifyContent: 'center', gap: 26, ...out(510) }}>
          <div style={{ ...rise(springy(frame, fps, 362)) }}><LNotif width={660} /></div>
          <div style={{ ...rise(springy(frame, fps, 380)) }}><LNotif width={660} name="Sara nga Vlora" amount="6,900 L" /></div>
          <div style={{ ...rise(springy(frame, fps, 404)), display: 'flex', alignItems: 'center', gap: 26 }}>
            <svg width={110} height={110} viewBox="0 0 110 110">
              <circle cx={55} cy={55} r={R} fill="none" stroke="#4ADE80" strokeWidth={9} strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - ring)} transform="rotate(-90 55 55)" />
              <path d="M36 57 L50 71 L76 43" fill="none" stroke="#4ADE80" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={70} strokeDashoffset={70 * (1 - clamp(frame, [452, 476], [0, 1], Easing.out(Easing.cubic)))} />
            </svg>
            <RaiBadge size={24} />
          </div>
          <div style={{ ...rise(springy(frame, fps, 470)), display: 'flex', alignItems: 'center', fontFamily: CLASH, fontWeight: 700, fontSize: 40, color: '#fff' }}>
            <CurrencyRoll size={40} gradient width={182} />&nbsp;· {lang === 'sq' ? 'kartë + kesh' : 'card + cash'}
          </div>
          <Caption s={springy(frame, fps, 484)}>{c.ch3cap}</Caption>
        </AbsoluteFill>
      )}
      {/* CH4 — CONTROL */}
      {frame >= 506 && frame < 722 && (
        <AbsoluteFill style={{ padding: `${SAFE_TOP}px 64px ${SAFE_BOTTOM}px`, alignItems: 'center', justifyContent: 'center', gap: 30, ...out(720) }}>
          <div style={{ transform: 'scale(0.98)' }}>
            <PanelWindow frame={frame} fps={fps} from={512} />
          </div>
          <div style={{ ...rise(springy(frame, fps, 640)) }}><LStat width={700} /></div>
          <Caption s={springy(frame, fps, 660)}>{c.ch4cap}</Caption>
        </AbsoluteFill>
      )}
      {/* PAYOFF */}
      {frame >= 716 && (
        <AbsoluteFill style={{ padding: `${SAFE_TOP}px 64px ${SAFE_BOTTOM}px`, alignItems: 'center', justifyContent: 'center', gap: 34 }}>
          <div style={{ ...rise(springy(frame, fps, 722, { damping: 11, stiffness: 230 })) }}>
            <Boat size={230} bob />
          </div>
          <div style={{ ...rise(springy(frame, fps, 736)), fontFamily: CLASH, fontWeight: 700, fontSize: 84, color: '#fff', textAlign: 'center', lineHeight: 1.15 }}>
            {c.payoff1}<br /><GradText>{c.payoff2}</GradText>
          </div>
          <div style={{ ...rise(springy(frame, fps, 764)) }}>
            <Cta size={38}>{c.cta}</Cta>
          </div>
          <div style={{ ...rise(springy(frame, fps, 782)), fontSize: 29, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>{c.trial}</div>
        </AbsoluteFill>
      )}
      <BladeSweep at={54} /><BladeSweep at={204} /><BladeSweep at={354} /><BladeSweep at={504} /><BladeSweep at={714} />
    </Shell>
  );
};
export const FIN_MACHINE_FRAMES = 900;

/* ══ FR2 — you don't need (15s) ═════════════════════════════════════════ */
export const FinReelNoNeed: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = COPY[lang].fr2;
  const BEAT0 = 48, BEAT_LEN = 46;
  const beatIdx = Math.min(c.beats.length - 1, Math.floor((frame - BEAT0) / BEAT_LEN));
  const inBeats = frame >= BEAT0 && frame < BEAT0 + c.beats.length * BEAT_LEN;
  const local = frame - (BEAT0 + beatIdx * BEAT_LEN);
  const slam = springy(frame, fps, BEAT0 + beatIdx * BEAT_LEN, { damping: 10, stiffness: 300 });
  const strike = clamp(local, [14, 26], [0, 1], Easing.inOut(Easing.cubic));
  const shake = clamp(local, [0, 4], [1, 0]);
  const payoffAt = BEAT0 + c.beats.length * BEAT_LEN + 6; // 284

  return (
    <Shell shake={inBeats ? shake * 0.7 : 0}>
      {/* HOOK — stays pinned during the beats */}
      {frame < payoffAt - 8 && (
        <div style={{ ...exitUp(clamp(frame, [payoffAt - 16, payoffAt - 6], [0, 1], Easing.in(Easing.cubic))) }}>
          <div style={{ ...rise(springy(frame, fps, 2, { damping: 11, stiffness: 240 })), fontFamily: CLASH, fontWeight: 700, fontSize: 72, color: '#fff', textAlign: 'center', lineHeight: 1.16 }}>
            {c.hook1}<br /><GradText>{c.hook2}</GradText>
          </div>
        </div>
      )}
      {/* BEATS */}
      {inBeats && (
        <AbsoluteFill style={{ padding: `${SAFE_TOP + 260}px 64px ${SAFE_BOTTOM}px`, alignItems: 'center', justifyContent: 'center', gap: 40 }}>
          <div style={{ fontSize: 130, opacity: Math.min(1, slam * 1.4), transform: `scale(${0.7 + slam * 0.3})` }}>{c.beats[beatIdx][1]}</div>
          <div style={{ position: 'relative', opacity: Math.min(1, slam * 1.5), transform: `scale(${0.85 + slam * 0.15})` }}>
            <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 88, color: '#fff', textAlign: 'center', letterSpacing: '-0.01em' }}>
              {c.beats[beatIdx][0]}
            </div>
            <div style={{ position: 'absolute', left: '-4%', top: '50%', width: `${strike * 108}%`, height: 10, marginTop: -5, background: '#FF3B47', borderRadius: 6, boxShadow: '0 0 30px 6px rgba(255,59,71,0.5)', transform: 'rotate(-3deg)' }} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {c.beats.map((_, i) => (
              <span key={i} style={{ width: 12, height: 12, borderRadius: 99, background: i <= beatIdx ? '#FF3B47' : 'rgba(255,255,255,0.22)' }} />
            ))}
          </div>
        </AbsoluteFill>
      )}
      {/* PAYOFF */}
      {frame >= payoffAt && (
        <AbsoluteFill style={{ padding: `${SAFE_TOP}px 64px ${SAFE_BOTTOM}px`, alignItems: 'center', justifyContent: 'center', gap: 36 }}>
          <div style={{ ...rise(springy(frame, fps, payoffAt + 4, { damping: 11, stiffness: 240 })), fontFamily: CLASH, fontWeight: 700, fontSize: 82, color: '#fff', textAlign: 'center', lineHeight: 1.16 }}>
            {c.payoff1}<br /><GradText>{c.payoff2}</GradText>
          </div>
          <div style={{ ...rise(springy(frame, fps, payoffAt + 26)) }}>
            <Cta size={38}>{c.cta}</Cta>
          </div>
        </AbsoluteFill>
      )}
    </Shell>
  );
};
export const FIN_NONEED_FRAMES = 450;

/* ══ FR3 — open 24/7 + trust (13s) ══════════════════════════════════════ */
export const FinReelNight: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = COPY[lang].fr3;
  const closed = springy(frame, fps, 196, { damping: 11, stiffness: 230 });
  const stageOut = clamp(frame, [272, 284], [0, 1], Easing.in(Easing.cubic));
  return (
    <Shell>
      {frame < 286 && (
        <AbsoluteFill style={{ padding: `${SAFE_TOP}px 64px ${SAFE_BOTTOM}px`, alignItems: 'center', justifyContent: 'center', gap: 26, ...exitUp(stageOut) }}>
          <div style={{ ...rise(springy(frame, fps, 2, { damping: 11, stiffness: 250 })), fontFamily: CLASH, fontWeight: 700, fontSize: 150, backgroundImage: GRAD_TEXT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            23:47
          </div>
          {[{ n: 'Klea nga Shkodra', a: '3,400 L', d: 42 }, { n: 'Andi nga Durrësi', a: '2,900 L', d: 74 }].map((x) => {
            const s = springy(frame, fps, x.d, { damping: 12, stiffness: 210 });
            if (s <= 0.01) return null;
            return (
              <div key={x.n} style={{ opacity: Math.min(1, s * 1.6), transform: `translateY(${(1 - s) * -70}px)` }}>
                <LNotif width={660} name={x.n} amount={x.a} />
              </div>
            );
          })}
          <div style={{ ...rise(springy(frame, fps, 116)), fontFamily: CLASH, fontWeight: 700, fontSize: 76, color: '#fff', textAlign: 'center', lineHeight: 1.18 }}>
            {c.line1}<br /><GradText>{c.line2}</GradText>
          </div>
          <div style={{ ...rise(springy(frame, fps, 186)), display: 'flex', alignItems: 'center', gap: 24, background: 'rgba(255,255,255,0.94)', borderRadius: 26, padding: '18px 32px' }}>
            <div style={{ transform: 'scale(0.42)', margin: -60 }}><Padlock closed={closed} /></div>
            <span style={{ fontSize: 29, fontWeight: 800, color: '#141414' }}>{c.trust}</span>
          </div>
          <div style={{ ...rise(springy(frame, fps, 216)) }}>
            <RaiBadge size={22} />
          </div>
        </AbsoluteFill>
      )}
      {frame >= 280 && (
        <AbsoluteFill style={{ padding: `${SAFE_TOP}px 64px ${SAFE_BOTTOM}px`, alignItems: 'center', justifyContent: 'center', gap: 36 }}>
          <div style={{ ...rise(springy(frame, fps, 286, { damping: 11, stiffness: 240 })), fontFamily: CLASH, fontWeight: 700, fontSize: 88, color: '#fff', textAlign: 'center', lineHeight: 1.16 }}>
            {c.payoff1}<br /><GradText>{c.payoff2}</GradText>
          </div>
          <div style={{ ...rise(springy(frame, fps, 310)) }}>
            <Cta size={38}>{c.cta}</Cta>
          </div>
        </AbsoluteFill>
      )}
    </Shell>
  );
};
export const FIN_NIGHT_FRAMES = 390;
