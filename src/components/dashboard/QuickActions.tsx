import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ShoppingBag, Palette } from "lucide-react";

export const QuickActions = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button asChild variant="outline" className="w-full justify-start">
          <Link to="/products">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Product
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start">
          <Link to="/orders">
            <ShoppingBag className="mr-2 h-4 w-4" />
            View All Orders
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start">
          <Link to="/settings?tab=appearance">
            <Palette className="mr-2 h-4 w-4" />
            Customize Your Shop
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};