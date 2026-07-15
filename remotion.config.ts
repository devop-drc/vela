/**
 * Remotion CLI config (used by `remotion studio` / `remotion render`).
 * This does NOT affect the Vite app build — Vite ignores this file.
 * Per-render options (codec, transparency) are passed as CLI flags; see
 * REMOTION.md.
 */
import { Config } from "@remotion/cli/config";

Config.setOverwriteOutput(true);
Config.setVideoImageFormat("jpeg"); // default for opaque MP4; pass --image-format=png for alpha
