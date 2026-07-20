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
  </>
);
