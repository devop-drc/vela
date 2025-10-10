import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, MessageSquareText, Percent, Gift, Edit, Trash2, CalendarIcon, CheckCircle, XCircle, Sparkles, Megaphone, Repeat2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from "@/utils/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PromotionEditorModal } from "@/components/PromotionEditorModal";
import { StorefrontAnnouncementEditorModal } from "@/components/StorefrontAnnouncementEditorModal";
import { StorefrontAnnouncement } from "@/types/storefront";
import { format } from "date-fns";
import * as LucideIcons from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Marquee } from "@/components/ui/marquee";
import { Switch } from "@/components/ui/switch"; // Import Switch

interface Promotion {
  id: string;
  name: string;
  type: 'discount' | 'offer';
  value: any;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  target_products: string[] | null;
  repeat_interval: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none' | null;
}

const Promotions = () => {
  const { setTitle } = usePageTitle();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [storefrontAnnouncements, setStorefrontAnnouncements] = useState<StorefrontAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPromotionEditorOpen, setIsPromotionEditorOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [isAnnouncementEditorOpen, setIsAnnouncementEditorOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<StorefrontAnnouncement | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'promotion' | 'announcement' } | null>(null);


  useEffect(() => {
    setTitle("Promotions");
  }, [setTitle]);

  const fetchPromotionsAndAnnouncements = async () => {
    setIsLoading(true);
    const { data: promotionsData, error: promotionsError } = await supabase
      .from("promotions")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: announcementsData, error: announcementsError } = await supabase
      .from("marquee_elements")
      .select("*")
      .order("display_order", { ascending: true });

    if (promotionsError) {
      showError("Could not fetch promotions.");
    } else {
      setPromotions(promotionsData as Promotion[]);
    }

    if (announcementsError) {
      showError("Could not fetch storefront announcements.");
    } else {
      setStorefrontAnnouncements(announcementsData as StorefrontAnnouncement[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPromotionsAndAnnouncements();
  }, []);

  const handlePromotionSave = () => {
    fetchPromotionsAndAnnouncements();
    setIsPromotionEditorOpen(false);
    setSelectedPromotion(null);
  };

  const handlePromotionEdit = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setIsPromotionEditorOpen(true);
  };

  const handlePromotionDelete = (promotionId: string) => {
    setItemToDelete({ id: promotionId, type: 'promotion' });
    setIsDeleteConfirmOpen(true);
  };

  const handleRerunPromotion = (promotion: Promotion) => {
    // Create a new promotion object with a new ID, and set it as inactive initially
    const newPromotion = {
      ...promotion,
      id: crypto.randomUUID(), // Generate a new ID
      name: `${promotion.name} (Copy)`, // Indicate it's a copy
      is_active: false, // Start as inactive
      start_date: null, // Clear dates for a fresh start
      end_date: null,
    };
    setSelectedPromotion(newPromotion);
    setIsPromotionEditorOpen(true);
  };

  const handleTogglePromotionActive = async (promotionId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('promotions')
      .update({ is_active: !currentStatus })
      .eq('id', promotionId);

    if (error) {
      showError(`Failed to update promotion status: ${error.message}`);
    } else {
      showSuccess(`Promotion status updated to ${!currentStatus ? 'active' : 'inactive'}.`);
      setPromotions(prev => prev.map(p => p.id === promotionId ? { ...p, is_active: !currentStatus } : p));
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

  const handleAnnouncementSave = () => {
    fetchPromotionsAndAnnouncements();
    setIsAnnouncementEditorOpen(false);
    setSelectedAnnouncement(null);
  };

  const handleAnnouncementEdit = (element: StorefrontAnnouncement) => {
    setSelectedAnnouncement(element);
    setIsAnnouncementEditorOpen(true);
  };

  const handleAnnouncementDelete = (elementId: string) => {
    setItemToDelete({ id: elementId, type: 'announcement' });
    setIsDeleteConfirmOpen(true);
  };

  const handleToggleAnnouncementActive = async (elementId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('marquee_elements')
      .update({ is_active: !currentStatus })
      .eq('id', elementId);

    if (error) {
      showError(`Failed to update announcement status: ${error.message}`);
    } else {
      showSuccess(`Announcement status updated to ${!currentStatus ? 'active' : 'inactive'}.`);
      setStorefrontAnnouncements(prev => prev.map(e => e.id === elementId ? { ...e, is_active: !currentStatus } : e));
    }
  };

  const getAnnouncementIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />;
  };

  const confirmDeletion = async () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'promotion') {
      const { error } = await supabase.from("promotions").delete().eq("id", itemToDelete.id);
      if (error) {
        showError(`Failed to delete promotion: ${error.message}`);
      } else {
        showSuccess("Promotion deleted.");
        fetchPromotionsAndAnnouncements();
      }
    } else if (itemToDelete.type === 'announcement') {
      const { error } = await supabase.from("marquee_elements").delete().eq("id", itemToDelete.id);
      if (error) {
        showError(`Failed to delete announcement: ${error.message}`);
      } else {
        showSuccess("Storefront announcement deleted.");
        fetchPromotionsAndAnnouncements();
      }
    }
    setIsDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  return (
    <>
      <PromotionEditorModal
        isOpen={isPromotionEditorOpen}
        onClose={() => { setIsPromotionEditorOpen(false); setSelectedPromotion(null); }}
        onSave={handlePromotionSave}
        promotion={selectedPromotion}
      />
      <StorefrontAnnouncementEditorModal
        isOpen={isAnnouncementEditorOpen}
        onClose={() => { setIsAnnouncementEditorOpen(false); setSelectedAnnouncement(null); }}
        onSave={handleAnnouncementSave}
        element={selectedAnnouncement}
      />

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected {itemToDelete?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletion} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                    <TableHead>Duration</TableHead>
                    <TableHead className="w-[80px] text-center">Active</TableHead> {/* Centered */}
                    <TableHead className="text-right w-[150px]">Actions</TableHead>
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
                        <TableCell className="text-center"> {/* Centered */}
                          <Switch
                            checked={promo.is_active}
                            onCheckedChange={() => handleTogglePromotionActive(promo.id, promo.is_active)}
                            aria-label={`Toggle ${promo.name} active status`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleRerunPromotion(promo)} title="Rerun Promotion">
                              <Repeat2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handlePromotionEdit(promo)} title="Edit Promotion">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handlePromotionDelete(promo.id)} title="Delete Promotion">
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

        {/* Storefront Announcements Section */}
        <div className="flex items-center justify-between pt-8">
          <div>
            <h2 className="text-2xl font-bold">Storefront Announcements</h2>
            <p className="text-muted-foreground">
              Manage the scrolling text messages displayed on your storefront.
            </p>
          </div>
          <Button onClick={() => setIsAnnouncementEditorOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Announcement
          </Button>
        </div>
        {storefrontAnnouncements.filter(e => e.is_active).length > 0 && (
          <div className="space-y-2 pt-4">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Megaphone className="h-5 w-5" /> Live Preview</h3>
            <div className="border rounded-lg p-2 bg-muted/50">
              <Marquee pauseOnHover className="py-2 border-y-2 border-primary/20 bg-primary/10">
                {storefrontAnnouncements.filter(e => e.is_active).map(element => (
                  <div key={element.id} className="flex items-center gap-6 text-base font-semibold text-primary">
                    {getAnnouncementIconComponent(element.icon_name)}
                    <span>{element.message}</span>
                  </div>
                ))}
              </Marquee>
            </div>
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Your Storefront Announcements</CardTitle>
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
                    <TableHead className="w-[80px] text-center">Active</TableHead> {/* Centered */}
                    <TableHead className="text-right w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storefrontAnnouncements.length > 0 ? (
                    storefrontAnnouncements.map((element) => (
                      <TableRow key={element.id}>
                        <TableCell>{element.display_order}</TableCell>
                        <TableCell>{getAnnouncementIconComponent(element.icon_name)}</TableCell>
                        <TableCell className="font-medium max-w-[300px] truncate">{element.message}</TableCell>
                        <TableCell className="text-center"> {/* Centered */}
                          <Switch
                            checked={element.is_active}
                            onCheckedChange={() => handleToggleAnnouncementActive(element.id, element.is_active)}
                            aria-label={`Toggle ${element.message} active status`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleAnnouncementEdit(element)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleAnnouncementDelete(element.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No storefront announcements added yet.
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