import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const StorefrontPreview = () => (
  <div className="lg:col-span-2">
    <p className="text-sm text-muted-foreground mb-2">Storefront Preview</p>
    <Card className="w-full h-64 p-4 overflow-hidden relative flex items-center justify-center text-sm">
      <div className="absolute inset-0 bg-background" />
      <Card className="w-48 z-10">
        <CardContent className="p-2">
          <div className="aspect-square bg-muted rounded-md mb-2" />
          <h3 className="font-bold text-xs mb-1 text-card-foreground">Product Name</h3>
          <p className="text-xs text-muted-foreground mb-2">A short, catchy description of the item.</p>
          <div className="flex justify-between items-center">
            <Badge variant="secondary">Category</Badge>
            <p className="font-bold text-xs text-card-foreground">$49.99</p>
          </div>
          <Button size="sm" className="w-full mt-3 text-xs h-7 bg-primary text-primary-foreground">Add to Cart</Button>
        </CardContent>
      </Card>
    </Card>
  </div>
);