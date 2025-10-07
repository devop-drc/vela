import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, MessageSquareText, Percent, Gift, Edit, Trash2, CalendarIcon, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from "@/utils/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PromotionEditorModal } from "@/components/PromotionEditorModal";
import { MarqueeEditorModal } from "@/components/MarqueeEditorModal"; // Import MarqueeEditorModal
import { MarqueeElement } from "@/pages/MarqueeSettings"; // Re-use MarqueeElement interface
import { format } from "date-fns";
import * as LucideIcons from 'lucide-react'; // Import all Lucide icons

interface Promotion {
  id: string;
  name: string;
  type: 'discount' | 'offer';
  value: any;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  target_products: string[] | null;
}

const Promotions = () => {
  const { setTitle } = usePageTitle();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [marqueeElements, setMarqueeElements] = useState<MarqueeElement[]>([]); // State for marquee elements
  const [isLoading, setIsLoading] = useState(true);
  const [isPromotionEditorOpen, setIsPromotionEditorOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [isMarqueeEditorOpen, setIsMarqueeEditorOpen] = useState(false); // State for marquee modal
  const [selectedMarqueeElement, setSelectedMarqueeElement] = useState<MarqueeElement | null>(null); // State for selected marquee element

  useEffect(() => {
    setTitle("Promotions");
  }, [setTitle]);

  const fetchPromotionsAndMarquee = async () => {
    setIsLoading(true);
    const { data: promotionsData, error: promotionsError } = await supabase
      .from("promotions")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: marqueeData, error: marqueeError } = await supabase
      .from("marquee_elements")
      .select("*")
      .order("display_order", { ascending: true });

    if (promotionsError) {
      showError("Could not fetch promotions.");
    } else {
      setPromotions(promotionsData as Promotion[]);
    }

    if (marqueeError) {
      showError("Could not fetch marquee elements.");
    } else {
      setMarqueeElements(marqueeData as MarqueeElement[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPromotionsAndMarquee();
  }, []);

  const handlePromotionSave = () => {
    fetchPromotionsAndMarquee();
    setIsPromotionEditorOpen(false);
    setSelectedPromotion(null);
  };

  const handlePromotionEdit = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setIsPromotionEditorOpen(true);
  };

  const handlePromotionDelete = async (promotionId: string) => {
    if (!window.confirm("Are you sure you want to delete this promotion? This action cannot be undone.")) return;
    const { error } = await supabase.from("promotions").delete().eq("id", promotionId);
    if (error) {
      showError(`Failed to delete promotion: ${error.message}`);
    } else {
      showSuccess("Promotion deleted.");
      fetchPromotionsAndMarquee();
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

  const handleMarqueeSave = () => {
    fetchPromotionsAndMarquee();
    setIsMarqueeEditorOpen(false);
    setSelectedMarqueeElement(null);
  };

  const handleMarqueeEdit = (element: MarqueeElement) => {
    setSelectedMarqueeElement(element);
    setIsMarqueeEditorOpen(true);
  };

  const handleMarqueeDelete = async (elementId: string) => {
    if (!window.confirm("Are you sure you want to delete this marquee element?")) return;
    const { error } = await supabase.from("marquee_elements").delete().eq("id", elementId);
    if (error) {
      showError(`Failed to delete element: ${error.message}`);
    } else {
      showSuccess("Marquee element deleted.");
      fetchPromotionsAndMarquee();
    }
  };

  const getMarqueeIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />;
  };

  return (
    <>
      <PromotionEditorModal
        isOpen={isPromotionEditorOpen}
        onClose={() => { setIsPromotionEditorOpen(false); setSelectedPromotion(null); }}
        onSave={handlePromotionSave}
        promotion={selectedPromotion}
      />
      <MarqueeEditorModal
        isOpen={isMarqueeEditorOpen}
        onClose={() => { setIsMarqueeEditorOpen(false); setSelectedMarqueeElement(null); }}
        onSave={handleMarqueeSave}
        element={selectedMarqueeElement}
      />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Promotions</h1>
            <p className="text-muted-foreground">
              Manage your marketing campaigns, discounts, and special offers.
            </p>
          </div>
          <Button onClick={() => setIsPromotionEditorOpen(true)}>
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
                            <Button variant="ghost" size="icon" onClick={() => handlePromotionEdit(promo)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handlePromotionDelete(promo.id)}>
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

        {/* Marquee Elements Section */}
        <div className="flex items-center justify-between pt-8">
          <div>
            <h2 className="text-2xl font-bold">Marquee Elements</h2>
            <p className="text-muted-foreground">
              Manage the scrolling text messages displayed on your storefront.
            </p>
          </div>
          <Button onClick={() => setIsMarqueeEditorOpen(true)}>
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
                        <TableCell>{getMarqueeIconComponent(element.icon_name)}</TableCell>
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
                            <Button variant="ghost" size="icon" onClick={() => handleMarqueeEdit(element)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleMarqueeDelete(element.id)}>
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

export default Promotions;