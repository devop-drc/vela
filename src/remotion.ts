/**
 * Remotion entry point — registers the composition Root for Studio & renders.
 * (Separate from the Vite app entry src/main.tsx, so the two coexist.)
 * Used by the "studio" script and the `remotion render` commands.
 */
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
