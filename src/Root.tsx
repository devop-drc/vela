/**
 * Root — the composition registry Remotion Studio reads. Add a new graphic by
 * creating a file in src/compositions/ then registering a <Composition> here
 * with an id, size/fps (from src/config/video.ts), its zod schema and
 * defaultProps. Size & fps come from ONE place so 1080p→4K/60 is a one-line
 * change in src/config/video.ts.
 */
import { Composition } from "remotion";
import { VIDEO, sec } from "./config/video";
import { TitleCard, titleCardSchema, titleCardDefaults } from "./compositions/TitleCard";
import { LowerThird, lowerThirdSchema, lowerThirdDefaults } from "./compositions/LowerThird";
import { KineticText, kineticTextSchema, kineticTextDefaults } from "./compositions/KineticText";
import { TransparentBadge, transparentBadgeSchema, transparentBadgeDefaults } from "./compositions/TransparentBadge";
import { HeroFilm, heroFilmSchema, heroFilmDefaults, HERO_FILM } from "./compositions/HeroFilm";
import { LogoStingIntro, LogoStingLoop, logoStingSchema, logoStingDefaults, LOGO_STING } from "./compositions/LogoSting";
import { StoryIntro, storyIntroSchema, storyIntroDefaults } from "./compositions/stories/StoryIntro";
import { StoryProblem, storyProblemSchema, storyProblemDefaults } from "./compositions/stories/StoryProblem";
import { StorySteps, storyStepsSchema, storyStepsDefaults } from "./compositions/stories/StorySteps";
import { StoryFeatures, storyFeaturesSchema, storyFeaturesDefaults } from "./compositions/stories/StoryFeatures";
import { StoryCTA, storyCtaSchema, storyCtaDefaults } from "./compositions/stories/StoryCTA";
import { mkSchema, mkDefaults, ReelPostToProduct, ReelFiveMin, ReelBoom, REEL_P2P_FRAMES, REEL_5MIN_FRAMES, REEL_BOOM_FRAMES } from "./compositions/marketing/Reels";
import { PostOrders, PostPanel, PostSteps, POST_ORDERS_FRAMES, POST_PANEL_FRAMES, POST_STEPS_FRAMES } from "./compositions/marketing/Posts";
import { StillPostToProduct, StillFiveMin, StillBoom, StillOrders, StillPanel, GallerySlide1, GallerySlide2, GallerySlide3 } from "./compositions/marketing/Stills";
import { ReelMorph, ReelPanelLive, ReelQuiet, PostCheckout, PostStock, PostLink, StillMorphLight, StillPanelLight, StillQuiet, StillCheckout, StillStock, StillLink, REEL_MORPH_FRAMES, REEL_PANEL_FRAMES, REEL_QUIET_FRAMES, POST_CHECKOUT_FRAMES, POST_STOCK_FRAMES, POST_LINK_FRAMES } from "./compositions/marketing/Light";
import { ReelBeforeAfter, ReelDayWithVela, ReelYourBrand, PostNightSales, PostSplit, PostThemes, StillBeforeAfter, StillDayTimeline, StillBrand, StillNightSales, StillSplitPost, StillThemes, REEL_BA_FRAMES, REEL_DAY_FRAMES, REEL_BRAND_FRAMES, POST_NIGHT_FRAMES, POST_SPLIT_FRAMES, POST_THEMES_FRAMES } from "./compositions/marketing/Duo";
import { ReelSecure, PostSecure, StillSecure, StillSecurePost, REEL_SECURE_FRAMES, POST_SECURE_FRAMES } from "./compositions/marketing/Secure";
import { TkPriceInDm, TkOldLek, TkPovSeller, TkHaggle, TK_DM_FRAMES, TK_LEK_FRAMES, TK_POV_FRAMES, TK_HAGGLE_FRAMES } from "./compositions/marketing/TikTok";
import { langSchema, langDefaults } from "./compositions/marketing/final/copy";
import { FinReelMachine, FinReelNoNeed, FinReelNight, FIN_MACHINE_FRAMES, FIN_NONEED_FRAMES, FIN_NIGHT_FRAMES } from "./compositions/marketing/final/FinalReels";
import { FinPostPanel, FinPostFive, FIN_PANEL_FRAMES, FIN_FIVE_FRAMES } from "./compositions/marketing/final/FinalPosts";
import { FinReelCover, FinSystemPost, FinStoryTrial, FinStoryTonight, partSchema, partDefaults } from "./compositions/marketing/final/FinalStills";
import { FinCarousel, carSchema, carDefaults } from "./compositions/marketing/final/FinalCarousel";
import { ProductPromo, productPromoSchema, productPromoDefaults, PROMO_FPS, PROMO_DEFAULT_FRAMES } from "./compositions/ProductPromo";
import { HlCover, HlStory, hlSchema, hlDefaults, CleanReelConvert, CleanReelAutoPost, CleanReelPay, CleanPostImport, CleanPostStudio, CLEAN_CONVERT_FRAMES, CLEAN_AUTOPOST_FRAMES, CLEAN_PAY_FRAMES, CLEAN_IMPORT_FRAMES, CLEAN_STUDIO_FRAMES } from "./compositions/marketing/ProfileKit";
import { C4MicroOrders, C3MicroDm, MICRO_ORDERS_FRAMES, MICRO_DM_FRAMES } from "./compositions/marketing/nextgen/Nextgen";
import { C1MacroDark, C2MacroLight, C5BeforeAfter, MACRO_DARK_FRAMES, MACRO_LIGHT_FRAMES, BEFORE_AFTER_FRAMES } from "./compositions/marketing/nextgen/NextgenMacro";
import { C6Matrix, C7StatCard, C8TrustProof, STILL_FRAMES } from "./compositions/marketing/nextgen/NextgenStills";
import { NightfallProof, DaybreakProof, NIGHTFALL_FRAMES, DAYBREAK_FRAMES } from "./compositions/marketing/nextgen/ProofV2";
import { LaunchDmToShop, LAUNCH_DM_FRAMES } from "./compositions/campaign/Launch";
import { LaunchStepsCover, LaunchSteps1, LaunchSteps2, LaunchSteps3, STEP_W, STEP_H, STEP_FRAMES } from "./compositions/campaign/LaunchSteps";
import { LaunchDashboard, LAUNCH_DASH_FRAMES } from "./compositions/campaign/LaunchDashboard";
import { LaunchLocal, LOCAL_W, LOCAL_H, LOCAL_FRAMES } from "./compositions/campaign/LaunchLocal";
import { LaunchFuture, LAUNCH_FUTURE_FRAMES } from "./compositions/campaign/LaunchFuture";
import { LaunchOffer, OFFER_W, OFFER_H, OFFER_FRAMES } from "./compositions/campaign/LaunchOffer";
import { FinalLaunch01DmPrice, FINAL_DM_FRAMES } from "./compositions/campaign/FinalLaunch";
import { getVideoMetadata } from "@remotion/media-utils";

const common = { fps: VIDEO.fps, width: VIDEO.width, height: VIDEO.height };
/** Instagram story canvas (9:16). */
const story = { fps: VIDEO.fps, width: 1080, height: 1920 };

export const RemotionRoot = () => (
  <>
    <Composition
      id="TitleCard"
      component={TitleCard}
      durationInFrames={sec(5)}
      {...common}
      schema={titleCardSchema}
      defaultProps={titleCardDefaults}
    />
    <Composition
      id="LowerThird"
      component={LowerThird}
      durationInFrames={sec(5)}
      {...common}
      schema={lowerThirdSchema}
      defaultProps={lowerThirdDefaults}
    />
    <Composition
      id="KineticText"
      component={KineticText}
      durationInFrames={sec(4.5)}
      {...common}
      schema={kineticTextSchema}
      defaultProps={kineticTextDefaults}
    />
    <Composition
      id="TransparentBadge"
      component={TransparentBadge}
      durationInFrames={sec(4)}
      {...common}
      schema={transparentBadgeSchema}
      defaultProps={transparentBadgeDefaults}
    />
    <Composition id="HeroFilm" component={HeroFilm} durationInFrames={HERO_FILM.durationInFrames} fps={HERO_FILM.fps} width={HERO_FILM.width} height={HERO_FILM.height} schema={heroFilmSchema} defaultProps={heroFilmDefaults} />
    <Composition id="LogoStingIntro" component={LogoStingIntro} durationInFrames={LOGO_STING.introFrames} fps={LOGO_STING.fps} width={LOGO_STING.width} height={LOGO_STING.height} schema={logoStingSchema} defaultProps={logoStingDefaults} />
    <Composition id="LogoStingLoop" component={LogoStingLoop} durationInFrames={LOGO_STING.loopFrames} fps={LOGO_STING.fps} width={LOGO_STING.width} height={LOGO_STING.height} schema={logoStingSchema} defaultProps={logoStingDefaults} />
    <Composition id="StoryIntro" component={StoryIntro} durationInFrames={sec(7)} {...story} schema={storyIntroSchema} defaultProps={storyIntroDefaults} />
    <Composition id="StoryProblem" component={StoryProblem} durationInFrames={sec(8)} {...story} schema={storyProblemSchema} defaultProps={storyProblemDefaults} />
    <Composition id="StorySteps" component={StorySteps} durationInFrames={sec(10)} {...story} schema={storyStepsSchema} defaultProps={storyStepsDefaults} />
    <Composition id="StoryFeatures" component={StoryFeatures} durationInFrames={sec(9)} {...story} schema={storyFeaturesSchema} defaultProps={storyFeaturesDefaults} />
    <Composition id="StoryCTA" component={StoryCTA} durationInFrames={sec(6)} {...story} schema={storyCtaSchema} defaultProps={storyCtaDefaults} />

    {/* ── Marketing set (branding/marketing/instagram) ── */}
    <Composition id="ReelPostToProduct" component={ReelPostToProduct} durationInFrames={REEL_P2P_FRAMES} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="ReelFiveMin" component={ReelFiveMin} durationInFrames={REEL_5MIN_FRAMES} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="ReelBoom" component={ReelBoom} durationInFrames={REEL_BOOM_FRAMES} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="PostOrders" component={PostOrders} durationInFrames={POST_ORDERS_FRAMES} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="PostPanel" component={PostPanel} durationInFrames={POST_PANEL_FRAMES} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="PostSteps" component={PostSteps} durationInFrames={POST_STEPS_FRAMES} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillPostToProduct" component={StillPostToProduct} durationInFrames={30} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillFiveMin" component={StillFiveMin} durationInFrames={30} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillBoom" component={StillBoom} durationInFrames={30} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillOrders" component={StillOrders} durationInFrames={30} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillPanel" component={StillPanel} durationInFrames={30} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="GallerySlide1" component={GallerySlide1} durationInFrames={30} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="GallerySlide2" component={GallerySlide2} durationInFrames={30} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="GallerySlide3" component={GallerySlide3} durationInFrames={30} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />

    {/* ── Marketing LIGHT series (cleaner, ink-on-paper, UI morphs) ── */}
    <Composition id="ReelMorph" component={ReelMorph} durationInFrames={REEL_MORPH_FRAMES} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="ReelPanelLive" component={ReelPanelLive} durationInFrames={REEL_PANEL_FRAMES} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="ReelQuiet" component={ReelQuiet} durationInFrames={REEL_QUIET_FRAMES} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="PostCheckout" component={PostCheckout} durationInFrames={POST_CHECKOUT_FRAMES} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="PostStock" component={PostStock} durationInFrames={POST_STOCK_FRAMES} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="PostLink" component={PostLink} durationInFrames={POST_LINK_FRAMES} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillMorphLight" component={StillMorphLight} durationInFrames={30} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillPanelLight" component={StillPanelLight} durationInFrames={30} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillQuiet" component={StillQuiet} durationInFrames={30} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillCheckout" component={StillCheckout} durationInFrames={30} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillStock" component={StillStock} durationInFrames={30} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillLink" component={StillLink} durationInFrames={30} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />

    {/* ── Marketing DUO series (night × paper hybrid) ── */}
    <Composition id="ReelBeforeAfter" component={ReelBeforeAfter} durationInFrames={REEL_BA_FRAMES} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="ReelDayWithVela" component={ReelDayWithVela} durationInFrames={REEL_DAY_FRAMES} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="ReelYourBrand" component={ReelYourBrand} durationInFrames={REEL_BRAND_FRAMES} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="PostNightSales" component={PostNightSales} durationInFrames={POST_NIGHT_FRAMES} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="PostSplit" component={PostSplit} durationInFrames={POST_SPLIT_FRAMES} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="PostThemes" component={PostThemes} durationInFrames={POST_THEMES_FRAMES} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillBeforeAfter" component={StillBeforeAfter} durationInFrames={30} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillDayTimeline" component={StillDayTimeline} durationInFrames={30} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillBrand" component={StillBrand} durationInFrames={30} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillNightSales" component={StillNightSales} durationInFrames={30} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillSplitPost" component={StillSplitPost} durationInFrames={30} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillThemes" component={StillThemes} durationInFrames={30} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />

    {/* ── Marketing SECURE set (RaiAccept trust) ── */}
    <Composition id="ReelSecure" component={ReelSecure} durationInFrames={REEL_SECURE_FRAMES} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="PostSecure" component={PostSecure} durationInFrames={POST_SECURE_FRAMES} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillSecure" component={StillSecure} durationInFrames={30} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="StillSecurePost" component={StillSecurePost} durationInFrames={30} fps={30} width={1080} height={1350} schema={mkSchema} defaultProps={mkDefaults} />

    {/* ── Marketing TIKTOK set (Albanian meme formats) ── */}
    <Composition id="TkPriceInDm" component={TkPriceInDm} durationInFrames={TK_DM_FRAMES} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="TkOldLek" component={TkOldLek} durationInFrames={TK_LEK_FRAMES} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="TkPovSeller" component={TkPovSeller} durationInFrames={TK_POV_FRAMES} {...story} schema={mkSchema} defaultProps={mkDefaults} />
    <Composition id="TkHaggle" component={TkHaggle} durationInFrames={TK_HAGGLE_FRAMES} {...story} schema={mkSchema} defaultProps={mkDefaults} />

    {/* ── Marketing FINAL campaign (bilingual via {lang} props) ── */}
    <Composition id="FinReelMachine" component={FinReelMachine} durationInFrames={FIN_MACHINE_FRAMES} {...story} schema={langSchema} defaultProps={langDefaults} />
    <Composition id="FinReelNoNeed" component={FinReelNoNeed} durationInFrames={FIN_NONEED_FRAMES} {...story} schema={langSchema} defaultProps={langDefaults} />
    <Composition id="FinReelNight" component={FinReelNight} durationInFrames={FIN_NIGHT_FRAMES} {...story} schema={langSchema} defaultProps={langDefaults} />
    <Composition id="FinPostPanel" component={FinPostPanel} durationInFrames={FIN_PANEL_FRAMES} fps={30} width={1080} height={1350} schema={langSchema} defaultProps={langDefaults} />
    <Composition id="FinPostFive" component={FinPostFive} durationInFrames={FIN_FIVE_FRAMES} fps={30} width={1080} height={1350} schema={langSchema} defaultProps={langDefaults} />
    <Composition id="FinReelCover" component={FinReelCover} durationInFrames={30} {...story} schema={langSchema} defaultProps={langDefaults} />
    <Composition id="FinSystemPost" component={FinSystemPost} durationInFrames={30} fps={30} width={1080} height={1350} schema={partSchema} defaultProps={partDefaults} />
    <Composition id="FinStoryTrial" component={FinStoryTrial} durationInFrames={30} {...story} schema={langSchema} defaultProps={langDefaults} />
    <Composition id="FinStoryTonight" component={FinStoryTonight} durationInFrames={30} {...story} schema={langSchema} defaultProps={langDefaults} />
    <Composition id="FinCarousel" component={FinCarousel} durationInFrames={30} fps={30} width={1080} height={1350} schema={carSchema} defaultProps={carDefaults} />
    <Composition id="HlCover" component={HlCover} durationInFrames={1} fps={30} width={1080} height={1920} schema={hlSchema} defaultProps={hlDefaults} />
    <Composition id="HlStory" component={HlStory} durationInFrames={1} fps={30} width={1080} height={1920} schema={hlSchema} defaultProps={hlDefaults} />
    <Composition id="CleanReelConvert" component={CleanReelConvert} durationInFrames={CLEAN_CONVERT_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="CleanReelAutoPost" component={CleanReelAutoPost} durationInFrames={CLEAN_AUTOPOST_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="CleanReelPay" component={CleanReelPay} durationInFrames={CLEAN_PAY_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="CleanPostImport" component={CleanPostImport} durationInFrames={CLEAN_IMPORT_FRAMES} fps={30} width={1080} height={1350} />
    <Composition id="CleanPostStudio" component={CleanPostStudio} durationInFrames={CLEAN_STUDIO_FRAMES} fps={30} width={1080} height={1350} />
    {/* ── Launch campaign (content-plan.md) ── */}
    <Composition id="LaunchDmToShop" component={LaunchDmToShop} durationInFrames={LAUNCH_DM_FRAMES} {...story} />
    <Composition id="LaunchStepsCover" component={LaunchStepsCover} durationInFrames={STEP_FRAMES} fps={30} width={STEP_W} height={STEP_H} />
    <Composition id="LaunchSteps1" component={LaunchSteps1} durationInFrames={STEP_FRAMES} fps={30} width={STEP_W} height={STEP_H} />
    <Composition id="LaunchSteps2" component={LaunchSteps2} durationInFrames={STEP_FRAMES} fps={30} width={STEP_W} height={STEP_H} />
    <Composition id="LaunchSteps3" component={LaunchSteps3} durationInFrames={STEP_FRAMES} fps={30} width={STEP_W} height={STEP_H} />
    <Composition id="LaunchDashboard" component={LaunchDashboard} durationInFrames={LAUNCH_DASH_FRAMES} {...story} />
    <Composition id="LaunchLocal" component={LaunchLocal} durationInFrames={LOCAL_FRAMES} fps={30} width={LOCAL_W} height={LOCAL_H} />
    <Composition id="LaunchFuture" component={LaunchFuture} durationInFrames={LAUNCH_FUTURE_FRAMES} {...story} />
    <Composition id="LaunchOffer" component={LaunchOffer} durationInFrames={OFFER_FRAMES} fps={30} width={OFFER_W} height={OFFER_H} />
    <Composition id="FinalLaunch01DmPrice" component={FinalLaunch01DmPrice} durationInFrames={FINAL_DM_FRAMES} {...story} />

    {/* ── Rebuilt look — proofs (Nightfall dark hero · Daybreak cream editorial) ── */}
    <Composition id="NightfallProof" component={NightfallProof} durationInFrames={NIGHTFALL_FRAMES} {...story} />
    <Composition id="DaybreakProof" component={DaybreakProof} durationInFrames={DAYBREAK_FRAMES} {...story} />

    {/* ── Next-gen suite (real app UI · poster-first · marketing/NEW_CONTENT_PLAN.md) ── */}
    <Composition id="C1MacroDark" component={C1MacroDark} durationInFrames={MACRO_DARK_FRAMES} {...story} />
    <Composition id="C2MacroLight" component={C2MacroLight} durationInFrames={MACRO_LIGHT_FRAMES} {...story} />
    <Composition id="C3MicroDm" component={C3MicroDm} durationInFrames={MICRO_DM_FRAMES} {...story} />
    <Composition id="C4MicroOrders" component={C4MicroOrders} durationInFrames={MICRO_ORDERS_FRAMES} {...story} />
    <Composition id="C5BeforeAfter" component={C5BeforeAfter} durationInFrames={BEFORE_AFTER_FRAMES} {...story} />
    <Composition id="C6Matrix" component={C6Matrix} durationInFrames={STILL_FRAMES} {...story} />
    <Composition id="C7StatCard" component={C7StatCard} durationInFrames={STILL_FRAMES} {...story} />
    <Composition id="C8TrustProof" component={C8TrustProof} durationInFrames={STILL_FRAMES} {...story} />

    {/* Instagram Studio motion overlay — duration follows the source video (capped at 60s, reels limit-safe). */}
    <Composition
      id="ProductPromo"
      component={ProductPromo}
      durationInFrames={PROMO_DEFAULT_FRAMES}
      fps={PROMO_FPS}
      width={1080}
      height={1920}
      schema={productPromoSchema}
      defaultProps={productPromoDefaults}
      calculateMetadata={async ({ props }) => {
        if (!props.videoUrl) return {};
        try {
          const meta = await getVideoMetadata(props.videoUrl);
          const seconds = Math.min(Math.max(meta.durationInSeconds, 3), 60);
          return { durationInFrames: Math.round(seconds * PROMO_FPS) };
        } catch {
          return {};
        }
      }}
    />
  </>
);
