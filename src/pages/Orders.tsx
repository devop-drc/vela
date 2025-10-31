import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderDetailModal } from "@/components/OrderDetailModal";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";
import { Search, Banknote, ShoppingBag, FileBarChart } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { useSearchParams } from "react-router-dom"; // Import useSearchParams

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  status: 'Pending' | 'Order Seen' | 'Order Packaged' | 'Given to Courier' | 'Fulfilled' | 'Problematic';
  total_amount: number;
  created_at: string;
  updated_at: string;
  currency: string;
  payment_method: string;
  payment_status: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: string;
  shipping_notes_seller?: string;
  shipping_notes_courier?: string;
};

const OrderTable = ({ orders, onSelectOrder }: { orders: Order[], onSelectOrder: (order: Order) => void }) => {
  const { shopDetails, convertCurrency } = useShop();

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'Fulfilled': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Given to Courier': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Order Packaged': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Order Seen': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Pending': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Problematic': return 'bg-destructive/10 text-destructive border-destructive/30';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!shopDetails) {
    return null; // Or a loading indicator
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last Status Change</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="w-[100px]"></TableHead>
        </TableRow>
      </TableHeader><TableBody>
        {orders.length > 0 ? orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">#{order.id.substring(0, 8)}</TableCell>
            <TableCell>{order.customer_name}</TableCell>
            <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
            <TableCell>
              <Badge variant="outline" className={cn("font-normal", getStatusColor(order.status))}>
                {order.status}
              </Badge>
            </TableCell>
            <TableCell>{new Date(order.updated_at).toLocaleString()}</TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(convertCurrency(order.total_amount, order.currency, shopDetails.currency), shopDetails.currency)}
              {order.currency !== shopDetails.currency && (
                <div className="text-xs font-normal text-muted-foreground">
                  (~{formatCurrency(order.total_amount, order.currency)})
                </div>
              )}
            </TableCell>
            <TableCell>
              <Button variant="outline" size="sm" onClick={() => onSelectOrder(order)}>
                View Details
              </Button>
            </TableCell>
          </TableRow>
        )) : (
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
              No orders match your criteria.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

const Orders = () => {
  const { setTitle } = usePageTitle();
  const { shopDetails, convertCurrency } = useShop();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams(); // Initialize search params

  useEffect(() => { setTitle("Orders"); }, [setTitle]);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsLoading(false); return; }

    const { data: business, error: businessError } = await supabase
      .from('businesses').select('id').eq('user_id', user.id).single();

    if (businessError || !business) {
      showError("Could not find your business profile.");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('orders').select('*, updated_at').eq('business_id', business.id).order('created_at', { ascending: false });
    
    if (error) { showError("Failed to fetch orders."); } 
    else { setOrders(data as Order[]); }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Effect to open OrderDetailModal if orderId is in URL
  useEffect(() => {
    const orderIdFromUrl = searchParams.get('orderId');
    if (orderIdFromUrl && orders.length > 0) {
      const orderToOpen = orders.find(order => order.id === orderIdFromUrl);
      if (orderToOpen) {
        setSelectedOrder(orderToOpen);
        // Clear the orderId from URL after opening
        searchParams.delete('orderId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [orders, searchParams, setSearchParams]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (activeTab !== 'All' && order.status !== activeTab) return false;
      
      const lowerSearch = searchTerm.toLowerCase();
      if (lowerSearch && !(order.customer_name.toLowerCase().includes(lowerSearch) || order.customer_email.toLowerCase().includes(lowerSearch))) return false;

      if (dateRange?.from) {
        const orderDate = new Date(order.created_at);
        if (orderDate < dateRange.from) return false;
        if (dateRange.to && orderDate > new Date(dateRange.to).setHours(23, 59, 59, 999)) return false;
      }
      
      return true;
    });
  }, [orders, activeTab, searchTerm, dateRange]);

  const stats = useMemo(() => {
    if (!shopDetails) {
      return { totalRevenue: 0, orderCount: 0, aov: 0 };
    }

    const totalRevenue = filteredOrders.reduce((sum, order) => {
      const convertedAmount = convertCurrency(order.total_amount, order.currency, shopDetails.currency);
      return sum + convertedAmount;
    }, 0);

    const orderCount = filteredOrders.length;
    const aov = orderCount > 0 ? totalRevenue / orderCount : 0;
    return { totalRevenue, orderCount, aov };
  }, [filteredOrders, shopDetails, convertCurrency]);

  return (
    <>
      <OrderDetailModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onUpdate={() => { fetchOrders(); setSelectedOrder(null); }}
      />
      <div className="space-y-6">
        {isLoading || !shopDetails ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue, shopDetails.currency)} icon={Banknote} />
            <StatCard title="Orders" value={stats.orderCount.toLocaleString()} icon={ShoppingBag} />
            <StatCard title="Avg. Order Value" value={formatCurrency(stats.aov, shopDetails.currency)} icon={FileBarChart} />
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="sticky top-0 z-50 flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by customer..." className="pl-10 shadow-md" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <DateRangePicker date={dateRange} onDateChange={setDateRange}/>
          </div>
          <TabsList className="z-50 shadow-md">
            <TabsTrigger value="All">All</TabsTrigger>
            <TabsTrigger value="Pending">Pending</TabsTrigger>
            <TabsTrigger value="Order Seen">Order Seen</TabsTrigger>
            <TabsTrigger value="Order Packaged">Order Packaged</TabsTrigger>
            <TabsTrigger value="Given to Courier">Given to Courier</TabsTrigger>
            <TabsTrigger value="Fulfilled">Fulfilled</TabsTrigger>
            <TabsTrigger value="Problematic">Problematic</TabsTrigger>
          </TabsList>
          </div>
          <Card className="mt-4">
            <CardContent className="p-0">
              {isLoading || !shopDetails ? (
                <div className="space-y-4 p-6">
                  <Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <OrderTable orders={filteredOrders} onSelectOrder={setSelectedOrder} />
              )}
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </>
  );
};

export default Orders;