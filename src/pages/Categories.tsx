import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { readCache, writeCache } from "@/lib/pageCache";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlusCircle, Search, Layers, Wrench, Palette, Lock } from "lucide-react";
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

const Categories = () => {
  const { setTitle } = usePageTitle();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"all" | "custom" | "system">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<CategoryTemplate[]>(() => readCache<CategoryTemplate[]>("categories") ?? []);
  const [loading, setLoading] = useState(() => !readCache<CategoryTemplate[]>("categories"));

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
  const handleCategorySave = async (name: string) => {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showError("Not logged in."); return; }
    const { error } = await supabase.from("category_templates").insert({
      category_name: template.category_name,
      type_name: `${template.type_name} (Custom)`,
      default_specifications: template.default_specifications,
      default_options: template.default_options,
      is_system: false,
      user_id: user.id,
    });
    if (error) showError(`Failed to duplicate: ${error.message}`);
    else { showSuccess(`Duplicated "${template.type_name}".`); fetchTemplates(); }
  };

  const categoryNames = Object.keys(grouped).sort();

  const renderList = () => {
    if (loading) return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
      </div>
    );
    if (categoryNames.length === 0) return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <Layers className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
        <h3 className="text-sm font-semibold text-muted-foreground">
          {searchQuery ? t("categories.no_results") : activeTab === "custom" ? t("categories.no_custom") : t("categories.no_categories")}
        </h3>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-sm mx-auto">
          {searchQuery ? t("categories.try_different") : activeTab === "custom" ? t("categories.duplicate_hint") : t("categories.add_hint")}
        </p>
      </div>
    );
    return (
      <div className="space-y-2" data-tour="categories-grid">
        {categoryNames.map(name => (
          <CategoryCard
            key={name}
            categoryName={name}
            templates={grouped[name]}
            onEditType={handleEditType}
            onDeleteType={(t) => { if (t.is_system) { showError("System templates can't be deleted. Duplicate first."); return; } setDeleteConfirm(t); }}
            onAddType={handleAddType}
            onDuplicate={handleDuplicate}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <CategoryEditorModal open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} categoryName={editingCategory} onSave={handleCategorySave} />
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
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border text-sm">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{stats.categories}</span>
            <span className="text-muted-foreground">{t("categories.categories_label")}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border text-sm">
            <span className="font-medium">{stats.types}</span>
            <span className="text-muted-foreground">{t("categories.types_label")}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border text-sm">
            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{stats.totalSpecs}</span>
            <span className="text-muted-foreground">{t("categories.specs")}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border text-sm">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{stats.totalOptions}</span>
            <span className="text-muted-foreground">{t("categories.options_label")}</span>
          </div>
          <div className="ml-auto">
            <Button onClick={handleAddCategory} size="sm" data-tour="categories-add">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              {t("categories.add_category")}
            </Button>
          </div>
        </div>

        {/* Tabs + search */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <div className="flex items-center gap-3">
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
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("categories.search_placeholder")} className="pl-9" />
            </div>
          </div>

          <TabsContent value="all" className="mt-3">{renderList()}</TabsContent>
          <TabsContent value="system" className="mt-3">{renderList()}</TabsContent>
          <TabsContent value="custom" className="mt-3">{renderList()}</TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Categories;
