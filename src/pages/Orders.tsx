import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const orders = [
  { orderId: "#3210", customer: "Olivia Martin", date: "Feb 20, 2024", status: "Fulfilled", total: "$42.25" },
  { orderId: "#3209", customer: "Ava Johnson", date: "Feb 18, 2024", status: "Fulfilled", total: "$74.99" },
  { orderId: "#3204", customer: "Michael Johnson", date: "Feb 15, 2024", status: "Unfulfilled", total: "$129.50" },
  { orderId: "#3203", customer: "Liam Smith", date: "Feb 14, 2024", status: "Fulfilled", total: "$89.99" },
];

const Orders = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Orders</h1>
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.orderId}>
                  <TableCell className="font-medium">{order.orderId}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell>
                    <Badge variant={order.status === 'Fulfilled' ? 'default' : 'destructive'}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{order.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;