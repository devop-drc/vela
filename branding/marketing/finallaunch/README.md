# FinalLaunch — Vela launch set

Meme-native Albanian shopping-culture humor (POV / chat skits, Vela = the
punchline-fix) with **clean, serious brand typography** (Clash Display — no
outlined "TikTok" font) and **mixed light↔dark** scenes: a dark chaos/pain hook
→ hard cut → a clean light Vela payoff.

Two angles:
- **Seller POV** (01–04) — the merchant's daily pain, played for laughs.
- **Client POV** (05–06) — *your customers'* experience: endless scroll & DM
  ping-pong vs. search/filter and one-tap checkout.

All reels: 1080×1920 · 30fps · ~11s. Stills: 1080×1350 (4:5 feed).
Compositions live in `src/compositions/campaign/FinalLaunch.tsx` (reels) and
`FinalLaunchStills.tsx` (stills); registered in `src/Root.tsx`.

Rule: marketing voice says **"sistemi/platforma"**, never "AI". Multi-currency
(Lekë/€/$), never Lekë-only.

---

## Upload order & captions

### FinalLaunch01 — DmPrice  · *reel* · `FinalLaunch01DmPrice`
Hook: "Çmimi në DM 🙏 … po jemi në DM 💀" → payoff: çmimi rri te produkti.
> **Klasika shqiptare: "çmimi në DM". 🙏**
> Me Vela, çmimi rri te produkti — s'ka nevojë ta pyesin. Klientët shohin, klikojnë, blejnë.
> Kthe Instagramin në dyqan → **vela.al**

### FinalLaunch02 — Haggle · *reel* · `FinalLaunch02Haggle`
"Sa e le? 🤝" → çmimi është çmim; karta nuk bën pazar.
> **"Sa e le?" 😅**
> Pazari është traditë, po dyqani jo. Në Vela çmimi është çmim — paguan me kartë ose cash, pa lodhje.
> **vela.al**

### FinalLaunch03 — PovNoShop · *reel* · `FinalLaunch03PovNoShop`
"POV: shet pa dyqan → 147 DM pa përgjigje" → paneli shet ndërsa ti fle.
> **147 DM pa përgjigje. Të njihet? 😵‍💫**
> Vela i kthen postimet në dyqan: klientët porosisin vetë, ti sheh gjithçka në një panel. Ti fle — dyqani shet.
> **vela.al**

### FinalLaunch04 — OldLek · *reel* · `FinalLaunch04OldLek`
"1 milion — të vjetra apo të reja?? 💀" → çmim i qartë, në çdo monedhë.
> **Çdo blerje = provim matematike. 💀**
> Të vjetra apo të reja? Në Vela çmimi është i qartë — Lekë, Euro ose Dollarë, pa kalkulator.
> **vela.al**

### FinalLaunch05 — ClientScroll · *reel* · `FinalLaunch05ClientScroll`
Klienti skrollon pafund për të gjetur → kërko, filtro, gjej.
> **Klientët e tu skrollojnë 45 minuta për të gjetur një gjë. 😩**
> Me Vela e gjejnë në 3 sekonda — kërkim & filtra. Më pak mundim, më shumë blerje.
> **vela.al**

### FinalLaunch06 — ClientDm · *reel* · `FinalLaunch06ClientDm`
5 pyetje në DM për 1 blerje → 1 klik, zero DM.
> **"Sa kushton? Ku ndodheni? Si paguaj? Bëni dërgesa?" — 5 pyetje për 1 blerje. 😮‍💨**
> Në Vela klienti klikon, ti paketon: kartë ose cash, dërgesa dhe stoku automatik. Zero DM.
> **vela.al**

### FinalLaunch07 — Split · *still 4:5* · `FinalLaunch07Split`
PARA (kaos në DM) / PAS (checkout i pastër) në një kuadër.
> **Para Vela / Me Vela.** Nga kaosi i DM-ve te një dyqan që shet vetë. **vela.al**

### FinalLaunch08 — DmMeme · *still 4:5* · `FinalLaunch08DmMeme`
"Çmimi në DM" si post statik + rripi i Vela-s.
> **Klasika shqiptare. 💀** Me Vela, çmimi rri te produkti — pa "çmimi në DM". **vela.al**

### FinalLaunch09 — Stat · *still 4:5* · `FinalLaunch09Stat`
45 min scroll → 3 sekonda me kërkim & filtra.
> **45 minuta scroll → 3 sekonda.** Klientët gjejnë vetë. **vela.al**

Hashtag base (SQ): `#Vela #DyqaniYt #ShitjeOnline #Instagram #Shqipëri #BiznesShqiptar #ÇmimiNëDM`

---

## Rendering

Reels (MP4) and stills (PNG). Run from repo root.

```bash
# one reel
npx remotion render src/remotion.ts FinalLaunch01DmPrice out/finallaunch/FinalLaunch01.mp4

# all reels
for id in FinalLaunch01DmPrice FinalLaunch02Haggle FinalLaunch03PovNoShop \
          FinalLaunch04OldLek FinalLaunch05ClientScroll FinalLaunch06ClientDm; do
  npx remotion render src/remotion.ts "$id" "out/finallaunch/$id.mp4"
done

# stills (single frame → PNG)
for id in FinalLaunch07Split FinalLaunch08DmMeme FinalLaunch09Stat; do
  npx remotion still src/remotion.ts "$id" "out/finallaunch/$id.png" --frame=0
done
```

Preview interactively: `npm run studio` (or `npx remotion studio src/remotion.ts`).
