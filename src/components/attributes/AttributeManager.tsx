import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, PlusCircle, Tag } from 'lucide-react';

const inputTypes = ['text', 'textarea', 'number', 'dropdown', 'tags', 'color'];
const valueTypes = ['string', 'integer', 'decimal', 'jsonb'];

export const AttributeManager = () => {
  const [attributes, setAttributes] = useState<any[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState<any | null>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [newOptionValue, setNewOptionValue] = useState('');
  const [newAttribute, setNewAttribute] = useState({ name: '', input_type: '', value_type: '', unit: '' });
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('attributes').select('*');
    if (error) showError('Failed to fetch attributes.');
    else setAttributes(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchOptions = async () => {
      if (selectedAttribute && selectedAttribute.input_type === 'dropdown') {
        const { data } = await supabase.from('attribute_options').select('*').eq('attribute_id', selectedAttribute.id);
        setOptions(data || []);
      } else {
        setOptions([]);
      }
    };
    fetchOptions();
  }, [selectedAttribute]);

  const handleCreateAttribute = async () => {
    if (!newAttribute.name || !newAttribute.input_type || !newAttribute.value_type) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('attributes').insert({ ...newAttribute, user_id: user?.id });
    if (error) showError(error.message);
    else {
      showSuccess('Attribute created!');
      setNewAttribute({ name: '', input_type: '', value_type: '', unit: '' });
      fetchData();
    }
  };

  const handleCreateOption = async () => {
    if (!newOptionValue || !selectedAttribute) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('attribute_options').insert({ attribute_id: selectedAttribute.id, value: newOptionValue, user_id: user?.id });
    if (error) showError(error.message);
    else {
      showSuccess('Option added!');
      setNewOptionValue('');
      setOptions(prev => [...prev, { value: newOptionValue }]);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-4">
        <Card>
          <CardHeader><CardTitle>Create Attribute</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Attribute Name (e.g., Size)" value={newAttribute.name} onChange={e => setNewAttribute(p => ({ ...p, name: e.target.value }))} />
            <Select value={newAttribute.input_type} onValueChange={v => setNewAttribute(p => ({ ...p, input_type: v }))}><SelectTrigger><SelectValue placeholder="Input Type" /></SelectTrigger><SelectContent>{inputTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            <Select value={newAttribute.value_type} onValueChange={v => setNewAttribute(p => ({ ...p, value_type: v }))}><SelectTrigger><SelectValue placeholder="Value Type" /></SelectTrigger><SelectContent>{valueTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            <Input placeholder="Unit (Optional, e.g., GB, in)" value={newAttribute.unit} onChange={e => setNewAttribute(p => ({ ...p, unit: e.target.value }))} />
            <Button onClick={handleCreateAttribute} className="w-full"><PlusCircle className="mr-2 h-4 w-4" />Create</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Your Attributes</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="animate-spin" /> : (
              <div className="space-y-2">
                {attributes.map(a => (
                  <Button key={a.id} variant={selectedAttribute?.id === a.id ? 'secondary' : 'ghost'} onClick={() => setSelectedAttribute(a)} className="w-full justify-start">
                    {a.name}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="md:col-span-2">
        <Card>
          <CardHeader><CardTitle>Attribute Options</CardTitle></CardHeader>
          <CardContent>
            {selectedAttribute?.input_type === 'dropdown' ? (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center"><Tag className="mr-2 h-4 w-4" />Options for "{selectedAttribute.name}"</h3>
                <div className="flex gap-2">
                  <Input placeholder="New option value" value={newOptionValue} onChange={e => setNewOptionValue(e.target.value)} />
                  <Button onClick={handleCreateOption}>Add</Button>
                </div>
                <div className="space-y-2 pt-2">
                  {options.map((opt, i) => <div key={i} className="p-2 border rounded-md bg-muted/50">{opt.value}</div>)}
                </div>
              </div>
            ) : <p className="text-muted-foreground">Select a 'dropdown' attribute to add options.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};