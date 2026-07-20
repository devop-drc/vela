/** Instagram-storefront shell — the IG layout needs AppearanceContext (it
 *  restores the merchant's dashboard theme on exit), so it brings its own
 *  provider instance in its own lazy chunk. */
import { lazy } from "react";
import { AppearanceProvider } from "@/contexts/AppearanceContext";

const InstagramShopLayout = lazy(() => import("@/components/storefront/InstagramShopLayout"));

const IgShopShell = () => (
  <AppearanceProvider>
    <InstagramShopLayout />
  </AppearanceProvider>
);

export default IgShopShell;
