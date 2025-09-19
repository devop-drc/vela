import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, PlusCircle, Link as LinkIcon } from 'lucide-react';

export const CategoryManager = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [linkedAttributes, setLinkedAttributes] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { data: categoriesData, error: catError } = await supabase.from('categories').select('*');
    const { data: attributesData, error: attrError } = await supabase.from('attributes').select('*');
    if (catError || attrError) {
      showError('Failed to fetch data.');
    } else {
      setCategories(categoriesData);
      setAttributes(attributesData);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchLinks = async () => {
      if (selectedCategory) {
        const { data } = await supabase.from('category_attributes').select('attribute_id').eq('category_id', selectedCategory.id);
        setLinkedAttributes(data?.map(d => d.attribute_id) || []);
      }
    };
    fetchLinks();
  }, [selectedCategory]);

  const handleCreateCategory = async () => {
    if (!newCategoryName) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('categories').insert({ name: newCategoryName, parent_id: newCategoryParent || null, user_id: user?.id });
    if (error) {
      showError(error.message);
    } else {
      showSuccess('Category created!');
      setNewCategoryName('');
      setNewCategoryParent(undefined);
      fetchData();
    }
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-4">
        <Card>
          <CardHeader><CardTitle>Create Category</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Category Name" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
            <Select value={newCategoryParent} onValueChange={setNewCategoryParent}>
              <SelectTrigger><SelectValue placeholder="Select Parent (Optional)" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={handleCreateCategory} className="w-full"><PlusCircle className="mr-2 h-4 w-4" />Create</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Your Categories</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="animate-spin" /> : (
              <div className="space-y-2">
                {categories.map(c => (
                  <Button key={c.id} variant={selectedCategory?.id === c.id ? 'secondary' : 'ghost'} onClick={() => setSelectedCategory(c)} className="w-full justify-start">
                    {c.name}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Link Attributes to Category</CardTitle>
            <CardDescription>{selectedCategory ? `Editing attributes for "${selectedCategory.name}"` : "Select a category to begin"}</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedCategory ? (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center"><LinkIcon className="mr-2 h-4 w-4" />Available Attributes</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {attributes.map(attr => (
                    <div key={attr.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`attr-${attr.id}`}
                        checked={linkedAttributes.includes(attr.id)}
                        onCheckedChange={(checked) => handleLinkChange(attr.id, !!checked)}
                      />
                      <Label htmlFor={`attr-${attr.id}`}>{attr.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-muted-foreground">Select a category from the left to assign attributes to it.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};