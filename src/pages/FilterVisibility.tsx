import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProductData } from "@/hooks/useProductData";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const toTitle = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const FilterVisibility = () => {
  const { t } = useTranslation();
  const { allDetailsAttributes, isLoading } = useProductData();
  const baseKeys = ["categories", "tags", "priceRange"];
  const baseLabels: Record<string, string> = {
    categories: t("filter_visibility.categories"),
    tags: t("filter_visibility.tags"),
    priceRange: t("filter_visibility.price_range"),
  };
  const attributeKeys = useMemo(() => allDetailsAttributes.map(a => a.name), [allDetailsAttributes]);
  const allKeys = [...baseKeys, ...attributeKeys];
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("instagram_filter_visibility");
      if (raw) setVisibilityMap(JSON.parse(raw));
      else setVisibilityMap({});
    } catch {
      setVisibilityMap({});
    }
  }, []);

  const setKey = (key: string, value: boolean) => {
    setVisibilityMap(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem("instagram_filter_visibility", JSON.stringify(next));
      return next;
    });
  };

  const resetAll = () => {
    localStorage.removeItem("instagram_filter_visibility");
    setVisibilityMap({});
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">{t("filter_visibility.loading")}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("filter_visibility.title")}</h1>
        <Button variant="outline" onClick={resetAll}>{t("filter_visibility.reset_defaults")}</Button>
      </div>
      <div className="space-y-6">
        <div className="space-y-3">
          <h2 className="text-base font-medium">{t("filter_visibility.core_filters")}</h2>
          <div className="space-y-3">
            {baseKeys.map(key => (
              <div key={key} className="flex items-center justify-between py-2">
                <Label htmlFor={`sw-${key}`}>{baseLabels[key] ?? toTitle(key)}</Label>
                <Switch id={`sw-${key}`} checked={visibilityMap[key] !== false} onCheckedChange={(v) => setKey(key, v)} />
              </div>
            ))}
          </div>
        </div>
        <Separator />
        <div className="space-y-3">
          <h2 className="text-base font-medium">{t("filter_visibility.attributes")}</h2>
          <div className="space-y-3">
            {attributeKeys.length === 0 && (
              <div className="text-sm text-muted-foreground">{t("filter_visibility.no_attributes")}</div>
            )}
            {attributeKeys.map(key => (
              <div key={key} className="flex items-center justify-between py-2">
                <Label htmlFor={`sw-${key}`}>{toTitle(key)}</Label>
                <Switch id={`sw-${key}`} checked={visibilityMap[key] !== false} onCheckedChange={(v) => setKey(key, v)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterVisibility;
