import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlusCircle, Search } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { CategoryCard } from "@/components/categories/CategoryCard";
import { CategoryEditorModal } from "@/components/categories/CategoryEditorModal";
import { TypeEditorModal } from "@/components/categories/TypeEditorModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
  const [activeTab, setActiveTab] = useState<"all" | "custom">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<CategoryTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [typeModalCategory, setTypeModalCategory] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);

  useEffect(() => {
    setTitle("Categories & Types");
  }, [setTitle]);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("category_templates")
      .select("*")
      .order("category_name")
      .order("type_name");

    if (error) {
      showError("Could not fetch category templates.");
    } else {
      setTemplates((data as CategoryTemplate[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Group templates by category_name
  const grouped = useMemo(() => {
    let filtered = templates;

    if (activeTab === "custom") {
      filtered = filtered.filter((t) => !t.is_system);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.category_name.toLowerCase().includes(q) ||
          t.type_name.toLowerCase().includes(q)
      );
    }

    const groups: Record<string, CategoryTemplate[]> = {};
    for (const t of filtered) {
      if (!groups[t.category_name]) {
        groups[t.category_name] = [];
      }
      groups[t.category_name].push(t);
    }
    return groups;
  }, [templates, activeTab, searchQuery]);

  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryModalOpen(true);
  };

  const handleCategorySave = async (name: string) => {
    // Creating a category means creating a placeholder type entry
    // or we just open the type modal for the new category
    setCategoryModalOpen(false);
    setTypeModalCategory(name);
    setEditingTemplate(null);
    setTypeModalOpen(true);
  };

  const handleAddType = (categoryName: string) => {
    setTypeModalCategory(categoryName);
    setEditingTemplate(null);
    setTypeModalOpen(true);
  };

  const handleEditType = (template: any) => {
    if (template.is_system) return;
    setTypeModalCategory(template.category_name);
    setEditingTemplate(template);
    setTypeModalOpen(true);
  };

  const handleDeleteType = async () => {
    if (!deleteConfirm) return;
    const { error } = await supabase
      .from("category_templates")
      .delete()
      .eq("id", deleteConfirm.id);
    if (error) {
      showError(`Failed to delete type: ${error.message}`);
    } else {
      showSuccess(`Type "${deleteConfirm.type_name}" deleted.`);
      fetchTemplates();
    }
    setDeleteConfirm(null);
  };

  const handleDuplicate = async (template: any) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      showError("You must be logged in.");
      return;
    }

    const { error } = await supabase.from("category_templates").insert({
      category_name: template.category_name,
      type_name: `${template.type_name} (Custom)`,
      default_specifications: template.default_specifications,
      default_options: template.default_options,
      is_system: false,
      user_id: user.id,
    });

    if (error) {
      showError(`Failed to duplicate: ${error.message}`);
    } else {
      showSuccess(`Duplicated "${template.type_name}" as custom template.`);
      fetchTemplates();
    }
  };

  const categoryNames = Object.keys(grouped).sort();

  return (
    <>
      <CategoryEditorModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categoryName={editingCategory}
        onSave={handleCategorySave}
      />

      <TypeEditorModal
        open={typeModalOpen}
        onClose={() => setTypeModalOpen(false)}
        categoryName={typeModalCategory}
        template={editingTemplate}
        onSave={() => {
          fetchTemplates();
          setTypeModalOpen(false);
        }}
      />

      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteConfirm?.type_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this type template. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteType}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Categories & Types</h1>
            <p className="text-muted-foreground">
              Manage category templates that define default specifications and options
              for your products.
            </p>
          </div>
          <Button onClick={handleAddCategory}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "all" | "custom")}
        >
          <div className="flex items-center gap-4">
            <TabsList>
              <TabsTrigger value="all">All Templates</TabsTrigger>
              <TabsTrigger value="custom">My Custom</TabsTrigger>
            </TabsList>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories or types..."
                className="pl-9"
              />
            </div>
          </div>

          <TabsContent value="all" className="mt-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : categoryNames.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                <h3 className="text-lg font-semibold">No Categories Found</h3>
                <p className="text-sm mt-1">
                  {searchQuery
                    ? "Try adjusting your search."
                    : "Get started by adding a category."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {categoryNames.map((name) => (
                  <CategoryCard
                    key={name}
                    categoryName={name}
                    templates={grouped[name]}
                    onEditType={handleEditType}
                    onDeleteType={(t) => {
                      if (t.is_system) {
                        showError("System templates cannot be deleted. Duplicate it as custom first.");
                        return;
                      }
                      setDeleteConfirm(t);
                    }}
                    onAddType={handleAddType}
                    onDuplicate={handleDuplicate}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : categoryNames.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                <h3 className="text-lg font-semibold">No Custom Templates</h3>
                <p className="text-sm mt-1">
                  {searchQuery
                    ? "Try adjusting your search."
                    : "Duplicate a system template or create a new category to get started."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {categoryNames.map((name) => (
                  <CategoryCard
                    key={name}
                    categoryName={name}
                    templates={grouped[name]}
                    onEditType={handleEditType}
                    onDeleteType={(t) => {
                      if (t.is_system) {
                        showError("System templates cannot be deleted. Duplicate it as custom first.");
                        return;
                      }
                      setDeleteConfirm(t);
                    }}
                    onAddType={handleAddType}
                    onDuplicate={handleDuplicate}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Categories;
