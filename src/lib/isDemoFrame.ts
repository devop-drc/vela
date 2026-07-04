// True when this window is a demo/preview surface (/demo, /demo-shop) — used
// by global providers to skip backend fetches and realtime subscriptions.
// These routes render on mock data, and they get embedded MANY times at once
// (template marquee/gallery iframes), so per-frame context traffic multiplies
// into a request flood if not short-circuited.
export const isDemoFrame = (): boolean =>
  typeof window !== 'undefined' &&
  (window.location.pathname.startsWith('/demo-shop') || window.location.pathname === '/demo' || window.location.pathname.startsWith('/demo/'));
