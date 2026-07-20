/**
 * FINAL campaign — image layer, rebuilt in the LEGACY visual anatomy
 * (first-generation waves): eyebrow pill with gradient dot, @vela.al handle,
 * real UI-card fragments, letterspaced footer signature. No emoji-grid or
 * floating-chip layouts — every element is a crafted fragment of the actual
 * product.
 *
 * The single posts are a NUMBERED SERIES — one per part of the system,
 * alternating canvases like the legacy grid rhythm:
 *   01 — The system  (night)  post → product transformation
 *   02 — The shop    (light)  brand, themes, one link
 *   03 — Payments    (duo)    white checkout card on the night canvas
 *   04 — Control     (night)  frosted panel tiles
 *   05 — The harbor  (light)  boat + trial tiers
 * Plus the reel cover (metamorfoza-style chain) and the two link-sticker
 * stories, all wearing the same chrome.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { BRAND, CLASH, SATOSHI, GRAD, GRAD_TEXT, Blobs, Grain, Cta, Boat, Eyebrow, NightShell, StatTile, IgPostCard, ProductCardMock, OrderNotif, CURRENCY_SYMBOLS } from '../mkKit';
import { LightShell, InkCta, LIgPost } from '../Light';
import { ThemedProduct, THEMES } from '../Duo';
import { RaiBadge } from '../Secure';
import { COPY, type Lang } from './copy';

export const partSchema = z.object({ lang: z.enum(['en', 'sq']), part: z.number().min(0).max(4) });
export const partDefaults = { lang: 'sq' as Lang, part: 0 };

const INK = BRAND.dark;
const MUTED = '#796770';
const WINE = '#A31234';

const GradText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{children}</span>
);

const NightHead: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 84 }) => (
  <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: size, color: '#fff', textAlign: 'center', lineHeight: 1.14, letterSpacing: '-0.01em' }}>{children}</div>
);
const LightHead: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 84 }) => (
  <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: size, color: INK, textAlign: 'center', lineHeight: 1.14, letterSpacing: '-0.01em' }}>{children}</div>
);
const NightSub: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: SATOSHI, fontSize: 31, fontWeight: 700, color: 'rgba(255,255,255,0.68)', textAlign: 'center', maxWidth: 860, lineHeight: 1.45 }}>{children}</div>
);
const LightSub: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: SATOSHI, fontSize: 31, fontWeight: 700, color: MUTED, textAlign: 'center', maxWidth: 860, lineHeight: 1.45 }}>{children}</div>
);
/** Gradient flow arrow (the legacy transformation connector). */
const FlowArrow: React.FC<{ vertical?: boolean }> = ({ vertical }) => (
  vertical ? (
    <div style={{ width: 7, height: 44, backgroundImage: GRAD, borderRadius: 6, position: 'relative' }}>
      <span style={{ position: 'absolute', bottom: -12, left: -8, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: '14px solid #F59E0B' }} />
    </div>
  ) : (
    <div style={{ width: 54, height: 7, backgroundImage: GRAD, borderRadius: 6, position: 'relative', flexShrink: 0 }}>
      <span style={{ position: 'absolute', right: -12, top: -8, borderTop: '11px solid transparent', borderBottom: '11px solid transparent', borderLeft: '14px solid #F59E0B' }} />
    </div>
  )
);

/* ══ The numbered system series (4:5) ═══════════════════════════════════ */
export const FinSystemPost: React.FC<{ lang: Lang; part: number }> = ({ lang, part }) => {
  const c = COPY[lang].series[part];
  const S = COPY[lang];

  /* 01 — night: post → product */
  if (part === 0) {
    return (
      <NightShell chrome>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 30 }}>
          <Eyebrow dark>{c.label}</Eyebrow>
          <NightHead>{c.h1} <GradText>{c.h2}</GradText></NightHead>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ transform: 'rotate(-2deg) scale(0.7)', margin: '-96px -80px' }}><IgPostCard /></div>
            <FlowArrow />
            <div style={{ transform: 'rotate(2deg) scale(0.7)', margin: '-96px -80px' }}><ProductCardMock /></div>
          </div>
          <NightSub>{c.sub}</NightSub>
          <Cta size={32}>{c.cta}</Cta>
        </AbsoluteFill>
      </NightShell>
    );
  }

  /* 02 — light: brand + one link */
  if (part === 1) {
    return (
      <LightShell>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 28 }}>
          <Eyebrow>{c.label}</Eyebrow>
          <LightHead>{c.h1} <span style={{ color: WINE }}>{c.h2}</span></LightHead>
          <div style={{ position: 'relative', width: 900, height: 470 }}>
            <div style={{ position: 'absolute', left: 40, top: 40, transform: 'rotate(-6deg) scale(0.72)', transformOrigin: 'bottom left' }}><ThemedProduct theme={THEMES[1]} /></div>
            <div style={{ position: 'absolute', right: 40, top: 40, transform: 'rotate(6deg) scale(0.72)', transformOrigin: 'bottom right' }}><ThemedProduct theme={THEMES[2]} /></div>
            <div style={{ position: 'absolute', left: 190, top: 0, transform: 'scale(0.88)', transformOrigin: 'top left' }}><ThemedProduct theme={THEMES[0]} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', borderRadius: 99, border: '2px solid #EDE4E1', padding: '16px 30px', boxShadow: '0 26px 60px -28px rgba(20,10,14,0.3)' }}>
            <span style={{ width: 24, height: 24, borderRadius: 99, border: `3px solid ${MUTED}` }} />
            <span style={{ fontFamily: SATOSHI, fontSize: 28, fontWeight: 800, color: INK }}>dyqani-yt.vela.al</span>
          </div>
          <LightSub>{c.sub}</LightSub>
          <InkCta size={30}>{c.cta}</InkCta>
        </AbsoluteFill>
      </LightShell>
    );
  }

  /* 03 — duo: white checkout success on night */
  if (part === 2) {
    const R = 46, C = 2 * Math.PI * R;
    return (
      <NightShell chrome>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 28 }}>
          <Eyebrow dark>{c.label}</Eyebrow>
          <NightHead>{c.h1} <GradText>{c.h2}</GradText></NightHead>
          <div style={{ width: 720, background: '#fff', borderRadius: 30, padding: '38px 40px', boxShadow: '0 34px 90px -30px rgba(0,0,0,0.65)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <svg width={116} height={116} viewBox="0 0 116 116">
              <circle cx={58} cy={58} r={R} fill="none" stroke="#1E7C3F" strokeWidth={9} strokeLinecap="round" strokeDasharray={C} />
              <path d="M38 60 L53 75 L80 45" fill="none" stroke="#1E7C3F" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 40, color: INK }}>{lang === 'sq' ? 'Porosia u krye' : 'Order complete'}</div>
            <div style={{ fontFamily: SATOSHI, fontSize: 25, fontWeight: 700, color: MUTED }}>Atlete Vrapi Air · 4,500 L · {lang === 'sq' ? 'me kartë' : 'by card'}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              {CURRENCY_SYMBOLS.slice(0, 5).map((s) => (
                <span key={s} style={{ border: '2px solid #EDE4E1', borderRadius: 99, padding: '8px 20px', fontFamily: CLASH, fontWeight: 700, fontSize: 24, color: WINE }}>{s}</span>
              ))}
            </div>
          </div>
          <RaiBadge size={23} />
          <NightSub>{c.sub}</NightSub>
          <Cta size={32}>{c.cta}</Cta>
        </AbsoluteFill>
      </NightShell>
    );
  }

  /* 04 — night: frosted control tiles */
  if (part === 3) {
    return (
      <NightShell chrome>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 30 }}>
          <Eyebrow dark>{c.label}</Eyebrow>
          <NightHead>{c.h1} <GradText>{c.h2}</GradText></NightHead>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, width: 880 }}>
            <StatTile label={lang === 'sq' ? 'Porositë sot' : 'Orders today'} value="12" accent />
            <StatTile label={lang === 'sq' ? 'Të ardhurat' : 'Revenue'} value="84,500 L" />
            <StatTile label={lang === 'sq' ? 'Produkte live' : 'Live products'} value="36" />
            <StatTile label={lang === 'sq' ? 'Vizitorë sot' : 'Visitors today'} value="341" />
          </div>
          <NightSub>{c.sub}</NightSub>
          <Cta size={32}>{c.cta}</Cta>
        </AbsoluteFill>
      </NightShell>
    );
  }

  /* 05 — light: the harbor (boat + trial tiers) */
  const accents = ['#FF2E4D', '#F59E0B', '#4ADE80'];
  const tiers = COPY[lang].fst1.tiers;
  return (
    <LightShell>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 26 }}>
        <Eyebrow>{c.label}</Eyebrow>
        <LightHead>{c.h1} <GradText>{c.h2}</GradText></LightHead>
        <Boat size={190} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 640 }}>
          {tiers.map(([name, days], i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 18, background: '#fff', border: '2px solid #EDE4E1', borderRadius: 20, padding: '18px 26px', boxShadow: '0 24px 60px -30px rgba(20,10,14,0.25)' }}>
              <span style={{ width: 13, height: 42, borderRadius: 8, background: accents[i] }} />
              <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 31, color: INK }}>{name}</span>
              <span style={{ marginLeft: 'auto', fontFamily: SATOSHI, fontSize: 25, fontWeight: 800, color: MUTED }}>{days}</span>
            </div>
          ))}
        </div>
        <LightSub>{c.sub}</LightSub>
        <InkCta size={30}>{c.cta}</InkCta>
      </AbsoluteFill>
    </LightShell>
  );
};

/* ══ Reel cover (9:16) — metamorfoza-style chain in night primitives ════ */
export const FinReelCover: React.FC<{ lang: Lang }> = ({ lang }) => {
  const c = COPY[lang].frc1;
  return (
    <NightShell reel chrome>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Eyebrow dark style={{ marginBottom: 6 }}>{COPY[lang].frc1eyebrow}</Eyebrow>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 88, color: '#fff', textAlign: 'center', lineHeight: 1.12 }}>
          {c.title1}<br /><GradText>{c.title2}</GradText>
        </div>
        <div style={{ transform: 'scale(0.6)', margin: '-118px -60px' }}><IgPostCard /></div>
        <FlowArrow vertical />
        <div style={{ transform: 'scale(0.6)', margin: '-104px -60px' }}><ProductCardMock /></div>
        <FlowArrow vertical />
        <div style={{ transform: 'scale(0.78)', margin: '-16px 0' }}><OrderNotif name="Elisa nga Tirana" amount="4,500 L" /></div>
        <div style={{ marginTop: 26, display: 'inline-flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.94)', color: '#141414', borderRadius: 999, padding: '18px 42px', fontFamily: CLASH, fontWeight: 600, fontSize: 38 }}>
          {c.watch}
        </div>
      </AbsoluteFill>
    </NightShell>
  );
};

/* ══ Stories (9:16) — legacy chrome + link-sticker zone (y 1150–1560) ═══ */
const StoryShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BRAND.dark, fontFamily: SATOSHI }}>
      <Blobs frame={frame} />
      <Grain />
      <div style={{ position: 'absolute', top: 96, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 30, fontWeight: 700, zIndex: 6 }}>@vela.al</div>
      <div style={{ position: 'absolute', bottom: 92, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 24, fontWeight: 700, letterSpacing: '0.3em', zIndex: 6 }}>
        VELA — DYQANI YT ONLINE
      </div>
      {children}
    </AbsoluteFill>
  );
};
const StickerZone: React.FC<{ tap: string; ghost: string }> = ({ tap, ghost }) => (
  <>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 1062, textAlign: 'center', fontFamily: CLASH, fontWeight: 600, fontSize: 42, color: '#fff' }}>{tap}</div>
    <div style={{ position: 'absolute', left: 140, right: 140, top: 1160, height: 380, border: '3px dashed rgba(255,255,255,0.22)', borderRadius: 34, display: 'grid', placeItems: 'center' }}>
      <span style={{ fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{ghost}</span>
    </div>
  </>
);

export const FinStoryTrial: React.FC<{ lang: Lang }> = ({ lang }) => {
  const c = COPY[lang].fst1;
  const accents = ['#FF2E4D', '#F59E0B', '#4ADE80'];
  return (
    <StoryShell>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 180, display: 'flex', justifyContent: 'center' }}>
        <Eyebrow dark>{COPY[lang].storyEyebrow1}</Eyebrow>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 268, textAlign: 'center', fontFamily: CLASH, fontWeight: 700, fontSize: 92, color: '#fff', lineHeight: 1.12 }}>
        {c.head1} <GradText>{c.head2}</GradText>
      </div>
      <div style={{ position: 'absolute', left: 90, right: 90, top: 470, display: 'flex', gap: 22 }}>
        {c.tiers.map(([name, days], i) => (
          <div key={name} style={{ flex: 1, background: 'rgba(255,255,255,0.95)', borderRadius: 28, padding: '30px 18px', textAlign: 'center', boxShadow: '0 30px 80px -28px rgba(0,0,0,0.6)', borderTop: `10px solid ${accents[i]}` }}>
            <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 36, color: '#141414' }}>{name}</div>
            <div style={{ marginTop: 10, fontSize: 27, fontWeight: 800, color: accents[i] === '#F59E0B' ? '#B45309' : accents[i] === '#4ADE80' ? '#1E7C3F' : '#A31234' }}>{days}</div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 742, textAlign: 'center', fontSize: 32, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{c.note}</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 826, display: 'flex', justifyContent: 'center' }}>
        <Boat size={190} />
      </div>
      <StickerZone tap={c.tap} ghost={c.ghost} />
    </StoryShell>
  );
};

export const FinStoryTonight: React.FC<{ lang: Lang }> = ({ lang }) => {
  const c = COPY[lang].fst2;
  return (
    <StoryShell>
      <div style={{ position: 'absolute', left: 90, top: 180 }}>
        <Eyebrow dark>{COPY[lang].storyEyebrow2}</Eyebrow>
      </div>
      <div style={{ position: 'absolute', right: 100, top: 186, fontFamily: CLASH, fontWeight: 700, fontSize: 70, backgroundImage: GRAD_TEXT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
        23:47
      </div>
      <div style={{ position: 'absolute', left: 90, top: 300, fontFamily: CLASH, fontWeight: 700, fontSize: 86, color: '#fff', lineHeight: 1.14, maxWidth: 880 }}>
        {c.head}
      </div>
      <div style={{ position: 'absolute', left: 90, right: 90, top: 512, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {c.checks.map((t) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 20, background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,255,255,0.14)', borderRadius: 22, padding: '22px 28px' }}>
            <span style={{ width: 42, height: 42, borderRadius: 99, background: '#EAF7EE', color: '#1E7C3F', display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 900 }}>✓</span>
            <span style={{ fontSize: 32, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>{t}</span>
          </div>
        ))}
      </div>
      <StickerZone tap={c.tap} ghost={c.ghost} />
    </StoryShell>
  );
};
