import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { readCache, writeCache } from "@/lib/pageCache";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SearchInput, CommandBar, EmptyState } from "@/components/ui-app";
import { useReveal, useCountUp } from "@/lib/anim";
import {
  PlusCircle, Search, Layers, Boxes, Wrench, Palette, Lock,
  ChevronsUpDown, ChevronsDownUp,
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { CategoryCard } from "@/components/categories/CategoryCard";
import { CategoryEditorModal } from "@/components/categories/CategoryEditorModal";
import { TypeEditorModal } from "@/components/categories/TypeEditorModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CategoryTemplate {
  id: string;
  category_name: string;
  type_name: string;
  default_specifications: any[];
  default_options: any[];
  is_system: boolean;
  user_id: string | null;
  created_at: string;
}

/** Small animated (count-up) number for the stat pills. Reduced-motion safe. */
const StatCount = ({ value }: { value: number }) => {
  const ref = useCountUp<HTMLSpanElement>(value);
  return <span ref={ref}>{value.toLocaleString()}</span>;
};

const Categories = () => {
  const { setTitle } = usePageTitle();
  const { t } = useTranslation();
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "custom" | "system">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<CategoryTemplate[]>(() => readCache<CategoryTemplate[]>("categories") ?? []);
  const [loading, setLoading] = useState(() => !readCache<CategoryTemplate[]>("categories"));
  // null = per-card control; true/false = expand/collapse all.
  const [expandAll, setExpandAll] = useState<boolean | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [typeModalCategory, setTypeModalCategory] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);

  useEffect(() => { setTitle(t("categories.title")); }, [setTitle, t]);

  const fetchTemplates = async () => {
    if (!readCache("categories")) setLoading(true); // spinner only when nothing cached
    const { data, error } = await supabase
      .from("category_templates")
      .select("*")
      .order("category_name")
      .order("type_name");
    if (error) showError("Could not fetch category templates.");
    else {
      const rows = (data as CategoryTemplate[]) ?? [];
      setTemplates(rows);
      writeCache("categories", rows);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  // Stats
  const stats = useMemo(() => {
    const categories = new Set(templates.map(t => t.category_name));
    const systemCount = templates.filter(t => t.is_system).length;
    const customCount = templates.filter(t => !t.is_system).length;
    const totalSpecs = templates.reduce((sum, t) => sum + (t.default_specifications?.length || 0), 0);
    const totalOptions = templates.reduce((sum, t) => sum + (t.default_options?.length || 0), 0);
    return { categories: categories.size, types: templates.length, systemCount, customCount, totalSpecs, totalOptions };
  }, [templates]);

  // Grouped & filtered
  const grouped = useMemo(() => {
    let filtered = templates;
    if (activeTab === "custom") filtered = filtered.filter(t => !t.is_system);
    if (activeTab === "system") filtered = filtered.filter(t => t.is_system);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.category_name.toLowerCase().includes(q) ||
        t.type_name.toLowerCase().includes(q) ||
        t.default_specifications?.some((s: any) => (s.label || s.key || '').toLowerCase().includes(q)) ||
        t.default_options?.some((o: any) => (o.name || '').toLowerCase().includes(q))
      );
    }
    const groups: Record<string, CategoryTemplate[]> = {};
    for (const t of filtered) {
      if (!groups[t.category_name]) groups[t.category_name] = [];
      groups[t.category_name].push(t);
    }
    return groups;
  }, [templates, activeTab, searchQuery]);

  const handleAddCategory = () => { setEditingCategory(null); setCategoryModalOpen(true); };
  const handleRenameCategory = (name: string) => { setEditingCategory(name); setCategoryModalOpen(true); };
  const handleCategorySave = async (name: string) => {
    // Rename flow: update every (custom) template in the old category. Only
    // offered for all-custom categories, so no system rows are touched.
    if (editingCategory) {
      if (name !== editingCategory) {
        const { error } = await supabase
          .from("category_templates")
          .update({ category_name: name })
          .eq("category_name", editingCategory)
          .eq("is_system", false);
        if (error) { showError(t("categories.rename_category_failed", { message: error.message })); return; }
        showSuccess(t("categories.category_renamed", { name }));
        fetchTemplates();
      }
      setCategoryModalOpen(false);
      setEditingCategory(null);
      return;
    }
    // New category → straight into the add-type flow.
    setCategoryModalOpen(false);
    setTypeModalCategory(name);
    setEditingTemplate(null);
    setTypeModalOpen(true);
  };
  const handleAddType = (categoryName: string) => { setTypeModalCategory(categoryName); setEditingTemplate(null); setTypeModalOpen(true); };
  const handleEditType = (template: any) => { if (template.is_system) return; setTypeModalCategory(template.category_name); setEditingTemplate(template); setTypeModalOpen(true); };
  const handleDeleteType = async () => {
    if (!deleteConfirm) return;
    const { error } = await supabase.from("category_templates").delete().eq("id", deleteConfirm.id);
    if (error) showError(`Failed to delete: ${error.message}`);
    else { showSuccess(`Deleted "${deleteConfirm.type_name}".`); fetchTemplates(); }
    setDeleteConfirm(null);
  };
  const handleDuplicate = async (template: any) => {
    if (!userId) { showError(t("categories.must_login")); return; }
    const { error } = await supabase.from("category_templates").insert({
      category_name: template.category_name,
      type_name: `${template.type_name} (Custom)`,
      default_specifications: template.default_specifications,
      default_options: template.default_options,
      is_system: false,
      user_id: userId,
    });
    if (error) showError(`Failed to duplicate: ${error.message}`);
    else { showSuccess(`Duplicated "${template.type_name}".`); fetchTemplates(); }
  };

  const categoryNames = Object.keys(grouped).sort();

  // Subtle staggered entrance; re-runs on tab switch (not on every keystroke).
  const listRef = useReveal<HTMLDivElement>({}, [activeTab, loading]);

  const searching = searchQuery.trim().length > 0;
  const isAllExpanded = expandAll === true;
  // Auto-expand while searching so matches buried in a collapsed group show.
  const cardOpen = searching ? true : (expandAll === null ? undefined : expandAll);

  const renderList = () => {
    if (loading) return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="ml-auto h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
    if (categoryNames.length === 0) return (
      <EmptyState
        icon={searching ? Search : Layers}
        title={searching ? t("categories.no_results") : activeTab === "custom" ? t("categories.no_custom") : t("categories.no_categories")}
        description={searching ? t("categories.try_different") : activeTab === "custom" ? t("categories.duplicate_hint") : t("categories.add_hint")}
        action={
          searching ? (
            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>{t("common.clear")}</Button>
          ) : activeTab === "custom" ? (
            <Button variant="outline" size="sm" onClick={() => setActiveTab("system")}>{t("categories.browse_system")}</Button>
          ) : (
            <Button size="sm" onClick={handleAddCategory}>
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              {t("categories.add_category")}
            </Button>
          )
        }
      />
    );
    return (
      <div ref={listRef} className="space-y-2" data-tour="categories-grid">
        {categoryNames.map(name => (
          <div key={name} data-reveal>
            <CategoryCard
              categoryName={name}
              templates={grouped[name]}
              onEditType={handleEditType}
              onDeleteType={(t) => { if (t.is_system) { showError("System templates can't be deleted. Duplicate first."); return; } setDeleteConfirm(t); }}
              onAddType={handleAddType}
              onDuplicate={handleDuplicate}
              onRenameCategory={handleRenameCategory}
              open={cardOpen}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <CategoryEditorModal open={categoryModalOpen} onClose={() => { setCategoryModalOpen(false); setEditingCategory(null); }} categoryName={editingCategory} onSave={handleCategorySave} />
      <TypeEditorModal open={typeModalOpen} onClose={() => setTypeModalOpen(false)} categoryName={typeModalCategory} template={editingTemplate} onSave={() => { fetchTemplates(); setTypeModalOpen(false); }} />
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("categories.delete_type", { name: deleteConfirm?.type_name })}</AlertDialogTitle>
            <AlertDialogDescription>{t("categories.delete_type_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteType} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-4">
        {/* Stats bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm shadow-sm">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium tabular-nums"><StatCount value={stats.categories} /></span>
            <span className="text-muted-foreground">{t("categories.categories_label")}</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm shadow-sm">
            <Boxes className="h-3.5 w-3.5 text-info" />
            <span className="font-medium tabular-nums"><StatCount value={stats.types} /></span>
            <span className="text-muted-foreground">{t("categories.types_label")}</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm shadow-sm">
            <Wrench className="h-3.5 w-3.5 text-warning" />
            <span className="font-medium tabular-nums"><StatCount value={stats.totalSpecs} /></span>
            <span className="text-muted-foreground">{t("categories.specs")}</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm shadow-sm">
            <Palette className="h-3.5 w-3.5 text-success" />
            <span className="font-medium tabular-nums"><StatCount value={stats.totalOptions} /></span>
            <span className="text-muted-foreground">{t("categories.options_label")}</span>
          </div>
        </div>

        {/* Command bar: search + actions (main), tabs (secondary) */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <CommandBar
            secondary={
              <TabsList>
                <TabsTrigger value="all" className="text-sm">
                  {t("common.all")} <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">{templates.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="system" className="text-sm">
                  <Lock className="h-3 w-3 mr-1" />{t("categories.system")} <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">{stats.systemCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="custom" className="text-sm">
                  {t("categories.custom")} <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">{stats.customCount}</Badge>
                </TabsTrigger>
              </TabsList>
            }
          >
            <SearchInput
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder={t("categories.search_placeholder")}
              containerClassName="w-full sm:w-auto sm:min-w-[220px] flex-1 sm:max-w-sm"
            />
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setExpandAll(v => (v === true ? false : true))}>
                {isAllExpanded ? <ChevronsDownUp className="mr-1.5 h-3.5 w-3.5" /> : <ChevronsUpDown className="mr-1.5 h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{isAllExpanded ? t("categories.collapse_all") : t("categories.expand_all")}</span>
              </Button>
              <Button onClick={handleAddCategory} size="sm" data-tour="categories-add">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                {t("categories.add_category")}
              </Button>
            </div>
          </CommandBar>

          <TabsContent value="all" className="mt-4">{renderList()}</TabsContent>
          <TabsContent value="system" className="mt-4">{renderList()}</TabsContent>
          <TabsContent value="custom" className="mt-4">{renderList()}</TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Categories;
