import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
}

interface RecentSalesProps {
  orders: Order[];
}

export const RecentSales = ({ orders }: RecentSalesProps) => (
  <Card className="col-span-4 md:col-span-3">
    <CardHeader>
      <CardTitle>Recent Sales</CardTitle>
      <CardDescription>You made {orders.length} sales recently.</CardDescription>
    </CardHeader>
    <CardContent>
      {orders.length > 0 ? (
        <div className="space-y-8">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{order.customer_name?.slice(0, 2).toUpperCase() || '??'}</AvatarFallback>
              </Avatar>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{order.customer_name}</p>
                <p className="text-sm text-muted-foreground">{order.customer_email}</p>
              </div>
              <div className="ml-auto font-medium">+${order.total_amount.toFixed(2)}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">No recent sales to display.</p>
      )}
    </CardContent>
  </Card>
);