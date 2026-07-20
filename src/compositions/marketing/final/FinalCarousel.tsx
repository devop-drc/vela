/**
 * FINAL campaign — "The voyage of one post": a SEAMLESS 5-slide carousel.
 * One 5400×1350 continuous canvas; the comp takes { lang, slide } and shows
 * the 1080px window at slide*1080. The journey beam, the dashed course line
 * and a straddling element on EVERY slide boundary make the panorama read as
 * one picture — the swipe-pull that gives seamless carousels their ~2×
 * swipe-through (see PLAN.md).
 *
 * Boundaries: b1 = IG post card · b2 = shop-link pill · b3 = shipped-order
 * strip · b4 = the boat sailing into the harbor of slide 5.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { BRAND, CLASH, SATOSHI, GRAD, GRAD_TEXT, Blobs, Grain, Boat } from '../mkKit';
import { LIgPost, LStat } from '../Light';
import { ThemedProduct, THEMES, Bubble } from '../Duo';
import { RaiBadge } from '../Secure';
import { COPY, type Lang } from './copy';

export const carSchema = z.object({ lang: z.enum(['en', 'sq']), slide: z.number().min(0).max(4) });
export const carDefaults = { lang: 'sq' as Lang, slide: 0 };

const W = 1080, SLIDES = 5, PANO = W * SLIDES;

const GradText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{children}</span>
);
const Label: React.FC<{ x: number; children: React.ReactNode }> = ({ x, children }) => (
  <div style={{ position: 'absolute', left: x, top: 120, display: 'inline-flex', alignItems: 'center', gap: 12, border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', borderRadius: 999, padding: '12px 28px', fontSize: 25, fontWeight: 800, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.8)' }}>
    <span style={{ width: 12, height: 12, borderRadius: 99, backgroundImage: GRAD }} />
    {children}
  </div>
);
const Head: React.FC<{ x: number; y?: number; w?: number; size?: number; children: React.ReactNode }> = ({ x, y = 200, w = 900, size = 74, children }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, fontFamily: CLASH, fontWeight: 700, fontSize: size, color: '#fff', lineHeight: 1.14 }}>{children}</div>
);

export const FinCarousel: React.FC<{ lang: Lang; slide: number }> = ({ lang, slide }) => {
  const c = COPY[lang].car;
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: BRAND.dark, fontFamily: SATOSHI }}>
      <div style={{ position: 'absolute', width: PANO, height: 1350, transform: `translateX(${-slide * W}px)` }}>
        {/* ── continuous canvas layers ── */}
        {[0, 1, 2, 3, 4].map((k) => (
          <div key={k} style={{ position: 'absolute', left: k * W, width: W, height: 1350 }}>
            <Blobs frame={frame + k * 40} />
          </div>
        ))}
        <Grain />
        {/* the journey beam */}
        <div style={{ position: 'absolute', left: -100, width: PANO + 200, top: 900, height: 210, backgroundImage: GRAD, opacity: 0.28, filter: 'blur(60px)' }} />
        {/* the dashed course line */}
        <div style={{ position: 'absolute', left: 0, width: PANO, top: 1000, height: 6, backgroundImage: 'repeating-linear-gradient(90deg, rgba(250,204,21,0.85) 0 30px, transparent 30px 62px)', borderRadius: 6 }} />
        {/* harbor glow at the far end */}
        <div style={{ position: 'absolute', left: PANO - 700, width: 900, top: 500, height: 850, background: 'radial-gradient(circle at 80% 60%, rgba(250,204,21,0.28), transparent 65%)' }} />

        {/* ── S1 · HOOK ── */}
        <div style={{ position: 'absolute', left: 84, top: 128, display: 'inline-flex', alignItems: 'center', gap: 12, border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', borderRadius: 999, padding: '12px 28px', fontSize: 25, fontWeight: 800, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.8)' }}>
          <span style={{ width: 12, height: 12, borderRadius: 99, backgroundImage: GRAD }} />{c.eyebrow}
        </div>
        <Head x={84} y={250} w={620} size={72}>{c.s1head1}<br /><GradText>{c.s1head2}</GradText></Head>
        {[['Sa kushton? 🙏', 90, 620, -5], ['Çmimi ju lutem', 380, 730, 3], ['A ka masë M?', 140, 840, -2]].map(([t, x, y, r]) => (
          <div key={t as string} style={{ position: 'absolute', left: x as number, top: y as number, transform: `rotate(${r}deg)`, opacity: 0.55 }}>
            <Bubble text={t as string} />
          </div>
        ))}

        {/* ── b1 · IG post straddling slide 1|2 ── */}
        <div style={{ position: 'absolute', left: W - 290, top: 330, transform: 'rotate(-3deg)' }}>
          <LIgPost width={580} />
        </div>

        {/* ── S2 · AI ── */}
        <Label x={W + 460}>{c.s2label}</Label>
        <Head x={W + 460} y={210} w={560} size={66}>{c.s2head}</Head>
        <div style={{ position: 'absolute', left: W + 460, top: 430, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[lang === 'sq' ? 'Emri ✓' : 'Name ✓', lang === 'sq' ? 'Çmimi ✓ 4,500 L' : 'Price ✓ 4,500 L', lang === 'sq' ? 'Masat ✓ 40–44' : 'Sizes ✓ 40–44'].map((t) => (
            <span key={t} style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.94)', color: '#141414', borderRadius: 999, padding: '12px 28px', fontSize: 28, fontWeight: 800 }}>{t}</span>
          ))}
        </div>
        <div style={{ position: 'absolute', left: W + 470, top: 760, fontSize: 30, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>{c.s2sub}</div>

        {/* ── b2 · link pill straddling slide 2|3 ── */}
        <div style={{ position: 'absolute', left: 2 * W - 330, top: 620, display: 'flex', alignItems: 'center', gap: 16, background: '#fff', borderRadius: 99, padding: '20px 34px', boxShadow: '0 28px 80px -26px rgba(0,0,0,0.65)' }}>
          <span style={{ width: 26, height: 26, borderRadius: 99, border: '3px solid #796770' }} />
          <span style={{ fontSize: 30, fontWeight: 800, color: '#141414' }}>dyqani-yt.vela.al</span>
        </div>

        {/* ── S3 · SHOP ── */}
        <Label x={2 * W + 120}>{c.s3label}</Label>
        <Head x={2 * W + 120} y={210} w={560} size={66}>{c.s3head}</Head>
        <div style={{ position: 'absolute', left: 2 * W + 120, top: 400, transform: 'scale(0.78)', transformOrigin: 'top left' }}>
          <ThemedProduct theme={THEMES[0]} width={560} />
        </div>
        <div style={{ position: 'absolute', left: 2 * W + 620, top: 430, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {c.s3chips.map((t) => (
            <span key={t} style={{ alignSelf: 'flex-start', border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.07)', color: '#fff', borderRadius: 999, padding: '11px 24px', fontSize: 25, fontWeight: 800 }}>{t}</span>
          ))}
        </div>

        {/* ── b3 · shipped order strip straddling slide 3|4 ── */}
        <div style={{ position: 'absolute', left: 3 * W - 310, top: 350, width: 620, background: '#fff', borderRadius: 24, padding: '22px 30px', boxShadow: '0 28px 80px -26px rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transform: 'rotate(2deg)' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 26, color: '#141414' }}>Porosia #4F2A</div>
            <div style={{ fontSize: 21, color: '#796770' }}>Elisa · Tiranë · me kartë</div>
          </div>
          <span style={{ background: '#EAF7EE', color: '#1E7C3F', borderRadius: 99, padding: '10px 22px', fontSize: 22, fontWeight: 800 }}>
            {lang === 'sq' ? 'U dërgua ✓' : 'Shipped ✓'}
          </span>
        </div>

        {/* ── S4 · CONTROL ── */}
        <Label x={3 * W + 400}>{c.s4label}</Label>
        <Head x={3 * W + 400} y={210} w={580} size={62}>{c.s4head}</Head>
        <div style={{ position: 'absolute', left: 3 * W + 400, top: 470, transform: 'scale(0.9)', transformOrigin: 'top left' }}>
          <LStat width={580} />
        </div>
        <div style={{ position: 'absolute', left: 3 * W + 400, top: 720, background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,255,255,0.16)', color: '#fff', borderRadius: 999, padding: '12px 28px', fontSize: 25, fontWeight: 800, display: 'inline-block' }}>
          {lang === 'sq' ? 'Stoku: numërohet vetë ✓' : 'Stock: counts itself ✓'}
        </div>

        {/* ── b4 · the boat sailing into slide 5 ── */}
        <div style={{ position: 'absolute', left: 4 * W - 150, top: 770 }}>
          <Boat size={300} />
        </div>

        {/* ── S5 · HARBOR ── */}
        <Label x={4 * W + 250}>{c.s5label}</Label>
        <Head x={4 * W + 250} y={210} w={640} size={92}><GradText>{c.s5head}</GradText></Head>
        <div style={{ position: 'absolute', left: 4 * W + 250, top: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {c.tiers.map(([name, days], i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 18, background: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: '18px 26px', width: 520 }}>
              <span style={{ width: 14, height: 44, borderRadius: 8, background: ['#FF2E4D', '#F59E0B', '#4ADE80'][i] }} />
              <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 32, color: '#141414' }}>{name}</span>
              <span style={{ marginLeft: 'auto', fontSize: 27, fontWeight: 800, color: '#796770' }}>{days}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', left: 4 * W + 250, top: 720, fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{c.s5note}</div>
        <div style={{ position: 'absolute', left: 4 * W + 250, top: 800, display: 'inline-flex', padding: '22px 52px', borderRadius: 999, backgroundImage: GRAD, color: '#fff', fontFamily: CLASH, fontWeight: 600, fontSize: 42 }}>
          {c.cta}
        </div>
        <div style={{ position: 'absolute', left: 4 * W + 250, top: 1180, transform: 'scale(0.9)', transformOrigin: 'top left' }}>
          <RaiBadge size={22} />
        </div>

        {/* per-slide chrome: page dots + swipe hint */}
        {[0, 1, 2, 3, 4].map((k) => (
          <React.Fragment key={`chrome-${k}`}>
            <div style={{ position: 'absolute', left: k * W + 84, top: 1256, display: 'flex', gap: 10 }}>
              {[0, 1, 2, 3, 4].map((d) => (
                <span key={d} style={{ width: d === k ? 34 : 12, height: 12, borderRadius: 99, ...(d === k ? { backgroundImage: GRAD } : { background: 'rgba(255,255,255,0.25)' }) }} />
              ))}
            </div>
            {k < 4 && (
              <div style={{ position: 'absolute', left: k * W + W - 260, top: 1244, fontFamily: CLASH, fontWeight: 600, fontSize: 32, color: 'rgba(255,255,255,0.6)' }}>
                {c.swipe}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </AbsoluteFill>
  );
};
