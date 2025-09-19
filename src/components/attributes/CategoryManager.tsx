import { useState, useEffect, useCallback, Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, PlusCircle, Link as LinkIcon, Trash2, Save, CornerDownRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AnimatePresence, motion } from 'framer-motion';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  parent_id: z.string().nullable(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export const CategoryManager = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [linkedAttributes, setLinkedAttributes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { isSubmitting, errors } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { data: categoriesData, error: catError } = await supabase.from('categories').select('*').order('name');
    const { data: attributesData, error: attrError } = await supabase.from('attributes').select('*').order('name');
    if (catError || attrError) showError('Failed to fetch data.');
    else { setCategories(categoriesData); setAttributes(attributesData); }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const fetchLinks = async () => {
      if (selectedCategory) {
        const { data } = await supabase.from('category_attributes').select('attribute_id').eq('category_id', selectedCategory.id);
        setLinkedAttributes(data?.map(d => d.attribute_id) || []);
      } else {
        setLinkedAttributes([]);
      }
    };
    fetchLinks();
  }, [selectedCategory]);

  const handleSelectCategory = (category: any) => {
    setSelectedCategory(category);
    reset({ name: category.name, parent_id: category.parent_id });
  };

  const handleCreateNew = () => {
    setSelectedCategory(null);
    reset({ name: '', parent_id: null });
  };

  const onSubmit = async (data: CategoryFormData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showError("You must be logged in."); return; }

    const payload = { ...data, user_id: user.id };

    if (selectedCategory) { // Update
      const { error } = await supabase.from('categories').update(payload).eq('id', selectedCategory.id);
      if (error) showError(error.message);
      else { showSuccess('Category updated!'); await fetchData(); }
    } else { // Create
      const { error } = await supabase.from('categories').insert(payload);
      if (error) showError(error.message);
      else { showSuccess('Category created!'); handleCreateNew(); await fetchData(); }
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    const { error } = await supabase.from('categories').delete().eq('id', selectedCategory.id);
    if (error) showError(error.message);
    else { showSuccess('Category deleted.'); handleCreateNew(); await fetchData(); }
    setIsDeleting(false);
  };

  const handleLinkChange = async (attributeId: string, checked: boolean) => {
    if (!selectedCategory) return;
    if (checked) {
      const { error } = await supabase.from('category_attributes').insert({ category_id: selectedCategory.id, attribute_id: attributeId });
      if (error) showError(error.message); else setLinkedAttributes(prev => [...prev, attributeId]);
    } else {
      const { error } = await supabase.from('category_attributes').delete().match({ category_id: selectedCategory.id, attribute_id: attributeId });
      if (error) showError(error.message); else setLinkedAttributes(prev => prev.filter(id => id !== attributeId));
    }
  };

  const renderCategories = (parentId: string | null = null, depth = 0) => {
    const children = categories.filter(c => c.parent_id === parentId);
    return children.map(category => (
      <Fragment key={category.id}>
        <Button
          variant={selectedCategory?.id === category.id ? 'secondary' : 'ghost'}
          onClick={() => handleSelectCategory(category)}
          className="w-full justify-start"
          style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
        >
          {depth > 0 && <CornerDownRight className="mr-2 h-4 w-4 text-muted-foreground" />}
          {category.name}
        </Button>
        {renderCategories(category.id, depth + 1)}
      </Fragment>
    ));
  };

  return (
    <>
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete "{selectedCategory?.name}"?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. Any subcategories will have their parent removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Categories</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleCreateNew}><PlusCircle className="mr-2 h-4 w-4" />New</Button>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="flex justify-center"><Loader2 className="animate-spin" /></div> : (
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-1 pr-4">{renderCategories()}</div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div key={selectedCategory?.id || 'new'} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <form onSubmit={handleSubmit(onSubmit)}>
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedCategory ? `Editing "${selectedCategory.name}"` : 'Create New Category'}</CardTitle>
                    <CardDescription>{selectedCategory ? 'Modify the details of this category.' : 'Create a new category for your products.'}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input placeholder="Category Name" {...register('name')} />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    <Controller name="parent_id" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <SelectTrigger><SelectValue placeholder="Select Parent (Optional)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No Parent</SelectItem>
                          {categories.filter(c => c.id !== selectedCategory?.id).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )} />
                  </CardContent>
                  <CardHeader>
                    <CardTitle className="flex items-center"><LinkIcon className="mr-2 h-4 w-4" />Linked Attributes</CardTitle>
                    <CardDescription>Select which attributes apply to products in this category.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedCategory ? (
                      <ScrollArea className="h-64 border rounded-md p-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {attributes.map(attr => (
                            <div key={attr.id} className="flex items-center space-x-2">
                              <Checkbox id={`attr-${attr.id}`} checked={linkedAttributes.includes(attr.id)} onCheckedChange={(checked) => handleLinkChange(attr.id, !!checked)} />
                              <Label htmlFor={`attr-${attr.id}`}>{attr.name}</Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : <p className="text-sm text-muted-foreground text-center py-4">Save a category to link attributes.</p>}
                  </CardContent>
                  <CardContent className="flex justify-between items-center border-t pt-6">
                    <div>{selectedCategory && <Button type="button" variant="destructive" onClick={() => setIsDeleting(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>}</div>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{selectedCategory ? 'Save Changes' : 'Create Category'}</Button>
                  </CardContent>
                </Card>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};