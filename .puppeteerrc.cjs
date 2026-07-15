const { join } = require("path");

/**
 * Keep Puppeteer's Chromium inside the project so it survives Vercel wiping the
 * home directory between `npm install` and `npm run build` (the classic
 * "Could not find Chrome" build failure). Used only by the build-time
 * prerender step (scripts/prerender.mjs).
 */
module.exports = {
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
