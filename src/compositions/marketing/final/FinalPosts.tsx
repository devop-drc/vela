/**
 * FINAL campaign — feed post videos (1080×1350 · 30fps).
 *
 *  FinPostPanel ~20s  "control room" guided tour with a chapter rail
 *  FinPostFive  ~10s  the 5-minute setup as a literal speedrun
 */
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND, CLASH, SATOSHI, GRAD, GRAD_TEXT, Blobs, Grain, Cta, springy, rise, exitUp } from '../mkKit';
import { LNotif, LStat } from '../Light';
import { ThemeMorph, ThemeDots } from '../Duo';
import { COPY, type Lang } from './copy';

const clamp = (f: number, a: [number, number], b: [number, number], ease?: (t: number) => number) =>
  interpolate(f, a, b, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', ...(ease ? { easing: ease } : {}) });

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BRAND.dark, fontFamily: SATOSHI }}>
      <Blobs frame={frame} />
      <Grain />
      <AbsoluteFill style={{ padding: '110px 72px 120px', zIndex: 3 }}>{children}</AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 52, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 22, fontWeight: 800, letterSpacing: '0.26em', zIndex: 6 }}>
        VELA.AL
      </div>
    </AbsoluteFill>
  );
};

const GradText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{children}</span>
);

/* ══ FP1 — control room (20s) ═══════════════════════════════════════════ */
export const FinPostPanel: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = COPY[lang].fp1;
  // hook 0–60 · orders 60–200 · stock 200–330 · money 330–450 · brand 450–556 · payoff 556–600
  const active = frame < 60 ? -1 : frame < 200 ? 0 : frame < 330 ? 1 : frame < 450 ? 2 : frame < 556 ? 3 : -1;
  const out = (end: number) => exitUp(clamp(frame, [end - 10, end], [0, 1], Easing.in(Easing.cubic)));

  const flip = clamp(frame, [140, 152], [0, 1], Easing.inOut(Easing.cubic));
  const roll = clamp(frame, [258, 272], [0, 1], Easing.inOut(Easing.cubic));
  const notifIn = springy(frame, fps, 232, { damping: 12, stiffness: 220 });
  const n = (target: number, from: number, dur = 30) => Math.round(clamp(frame, [from, from + dur], [0, 1], Easing.out(Easing.cubic)) * target);
  const s1 = springy(frame, fps, 480, { damping: 14 });
  const s2 = springy(frame, fps, 516, { damping: 14 });

  const CARD: React.CSSProperties = { background: '#fff', borderRadius: 26, boxShadow: '0 30px 80px -28px rgba(0,0,0,0.6)', fontFamily: SATOSHI };

  return (
    <Shell>
      {/* chapter rail */}
      {active >= 0 && (
        <div style={{ position: 'absolute', left: 72, top: 130, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 5 }}>
          {c.rail.map((r, i) => (
            <div key={r} style={{
              padding: '12px 22px', borderRadius: 14, fontSize: 24, fontWeight: 800,
              ...(i === active ? { backgroundImage: GRAD, color: '#fff' } : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)', border: '2px solid rgba(255,255,255,0.12)' }),
            }}>
              {r}
            </div>
          ))}
        </div>
      )}
      {/* HOOK */}
      {frame < 62 && (
        <AbsoluteFill style={{ padding: '110px 72px', alignItems: 'center', justifyContent: 'center', ...out(60) }}>
          <div style={{ ...rise(springy(frame, fps, 2, { damping: 11, stiffness: 240 })), fontFamily: CLASH, fontWeight: 700, fontSize: 84, color: '#fff', textAlign: 'center', lineHeight: 1.16 }}>
            {c.hook}
          </div>
        </AbsoluteFill>
      )}
      {/* ORDERS */}
      {frame >= 56 && frame < 202 && (
        <AbsoluteFill style={{ padding: '110px 72px 120px 300px', alignItems: 'center', justifyContent: 'center', gap: 26, ...out(200) }}>
          <div style={{ ...rise(springy(frame, fps, 66)) }}><LNotif width={640} /></div>
          <div style={{ ...rise(springy(frame, fps, 84)), ...CARD, width: 640, padding: '24px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 27, color: '#141414' }}>Porosia #4F2A · Atlete Vrapi Air</div>
              <div style={{ fontSize: 22, color: '#796770' }}>Elisa · Tiranë · me kartë</div>
            </div>
            <div style={{ perspective: 500 }}>
              <div style={{ transform: `rotateX(${flip * 180}deg)`, transformStyle: 'preserve-3d', position: 'relative', width: 175, height: 46 }}>
                <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', backfaceVisibility: 'hidden', borderRadius: 99, fontSize: 20, fontWeight: 800, background: '#FBF3E4', color: '#B07B10' }}>
                  {lang === 'sq' ? 'Në pritje' : 'Pending'}
                </span>
                <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', backfaceVisibility: 'hidden', transform: 'rotateX(180deg)', borderRadius: 99, fontSize: 20, fontWeight: 800, background: '#EAF7EE', color: '#1E7C3F' }}>
                  {lang === 'sq' ? 'U dërgua ✓' : 'Shipped ✓'}
                </span>
              </div>
            </div>
          </div>
        </AbsoluteFill>
      )}
      {/* STOCK */}
      {frame >= 196 && frame < 332 && (
        <AbsoluteFill style={{ padding: '110px 72px 120px 300px', alignItems: 'center', justifyContent: 'center', gap: 24, ...out(330) }}>
          <div style={{ opacity: Math.min(1, notifIn * 1.5), transform: `translateY(${(1 - notifIn) * -50}px) rotate(2deg)` }}>
            <LNotif width={540} name={lang === 'sq' ? 'Porosi · masa 42' : 'Order · size 42'} amount="4,500 L" />
          </div>
          <div style={{ ...rise(springy(frame, fps, 206)), ...CARD, width: 640, padding: '26px 32px' }}>
            {[['41', '14'], ['42', roll < 0.5 ? '12' : '11'], ['43', '9']].map(([size, count], i) => (
              <div key={size} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', borderBottom: i < 2 ? '2px solid #EDE4E1' : 'none', background: size === '42' ? `rgba(163,18,52,${0.09 * Math.max(0, 1 - Math.abs(roll - 0.5) * 2 + 0.5)})` : 'transparent', borderRadius: 12 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: '#141414' }}>{lang === 'sq' ? 'Masa' : 'Size'} {size}</span>
                <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 28, color: '#141414' }}>{count} {lang === 'sq' ? 'copë' : 'pcs'}</span>
              </div>
            ))}
          </div>
          <div style={{ ...rise(springy(frame, fps, 286)), background: '#EAF7EE', color: '#1E7C3F', borderRadius: 99, padding: '12px 28px', fontSize: 23, fontWeight: 800 }}>
            {lang === 'sq' ? 'Stoku përditësohet vetë ✓' : 'Stock updates itself ✓'}
          </div>
        </AbsoluteFill>
      )}
      {/* MONEY */}
      {frame >= 326 && frame < 452 && (
        <AbsoluteFill style={{ padding: '110px 72px 120px 300px', alignItems: 'center', justifyContent: 'center', gap: 24, ...out(450) }}>
          <div style={{ ...rise(springy(frame, fps, 336)), ...CARD, width: 640, padding: '28px 34px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#796770' }}>
              {lang === 'sq' ? 'Të ardhurat sot' : 'Revenue today'}
            </div>
            <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 66, color: '#141414' }}>{(n(84, 340) as number).toLocaleString('en-US')},500 L</div>
          </div>
          <div style={{ ...rise(springy(frame, fps, 366)), ...CARD, width: 640, padding: '28px 34px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#796770' }}>
                {lang === 'sq' ? 'Vizitorë sot' : 'Visitors today'}
              </div>
              <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 58, color: '#141414' }}>{n(341, 370)}</div>
            </div>
            <span style={{ background: '#EAF7EE', color: '#1E7C3F', borderRadius: 99, padding: '10px 22px', fontSize: 24, fontWeight: 800 }}>+24%</span>
          </div>
        </AbsoluteFill>
      )}
      {/* BRAND */}
      {frame >= 446 && frame < 558 && (
        <AbsoluteFill style={{ padding: '110px 72px 120px 300px', alignItems: 'center', justifyContent: 'center', gap: 22, ...out(556) }}>
          <div style={{ ...rise(springy(frame, fps, 456)) }}>
            <ThemeMorph s1={s1} s2={s2} width={520} />
          </div>
          <div style={{ ...rise(springy(frame, fps, 470)) }}>
            <ThemeDots s1={s1} s2={s2} />
          </div>
        </AbsoluteFill>
      )}
      {/* PAYOFF */}
      {frame >= 552 && (
        <AbsoluteFill style={{ padding: '110px 72px', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
          <div style={{ ...rise(springy(frame, fps, 558, { damping: 11, stiffness: 240 })), fontFamily: CLASH, fontWeight: 700, fontSize: 86, color: '#fff', textAlign: 'center', lineHeight: 1.15 }}>
            {c.payoff1} <GradText>{c.payoff2}</GradText>
          </div>
          <div style={{ ...rise(springy(frame, fps, 574)) }}>
            <Cta size={36}>{c.cta}</Cta>
          </div>
        </AbsoluteFill>
      )}
    </Shell>
  );
};
export const FIN_PANEL_FRAMES = 600;

/* ══ FP2 — five-minute speedrun (10s) ═══════════════════════════════════ */
export const FinPostFive: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = COPY[lang].fp2;
  const T0 = 40, T1 = 236;
  const t = clamp(frame, [T0, T1], [0, 1], Easing.inOut(Easing.cubic));
  const secondsLeft = Math.max(0, Math.round((1 - t) * 300));
  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const stamp = springy(frame, fps, 244, { damping: 9, stiffness: 260 });
  const bar = (i: number) => clamp(frame, [T0 + 8 + i * 62, T0 + 62 + i * 62], [0, 1], Easing.inOut(Easing.cubic));

  return (
    <Shell>
      <AbsoluteFill style={{ padding: '110px 84px 120px', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
        <div style={{ ...rise(springy(frame, fps, 2, { damping: 11, stiffness: 250 })), fontFamily: CLASH, fontWeight: 700, fontSize: 76, color: '#fff', textAlign: 'center' }}>
          {c.hook}
        </div>
        <div style={{ ...rise(springy(frame, fps, 22)), fontFamily: CLASH, fontWeight: 700, fontSize: 170, letterSpacing: '0.01em', color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
          {frame < 244 ? `${mm}:${ss}` : '0:00'}
        </div>
        <div style={{ width: 820, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {c.steps.map(([label, dur], i) => (
            <div key={label} style={{ ...rise(springy(frame, fps, 26 + i * 10)) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 27, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>
                <span><GradText>0{i + 1}</GradText>&nbsp;&nbsp;{label}</span>
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>{dur}</span>
              </div>
              <div style={{ height: 12, borderRadius: 9, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                <div style={{ width: `${bar(i) * 100}%`, height: '100%', backgroundImage: GRAD, borderRadius: 9 }} />
              </div>
            </div>
          ))}
        </div>
        {frame >= 240 && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(20,10,14,0.55)', zIndex: 5 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30, opacity: Math.min(1, stamp * 1.4), transform: `scale(${0.7 + stamp * 0.3}) rotate(${(1 - stamp) * -6}deg)` }}>
              <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 190, backgroundImage: GRAD_TEXT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                {c.done}
              </div>
              <Cta size={36}>{c.cta}</Cta>
            </div>
          </div>
        )}
      </AbsoluteFill>
    </Shell>
  );
};
export const FIN_FIVE_FRAMES = 300;
