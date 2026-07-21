import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/contexts/ShopContext";
import { useAuth } from "@/contexts/AuthContext";
import { showError, showSuccess, toFriendlyError } from "@/utils/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Plus, X, Upload, Sparkles, Package, ListChecks, SlidersHorizontal, CheckCircle2 } from "lucide-react";

/**
 * Guided product creation: 1) main details → 2) specifications → 3) options
 * → 4) review. On finish the wizard structures everything itself — product
 * row, spec rows, option groups + values — and hands the created product
 * back to the parent (which opens it in view mode, where the Instagram
 * publish prompt takes over).
 */

interface SpecRow { key: string; value: string }
interface OptionGroup { name: string; values: string[] }

const CURRENCIES = ["ALL", "EUR", "USD", "GBP", "CHF"];

export const AddProductWizard = ({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (product: any) => void;
}) => {
  const { t } = useTranslation();
  const { shopDetails } = useShop();
  const { userId } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Step 1 — main details
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("ALL");
  const [inventory, setInventory] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [newCategory, setNewCategory] = useState("");
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [images, setImages] = useState<string[]>([]);

  // Step 2 — specifications
  const [specs, setSpecs] = useState<SpecRow[]>([{ key: "", value: "" }]);

  // Step 3 — options
  const [options, setOptions] = useState<OptionGroup[]>([]);

  useEffect(() => {
    if (!open || !userId) return;
    supabase.from("categories").select("id, name").eq("user_id", userId).order("name")
      .then(({ data }) => setCategories(data || []));
  }, [open, userId]);

  const reset = () => {
    setStep(0); setName(""); setDescription(""); setPrice(""); setCurrency("ALL");
    setInventory(""); setCategoryId("none"); setNewCategory(""); setImages([]);
    setSpecs([{ key: "", value: "" }]); setOptions([]);
  };

  const uploadImages = async (files: FileList) => {
    if (!userId) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const safeName = file.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9._-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
      const filePath = `${userId}/wizard/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from("product-media").upload(filePath, file, {
        cacheControl: "31536000", upsert: false, contentType: file.type || undefined,
      });
      if (error) { showError(t("wizard.upload_failed", { message: error.message })); continue; }
      const { data: { publicUrl } } = supabase.storage.from("product-media").getPublicUrl(filePath);
      setImages((prev) => [...prev, publicUrl]);
    }
    setUploading(false);
  };

  const cleanSpecs = specs.filter((s) => s.key.trim() && s.value.trim());
  const cleanOptions = options
    .map((o) => ({ name: o.name.trim(), values: o.values.map((v) => v.trim()).filter(Boolean) }))
    .filter((o) => o.name && o.values.length);

  const step1Valid = name.trim().length > 0 && Number.isFinite(parseFloat(price)) && parseFloat(price) >= 0;

  const create = async () => {
    if (!shopDetails?.id || !userId) { showError(t("products.shop_not_ready", "Your shop isn't ready yet. Please try again in a moment.")); return; }
    setSaving(true);
    try {
      // Category: existing, or auto-created from the free-text field.
      let finalCategoryId: string | null = categoryId !== "none" ? categoryId : null;
      if (!finalCategoryId && newCategory.trim()) {
        const { data: cat } = await supabase.from("categories")
          .insert({ name: newCategory.trim(), user_id: userId }).select("id").single();
        finalCategoryId = cat?.id ?? null;
      }

      const inv = parseInt(inventory, 10);
      const { data: product, error } = await supabase.from("products").insert({
        name: name.trim(),
        caption: description.trim() || null,
        status: "Active",
        business_id: shopDetails.id,
        price: parseFloat(price),
        currency,
        inventory: Number.isFinite(inv) ? inv : 0,
        pricing_type: "one_time",
        product_type: "physical",
        details: { type: "generic" },
        tags: [],
        category_id: finalCategoryId,
        media_url: images[0] ?? null,
        media_type: images[0] ? "image" : null,
        media_gallery: images.length > 1 ? images : null,
      }).select("*").single();
      if (error || !product) throw error ?? new Error("insert failed");

      if (cleanSpecs.length) {
        const { error: sErr } = await supabase.from("product_specifications").insert(
          cleanSpecs.map((s, i) => ({ product_id: product.id, user_id: userId, key: s.key.trim(), value: s.value.trim(), display_order: i }))
        );
        if (sErr) console.error("wizard specs insert:", sErr.message);
      }

      for (const [gIdx, group] of cleanOptions.entries()) {
        const { data: opt, error: oErr } = await supabase.from("product_options")
          .insert({ product_id: product.id, user_id: userId, name: group.name, display_order: gIdx, is_active: true })
          .select("id").single();
        if (oErr || !opt) { console.error("wizard option insert:", oErr?.message); continue; }
        const { error: vErr } = await supabase.from("option_values").insert(
          group.values.map((v, vIdx) => ({
            option_id: opt.id, user_id: userId, value: v,
            inventory: Number.isFinite(inv) ? inv : 0, is_active: true, is_default: vIdx === 0, display_order: vIdx,
          }))
        );
        if (vErr) console.error("wizard values insert:", vErr.message);
      }

      showSuccess(t("wizard.created", { name: product.name }));
      onOpenChange(false);
      reset();
      onCreated(product);
    } catch (e) {
      showError(toFriendlyError(e, t("products.create_failed", "Couldn't create the product. Please try again.")));
    } finally {
      setSaving(false);
    }
  };

  const STEPS = [
    { icon: Package, label: t("wizard.step_details") },
    { icon: ListChecks, label: t("wizard.step_specs") },
    { icon: SlidersHorizontal, label: t("wizard.step_options") },
    { icon: Sparkles, label: t("wizard.step_review") },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("wizard.title")}</DialogTitle>
          <DialogDescription>{t("wizard.description")}</DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={i} className="flex flex-1 items-center gap-1">
              <div className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                i === step ? "bg-primary text-primary-foreground" : i < step ? "text-primary" : "text-muted-foreground"
              )}>
                <s.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn("h-px flex-1", i < step ? "bg-primary" : "bg-border")} />}
            </div>
          ))}
        </div>

        <div className="-mx-1 flex-1 overflow-y-auto px-1 py-2">
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("wizard.name")} *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("wizard.name_ph")} autoFocus />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("wizard.price")} *</Label>
                  <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("wizard.currency")}</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("wizard.inventory")}</Label>
                  <Input type="number" min="0" value={inventory} onChange={(e) => setInventory(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("wizard.category")}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("wizard.category_none")}</SelectItem>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    value={newCategory}
                    onChange={(e) => { setNewCategory(e.target.value); if (e.target.value) setCategoryId("none"); }}
                    placeholder={t("wizard.category_new_ph")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("wizard.description")}</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={t("wizard.description_ph")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("wizard.images")}</Label>
                <div className="flex flex-wrap gap-2">
                  {images.map((url) => (
                    <div key={url} className="relative h-16 w-16 overflow-hidden rounded-md border">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="grid h-16 w-16 place-items-center rounded-md border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    {uploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => { if (e.target.files?.length) uploadImages(e.target.files); e.target.value = ""; }} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("wizard.specs_hint")}</p>
              {specs.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={s.key} placeholder={t("wizard.spec_key_ph")}
                    onChange={(e) => setSpecs((p) => p.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} />
                  <Input value={s.value} placeholder={t("wizard.spec_value_ph")}
                    onChange={(e) => setSpecs((p) => p.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setSpecs((p) => p.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setSpecs((p) => [...p, { key: "", value: "" }])}>
                <Plus className="mr-2 h-4 w-4" />{t("wizard.add_spec")}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("wizard.options_hint")}</p>
              {options.map((o, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Input value={o.name} placeholder={t("wizard.option_name_ph")}
                      onChange={(e) => setOptions((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setOptions((p) => p.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={o.values.join(" | ")}
                    placeholder={t("wizard.option_values_ph")}
                    onChange={(e) => setOptions((p) => p.map((x, j) => j === i ? { ...x, values: e.target.value.split("|").map((v) => v.trimStart()) } : x))}
                  />
                  <div className="flex flex-wrap gap-1">
                    {o.values.filter((v) => v.trim()).map((v, k) => <Badge key={k} variant="secondary">{v.trim()}</Badge>)}
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setOptions((p) => [...p, { name: "", values: [] }])}>
                <Plus className="mr-2 h-4 w-4" />{t("wizard.add_option")}
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 rounded-lg border p-3">
                {images[0]
                  ? <img src={images[0]} alt="" className="h-16 w-16 rounded-md object-cover" />
                  : <div className="grid h-16 w-16 place-items-center rounded-md bg-muted"><Package className="h-6 w-6 text-muted-foreground" /></div>}
                <div className="min-w-0">
                  <p className="truncate font-semibold">{name}</p>
                  <p className="text-muted-foreground">{parseFloat(price || "0").toLocaleString()} {currency} · {inventory || 0} {t("wizard.in_stock")}</p>
                  {description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>}
                </div>
              </div>
              {cleanSpecs.length > 0 && (
                <div className="rounded-lg border p-3">
                  <p className="mb-1.5 font-medium">{t("wizard.step_specs")} ({cleanSpecs.length})</p>
                  {cleanSpecs.map((s, i) => <p key={i} className="text-muted-foreground">{s.key}: <span className="text-foreground">{s.value}</span></p>)}
                </div>
              )}
              {cleanOptions.length > 0 && (
                <div className="rounded-lg border p-3">
                  <p className="mb-1.5 font-medium">{t("wizard.step_options")}</p>
                  {cleanOptions.map((o, i) => (
                    <div key={i} className="mb-1 flex flex-wrap items-center gap-1">
                      <span className="text-muted-foreground">{o.name}:</span>
                      {o.values.map((v, k) => <Badge key={k} variant="secondary">{v}</Badge>)}
                    </div>
                  ))}
                </div>
              )}
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("wizard.review_hint")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={saving} className="mr-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />{t("wizard.back")}
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !step1Valid}>
              {t("wizard.next")}<ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={create} disabled={saving}>
              {saving ? <Spinner className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {t("wizard.create")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
