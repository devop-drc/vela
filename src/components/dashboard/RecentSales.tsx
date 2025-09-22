import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/formatters";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
}

interface RecentSalesProps {
  orders: Order[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const RecentSales = ({ orders }: RecentSalesProps) => {
  return (
    <Card className="col-span-4 md:col-span-3">
      <CardHeader>
        <CardTitle>Recent Sales</CardTitle>
        <CardDescription>You made {orders.length} sales recently.</CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {orders.map((order) => (
              <motion.div key={order.id} variants={itemVariants} className="flex items-center">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{order.customer_name?.slice(0, 2).toUpperCase() || '??'}</AvatarFallback>
                </Avatar>
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">{order.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                </div>
                <div className="ml-auto font-medium">+{formatCurrency(order.total_amount, null)}</div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No recent sales to display.</p>
        )}
      </CardContent>
    </Card>
  );
};