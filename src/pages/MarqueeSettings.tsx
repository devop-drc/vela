import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Edit, Trash2, Sparkles, MessageSquareText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from "@/utils/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MarqueeEditorModal } from "@/components/MarqueeEditorModal";
import * as LucideIcons from 'lucide-react'; // Import all Lucide icons

export interface MarqueeElement {
  id: string;
  message: string;
  icon_name: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const MarqueeSettings = () => {
  const { setTitle } = usePageTitle();
  const [marqueeElements, setMarqueeElements] = useState<MarqueeElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState<MarqueeElement | null>(null);

  useEffect(() => {
    setTitle("Marquee Settings");
  }, [setTitle]);

  const fetchMarqueeElements = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("marquee_elements").select("*").order("display_order", { ascending: true });
    if (error) {
      showError("Could not fetch marquee elements.");
    } else {
      setMarqueeElements(data as MarqueeElement[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMarqueeElements();
  }, []);

  const handleSave = () => {
    fetchMarqueeElements();
    setIsEditorOpen(false);
    setSelectedElement(null);
  };

  const handleEdit = (element: MarqueeElement) => {
    setSelectedElement(element);
    setIsEditorOpen(true);
  };

  const handleDelete = async (elementId: string) => {
    if (!window.confirm("Are you sure you want to delete this marquee element?")) return;
    const { error } = await supabase.from("marquee_elements").delete().eq("id", elementId);
    if (error) {
      showError(`Failed to delete element: ${error.message}`);
    } else {
      showSuccess("Marquee element deleted.");
      fetchMarqueeElements();
    }
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />;
  };

  return (
    <>
      <MarqueeEditorModal
        isOpen={isEditorOpen}
        onClose={() => { setIsEditorOpen(false); setSelectedElement(null); }}
        onSave={handleSave}
        element={selectedElement}
      />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Marquee Settings</h1>
            <p className="text-muted-foreground">
              Manage the scrolling text messages displayed on your storefront.
            </p>
          </div>
          <Button onClick={() => setIsEditorOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Marquee Element
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Your Marquee Elements</CardTitle>
            <CardDescription>
              These messages will appear in a scrolling banner on your storefront homepage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Order</TableHead>
                    <TableHead className="w-[50px]">Icon</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marqueeElements.length > 0 ? (
                    marqueeElements.map((element) => (
                      <TableRow key={element.id}>
                        <TableCell>{element.display_order}</TableCell>
                        <TableCell>{getIconComponent(element.icon_name)}</TableCell>
                        <TableCell className="font-medium max-w-[300px] truncate">{element.message}</TableCell>
                        <TableCell>
                          {element.is_active ? (
                            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(element)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(element.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No marquee elements added yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default MarqueeSettings;