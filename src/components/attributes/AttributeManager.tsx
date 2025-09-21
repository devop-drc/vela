import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, PlusCircle, Tag, Trash2, Save, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AnimatePresence, motion } from 'framer-motion';
import { ScrollArea } from '../ui/scroll-area';

const attributeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  input_type: z.string().min(1, "Input type is required"),
  value_type: z.string().min(1, "Value type is required"),
  unit: z.string().optional(),
});

type AttributeFormData = z.infer<typeof attributeSchema>;

const inputTypes = ['text', 'textarea', 'number', 'dropdown', 'tags', 'color'];
const valueTypes = ['string', 'integer', 'decimal', 'jsonb'];

export const AttributeManager = () => {
  const [attributes, setAttributes] = useState<any[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState<any | null>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [newOptionValue, setNewOptionValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { isSubmitting, errors } } = useForm<AttributeFormData>({
    resolver: zodResolver(attributeSchema),
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('attributes').select('*').order('name');
    if (error) showError('Failed to fetch attributes.');
    else setAttributes(data);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const fetchOptions = async () => {
      if (selectedAttribute?.input_type === 'dropdown') {
        const { data } = await supabase.from('attribute_options').select('*').eq('attribute_id', selectedAttribute.id).order('value');
        setOptions(data || []);
      } else {
        setOptions([]);
      }
    };
    fetchOptions();
  }, [selectedAttribute]);

  const handleSelectAttribute = (attribute: any) => {
    setSelectedAttribute(attribute);
    reset(attribute);
  };

  const handleCreateNew = () => {
    setSelectedAttribute(null);
    reset({ name: '', input_type: '', value_type: '', unit: '' });
  };

  const onSubmit = async (data: AttributeFormData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showError("You must be logged in."); return; }

    const payload = { ...data, user_id: user.id };

    if (selectedAttribute) { // Update
      const { error } = await supabase.from('attributes').update(payload).eq('id', selectedAttribute.id);
      if (error) showError(error.message);
      else { showSuccess('Attribute updated!'); fetchData(); }
    } else { // Create
      const { error } = await supabase.from('attributes').insert(payload);
      if (error) showError(error.message);
      else { showSuccess('Attribute created!'); handleCreateNew(); await fetchData(); }
    }
  };

  const handleDelete = async () => {
    if (!selectedAttribute) return;
    const { error } = await supabase.from('attributes').delete().eq('id', selectedAttribute.id);
    if (error) showError(error.message);
    else { showSuccess('Attribute deleted.'); handleCreateNew(); await fetchData(); }
    setIsDeleting(false);
  };

  const handleCreateOption = async () => {
    if (!newOptionValue || !selectedAttribute) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error, data } = await supabase.from('attribute_options').insert({ attribute_id: selectedAttribute.id, value: newOptionValue, user_id: user?.id }).select().single();
    if (error) showError(error.message);
    else { showSuccess('Option added!'); setNewOptionValue(''); setOptions(prev => [...prev, data]); }
  };

  const handleDeleteOption = async (optionId: string) => {
    const { error } = await supabase.from('attribute_options').delete().eq('id', optionId);
    if (error) showError(error.message);
    else { showSuccess('Option removed.'); setOptions(prev => prev.filter(o => o.id !== optionId)); }
  };

  return (
    <>
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete "{selectedAttribute?.name}"?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This attribute will be removed from all categories and products.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Attributes</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleCreateNew}><PlusCircle className="mr-2 h-4 w-4" />New</Button>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="flex justify-center"><Loader2 className="animate-spin" /></div> : (
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-1 pr-4">
                    {attributes.map(a => (
                      <Button key={a.id} variant={selectedAttribute?.id === a.id ? 'secondary' : 'ghost'} onClick={() => handleSelectAttribute(a)} className="w-full justify-start">
                        {a.name}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div key={selectedAttribute?.id || 'new'} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <form onSubmit={handleSubmit(onSubmit)}>
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedAttribute ? `Editing "${selectedAttribute.name}"` : 'Create New Attribute'}</CardTitle>
                    <CardDescription>{selectedAttribute ? 'Modify the details of this attribute.' : 'Define a new attribute for your products.'}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input placeholder="Attribute Name (e.g., Size)" {...register('name')} />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Controller name="input_type" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Input Type" /></SelectTrigger><SelectContent>{inputTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>)} />
                      <Controller name="value_type" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Value Type" /></SelectTrigger><SelectContent>{valueTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>)} />
                    </div>
                    <Input placeholder="Unit (Optional, e.g., GB, in)" {...register('unit')} />
                  </CardContent>
                  <CardHeader>
                    <CardTitle>Options</CardTitle>
                    <CardDescription>Add predefined choices for this attribute if its input type is 'dropdown'.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedAttribute?.input_type === 'dropdown' ? (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Input placeholder="New option value" value={newOptionValue} onChange={e => setNewOptionValue(e.target.value)} />
                          <Button type="button" onClick={handleCreateOption}>Add</Button>
                        </div>
                        <div className="space-y-2 pt-2">
                          {options.map(opt => (
                            <div key={opt.id} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                              <span>{opt.value}</span>
                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteOption(opt.id)}><X className="h-4 w-4" /></Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : <p className="text-sm text-muted-foreground text-center py-4">Select 'dropdown' as the input type to add options.</p>}
                  </CardContent>
                  <CardContent className="flex justify-between items-center border-t pt-6">
                    <div>{selectedAttribute && <Button type="button" variant="destructive" onClick={() => setIsDeleting(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>}</div>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{selectedAttribute ? 'Save Changes' : 'Create Attribute'}</Button>
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