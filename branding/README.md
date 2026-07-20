# Vela — Branding

Gjithçka zyrtare e markës Vela jeton këtu. **Përdor vetëm skedarët nga
`logo/`** — çdo gjë tjetër është burim, dokument ose arkiv.

## Struktura

```
branding/
├─ logo/                  ← ASETET ZYRTARE (përdor këto)
│  ├─ vela-mark.svg                 simboli kryesor (gradient)
│  ├─ vela-mark-mono-black.svg      simboli një-ngjyrësh (ink #2A1D22)
│  ├─ vela-mark-mono-white.svg      simboli i bardhë (sfonde të errëta/foto)
│  ├─ vela-app-icon.svg             ikona e aplikacionit (pllakë e bardhë)
│  ├─ vela-lockup.svg               simbol + fjala, horizontal (ink)
│  ├─ vela-lockup-white.svg         horizontal për sfonde të errëta
│  ├─ vela-lockup-mono-black.svg    horizontal, gjithçka ink
│  ├─ vela-lockup-mono-white.svg    horizontal, gjithçka e bardhë
│  ├─ vela-lockup-vertical.svg      vertikal (ink)
│  └─ vela-lockup-vertical-white.svg
├─ guidelines/
│  ├─ vela-brand.html               libri i markës (burimi)
│  └─ Vela-Brand-Guidelines.pdf     versioni PDF (gjenerohet nga HTML-ja)
├─ motion/                grafika lëvizëse (RENDERUAR me Remotion)
│  ├─ vela-sting-intro.webm/.mp4    logo ndërtohet → sheh kamerën → wink
│  └─ vela-sting-loop.webm/.mp4     vetëm pjesa e përsëritshme (seamless)
├─ fonts/                 Clash Display (6 pesha, OTF)
├─ deck/                  prezantimi i ekspansionit SaaS (HTML + PPTX)
└─ legacy/                logo e vjetër & asetet e para — VETËM arkiv
```

**Motion = Remotion.** Çdo grafikë lëvizëse e markës prodhohet si
kompozicion Remotion (`src/compositions/LogoSting.tsx`, i regjistruar në
`src/Root.tsx`; hap studion me `npx remotion studio src/remotion.ts`).
`.webm` = alfa transparente për web; `.mp4` = me sfond krem për vende pa
alfa. `vela-app-icon-animated.svg` mbetet si bonus i lehtë për <img>.

## Rregulla të shpejta

- **Wordmark-u është i konvertuar në kthesa** — lockup-et s'kanë nevojë për
  fonte të instaluara. Mos e rikrijo me tekst të gjallë.
- Paleta: Deep Wine `#7F1D3B` · Wine `#A31234` · Neon Red `#FF2E4D` ·
  Amber `#F59E0B` · Gold `#FACC15` · Ink `#2A1D22` · Cream `#FBF6F4` ·
  Night `#140A0E`.
- Gradienti: `linear-gradient(115°, #7F1D3B, #A31234 40%, #FF2E4D 75%, #F59E0B 115%)`.
- Detajet e plota (hapësira e lirë, madhësitë minimale, do/don't, tipografia,
  zëri): shih `guidelines/Vela-Brand-Guidelines.pdf`.

## Rigjenerimi i PDF-së

Pas çdo ndryshimi në `guidelines/vela-brand.html`, ri-printo PDF-në me
Puppeteer (printBackground + preferCSSPageSize) — ose thjesht kërkoja
Claude-it. Kopjet e aseteve në `public/` (aplikacioni) mbahen në sinkron
me `logo/`.
