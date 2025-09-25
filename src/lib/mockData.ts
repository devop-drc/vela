import { Banknote, Package, Users, CreditCard, CheckCircle, XCircle } from "lucide-react";

export const mockStatCards = [
  { title: "Total Revenue", value: "$125,430", icon: Banknote, description: "All-time revenue" },
  { title: "Sales", value: "+1,890", icon: CreditCard, description: "All-time sales count" },
  { title: "Active Products", value: "235", icon: Package, description: "Products available for sale" },
  { title: "Total Customers", value: "852", icon: Users, description: "Unique customers all-time" },
];

export const mockChartData = [
  { name: 'Jan', revenue: 8200, clients: 120, orders: 150 },
  { name: 'Feb', revenue: 9600, clients: 140, orders: 170 },
  { name: 'Mar', revenue: 11200, clients: 160, orders: 200 },
  { name: 'Apr', revenue: 15500, clients: 180, orders: 240 },
  { name: 'May', revenue: 18300, clients: 210, orders: 280 },
  { name: 'Jun', revenue: 22500, clients: 250, orders: 320 },
];

export const mockProfileData = {
  shop_name: 'Aura Threads',
  logo_url: 'https://github.com/shadcn.png',
  followers_count: 12400,
  media_count: 450,
  productCount: 235,
};

export const mockTopProducts = [
  { product_id: '1', name: 'Vintage Sunset Tee', media_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', total_sold: 452 },
  { product_id: '2', name: 'Handcrafted Leather Wallet', media_url: 'https://images.unsplash.com/photo-1615393329869-68279e0a239b?w=400', total_sold: 389 },
  { product_id: '3', name: 'Minimalist Desk Lamp', media_url: 'https://images.unsplash.com/photo-1543508282-6319a3e2621f?w=400', total_sold: 312 },
];

export const mockActivities = [
    { id: '1', type: 'sale', title: 'New Sale', description: 'to Jordan Smith', value: '$125.00', date: new Date(Date.now() - 2 * 60 * 1000).toISOString(), icon: Banknote, iconBg: 'bg-emerald-100 text-emerald-600' },
    { id: '2', type: 'product', title: 'Status Updated', description: 'Vintage Sunset Tee', value: 'Active', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100', date: new Date(Date.now() - 5 * 60 * 1000).toISOString(), icon: CheckCircle, iconBg: 'bg-blue-100 text-blue-600' },
    { id: '3', type: 'sale', title: 'New Sale', description: 'to Alex Johnson', value: '$89.50', date: new Date(Date.now() - 15 * 60 * 1000).toISOString(), icon: Banknote, iconBg: 'bg-emerald-100 text-emerald-600' },
    { id: '4', type: 'product', title: 'New Product', description: 'Ceramic Coffee Mug', value: 'Draft', image: 'https://images.unsplash.com/photo-1555982346-1775fe861062?w=100', date: new Date(Date.now() - 30 * 60 * 1000).toISOString(), icon: XCircle, iconBg: 'bg-amber-100 text-amber-600' },
    { id: '5', type: 'sale', title: 'New Sale', description: 'to Casey Williams', value: '$210.00', date: new Date(Date.now() - 60 * 60 * 1000).toISOString(), icon: Banknote, iconBg: 'bg-emerald-100 text-emerald-600' },
    { id: '6', type: 'product', title: 'New Product', description: 'Handcrafted Leather Wallet', value: 'Draft', image: 'https://images.unsplash.com/photo-1615393329869-68279e0a239b?w=100', date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), icon: XCircle, iconBg: 'bg-amber-100 text-amber-600' },
];