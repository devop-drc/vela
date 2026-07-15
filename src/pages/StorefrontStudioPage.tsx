import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SimpleStudio } from "@/components/settings/studio/SimpleStudio";
import { usePageTitle } from "@/contexts/PageTitleContext";

/**
 * Storefront Studio — a simple, curated web editor for the storefront design.
 * (Replaced the granular knob-per-setting panel with a generalised editor whose
 * options combine harmoniously; all driven by the storefront design system.)
 */
export default function StorefrontStudioPage() {
  const { setTitle } = usePageTitle();
  const { t } = useTranslation();

  useEffect(() => { setTitle(t("nav.storefront", "Storefront Studio")); }, [setTitle, t]);

  return (
    <div className="mx-auto w-full max-w-[1800px]">
      <SimpleStudio />
    </div>
  );
}
