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
  </>
);
