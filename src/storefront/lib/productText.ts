// Localized customer-facing product text. products.name/caption are
// English-canonical (the AI classifier normalizes to English); per-locale
// overrides live in products.translations ({ sq: { name, caption } }, filled
// by the classifier on new syncs and the translate-products backfill).
// Falls back to the base text whenever a translation is missing.

import type { SfLang } from './visitorPrefs';

export interface ProductTextSource {
  name?: string | null;
  caption?: string | null;
  translations?: { [locale: string]: { name?: string; caption?: string } } | null;
}

export const productText = (p: ProductTextSource | null | undefined, lang: SfLang): { name: string; caption: string } => {
  const t = p?.translations?.[lang];
  return {
    name: t?.name || p?.name || '',
    caption: t?.caption || p?.caption || '',
  };
};
