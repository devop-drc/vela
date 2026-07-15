// The admin dashboard used to optionally adopt the storefront's design tokens
// ("Match my storefront"). That feature was removed: the app now has ONE fixed,
// standard Vela design, and merchant customisation lives entirely in the
// Storefront Studio (which themes the STOREFRONT, not the dashboard).
//
// This hook is kept as a no-op so existing call sites (DashboardLayout) stay
// stable without conditional imports. It performs no network requests.

interface MatchTheme {
  style: React.CSSProperties;
  className: string;
}

export const SF_SETTINGS_EVENT = 'sf-settings-updated';

export function useStorefrontMatchTheme(): MatchTheme | null {
  return null;
}
