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

const common = { fps: VIDEO.fps, width: VIDEO.width, height: VIDEO.height };

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
  </>
);
