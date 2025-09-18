import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderDetailModal } from "@/components/OrderDetailModal";
import { cn } from "@/lib/utils";

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  status: string;
  total_amount: number;
  created_at: string;
};

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      showError("Could not find your business profile.");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    if (error) {
      showError("Failed to fetch orders.");
    } else {
      setOrders(data as Order[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => ({
    'All': orders,
    'Pending': orders.filter(o => o.status === 'Pending'),
    'In Progress': orders.filter(o => o.status === 'In Progress'),
    'Fulfilled': orders.filter(o => o.status === 'Fulfilled'),
  }), [orders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Fulfilled': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Pending':
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  const OrderTable = ({ status }: { status: 'All' | 'Pending' | 'In Progress' | 'Fulfilled' }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="w-[100px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredOrders[status].length > 0 ? filteredOrders[status].map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">#{order.id.substring(0, 8)}</TableCell>
            <TableCell>{order.customer_name}</TableCell>
            <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
            <TableCell>
              <Badge variant="outline" className={cn("font-normal", getStatusColor(order.status))}>
                {order.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">${order.total_amount.toFixed(2)}</TableCell>
            <TableCell>
              <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                View Details
              </Button>
            </TableCell>
          </TableRow>
        )) : (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
              No orders in this category.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <>
      <OrderDetailModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onUpdate={() => {
          fetchOrders();
          setSelectedOrder(null);
        }}
      />
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Orders</h1>
        <Tabs defaultValue="All">
          <TabsList>
            <TabsTrigger value="All">All</TabsTrigger>
            <TabsTrigger value="Pending">Pending</TabsTrigger>
            <TabsTrigger value="In Progress">In Progress</TabsTrigger>
            <TabsTrigger value="Fulfilled">Fulfilled</TabsTrigger>
          </TabsList>
          <Card className="mt-4">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-4 p-6">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <>
                  <TabsContent value="All"><OrderTable status="All" /></TabsContent>
                  <TabsContent value="Pending"><OrderTable status="Pending" /></TabsContent>
                  <TabsContent value="In Progress"><OrderTable status="In Progress" /></TabsContent>
                  <TabsContent value="Fulfilled"><OrderTable status="Fulfilled" /></TabsContent>
                </>
              )}
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </>
  );
};

export default Orders;