import { Card, CardContent } from "@/components/ui/card";
import { Home, Package, Banknote, Users } from "lucide-react";

export const DashboardPreview = () => (
  <div className="lg:col-span-3">
    <p className="text-sm text-muted-foreground mb-2">Dashboard Preview</p>
    <Card className="w-full h-64 p-2 overflow-hidden relative flex items-stretch text-[10px] leading-tight">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Sidebar */}
      <div className="w-1/4 rounded-sm p-2 flex flex-col bg-primary text-primary-foreground z-10">
        <div className="font-bold mb-4">InstaShop</div>
        <div className="space-y-2">
          <div className="flex items-center p-1 rounded-sm bg-primary-foreground/20"><Home className="h-3 w-3 mr-2" /> Dashboard</div>
          <div className="flex items-center p-1 rounded-sm"><Package className="h-3 w-3 mr-2" /> Products</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-3/4 flex flex-col pl-2 z-10">
        {/* Header */}
        <div className="h-8 flex-shrink-0 rounded-sm bg-card mb-2 flex items-center justify-between px-2">
          <p className="font-bold">Dashboard</p>
          <div className="h-4 w-4 rounded-full bg-muted" />
        </div>
        {/* Grid */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          <Card className="p-2"><div className="flex items-center mb-1"><Banknote className="h-3 w-3 mr-1 text-muted-foreground" /> Revenue</div><p className="font-bold text-lg">$1,234</p></Card>
          <Card className="p-2"><div className="flex items-center mb-1"><Users className="h-3 w-3 mr-1 text-muted-foreground" /> Customers</div><p className="font-bold text-lg">56</p></Card>
          <Card className="col-span-2 p-2">Chart Preview</Card>
        </div>
      </div>
    </Card>
  </div>
);