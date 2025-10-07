import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, MessageSquareText, Percent, Gift, Edit, Trash2, CalendarIcon, CheckCircle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from "@/utils/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PromotionEditorModal } from "@/components/PromotionEditorModal";
import { format } from "date-fns";

interface Promotion {
  id: string;
  name: string;
  type: 'discount' | 'offer'; // Removed 'marquee_text'
  value: any;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  target_products: string[] | null;
}

const Promotions = () => {
  const { setTitle } = usePageTitle();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);

  useEffect(() => {
    setTitle("Promotions");
  }, [setTitle]);

  const fetchPromotions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .not('type', 'eq', 'marquee_text') // Exclude marquee_text promotions
      .order("created_at", { ascending: false });
    if (error) {
      showError("Could not fetch promotions.");
    } else {
      setPromotions(data as Promotion[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleSave = () => {
    fetchPromotions();
    setIsEditorOpen(false);
    setSelectedPromotion(null);
  };

  const handleEdit = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setIsEditorOpen(true);
  };

  const handleDelete = async (promotionId: string) => {
    if (!window.confirm("Are you sure you want to delete this promotion? This action cannot be undone.")) return;
    const { error } = await supabase.from("promotions").delete().eq("id", promotionId);
    if (error) {
      showError(`Failed to delete promotion: ${error.message}`);
    } else {
      showSuccess("Promotion deleted.");
      fetchPromotions();
    }
  };

  const getPromotionIcon = (type: Promotion['type']) => {
    switch (type) {
      case 'discount': return <Percent className="h-4 w-4" />;
      case 'offer': return <Gift className="h-4 w-4" />;
      default: return null;
    }
  };

  const getPromotionDetails = (promotion: Promotion) => {
    switch (promotion.type) {
      case 'discount':
        if (promotion.value?.discountType === 'percentage') return `${promotion.value.discountValue}% Off`;
        if (promotion.value?.discountType === 'flat') return `$${promotion.value.discountValue} Off`;
        return 'Discount';
      case 'offer':
        if (promotion.value?.offerType === 'free_shipping') return `Free Shipping (Min: $${promotion.value.minOrderValue || 0})`;
        return 'Offer';
      default: return '';
    }
  };

  return (
    <>
      <PromotionEditorModal
        isOpen={isEditorOpen}
        onClose={() => { setIsEditorOpen(false); setSelectedPromotion(null); }}
        onSave={handleSave}
        promotion={selectedPromotion}
      />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Promotions</h1>
            <p className="text-muted-foreground">
              Manage your marketing campaigns, discounts, and special offers.
            </p>
          </div>
          <Button onClick={() => setIsEditorOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Promotion
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Your Promotions</CardTitle>
            <CardDescription>
              Active and scheduled promotions for your storefront.
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
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.length > 0 ? (
                    promotions.map((promo) => (
                      <TableRow key={promo.id}>
                        <TableCell className="font-medium">{promo.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            {getPromotionIcon(promo.type)}
                            {promo.type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {getPromotionDetails(promo)}
                        </TableCell>
                        <TableCell>
                          {promo.is_active ? (
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {promo.start_date && promo.end_date ? (
                            <>
                              {format(new Date(promo.start_date), 'MMM d')} - {format(new Date(promo.end_date), 'MMM d, yyyy')}
                            </>
                          ) : promo.start_date ? (
                            `Starts ${format(new Date(promo.start_date), 'MMM d, yyyy')}`
                          ) : promo.end_date ? (
                            `Ends ${format(new Date(promo.end_date), 'MMM d, yyyy')}`
                          ) : (
                            'Always'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(promo)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(promo.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No promotions added yet.
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

export default Promotions;