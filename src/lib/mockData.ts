import { Banknote, Package, Users, CreditCard, CheckCircle, Sparkles, ShoppingBag, Truck } from "lucide-react";

// Demo data for the /demo dashboard preview. Albanian market · ALL currency ·
// Vela brand — mirrors the real app (storefront demo is "Butiku i Elirës").
const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=400`;

export const mockStatCards = [
  { title: "Total Revenue", value: "2,845,000 ALL", icon: Banknote, description: "All-time revenue" },
  { title: "Sales", value: "+1,890", icon: CreditCard, description: "All-time sales count" },
  { title: "Active Products", value: "235", icon: Package, description: "Products available for sale" },
  { title: "Total Customers", value: "1,204", icon: Users, description: "Unique customers all-time" },
];

export const mockChartData = [
  { name: 'Jan', revenue: 182000, clients: 120, orders: 150 },
  { name: 'Feb', revenue: 231000, clients: 138, orders: 176 },
  { name: 'Mar', revenue: 298000, clients: 165, orders: 214 },
  { name: 'Apr', revenue: 372000, clients: 188, orders: 262 },
  { name: 'May', revenue: 451000, clients: 224, orders: 305 },
  { name: 'Jun', revenue: 560000, clients: 268, orders: 356 },
];

export const mockProfileData = {
  shop_name: 'Butiku i Elirës',
  logo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
  followers_count: 12400,
  media_count: 450,
  productCount: 235,
};

export const mockTopProducts = [
  { product_id: '1', name: 'Fustan liri', media_url: img('1595777457583-95e059d581b8'), total_sold: 452 },
  { product_id: '2', name: 'Sandale lëkure', media_url: img('1543163521-1bf539c55dd2'), total_sold: 389 },
  { product_id: '3', name: 'Çantë kashte', media_url: img('1590874103328-eac38a683ce7'), total_sold: 312 },
  { product_id: '4', name: 'Bluzë pambuku', media_url: img('1434389677669-e08b4cac3105'), total_sold: 268 },
  { product_id: '5', name: 'Shall mëndafshi', media_url: img('1601924994987-69e26d50dc26'), total_sold: 205 },
];

const min = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString();
const hrs = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

export const mockActivities = [
  { id: '1', type: 'sale', title: 'New order', description: 'Ana K. · Fustan liri (M)', value: '+3,500 ALL', date: min(2), icon: ShoppingBag, iconBg: 'bg-emerald-100 text-emerald-600' },
  { id: '2', type: 'sale', title: 'Order fulfilled', description: 'Bledi M. · Sandale lëkure', value: '+4,200 ALL', date: min(9), icon: CheckCircle, iconBg: 'bg-emerald-100 text-emerald-600' },
  { id: '3', type: 'product', title: 'Product synced', description: 'Vathë ari — from Instagram', value: 'Active', image: img('1535632066927-ab7c9ab60908'), date: min(16), icon: Sparkles, iconBg: 'bg-blue-100 text-blue-600' },
  { id: '4', type: 'sale', title: 'Card payment', description: 'Sara D. · Çantë kashte', value: '+2,800 ALL', date: min(27), icon: CreditCard, iconBg: 'bg-emerald-100 text-emerald-600' },
  { id: '5', type: 'sale', title: 'New order', description: 'Elira K. · Bluzë pambuku', value: '+1,900 ALL', date: min(41), icon: ShoppingBag, iconBg: 'bg-emerald-100 text-emerald-600' },
  { id: '6', type: 'product', title: 'Product synced', description: 'Kapelë plazhi — from Instagram', value: 'Active', image: img('1521369909029-2afed882baee'), date: min(58), icon: Sparkles, iconBg: 'bg-blue-100 text-blue-600' },
  { id: '7', type: 'sale', title: 'New order', description: 'Andi M. · Shall mëndafshi', value: '+1,200 ALL', date: hrs(1.4), icon: ShoppingBag, iconBg: 'bg-emerald-100 text-emerald-600' },
  { id: '8', type: 'sale', title: 'Order fulfilled', description: 'Ilir P. · Fund mesatar', value: '+2,400 ALL', date: hrs(2.1), icon: CheckCircle, iconBg: 'bg-emerald-100 text-emerald-600' },
  { id: '9', type: 'product', title: 'New product', description: 'Sandale lëkure', value: 'Draft', image: img('1543163521-1bf539c55dd2'), date: hrs(2.6), icon: Package, iconBg: 'bg-amber-100 text-amber-600' },
  { id: '10', type: 'sale', title: 'Card payment', description: 'Ledia H. · Fustan liri', value: '+3,500 ALL', date: hrs(3.2), icon: CreditCard, iconBg: 'bg-emerald-100 text-emerald-600' },
  { id: '11', type: 'sale', title: 'New order', description: 'Genti B. · Vathë ari', value: '+990 ALL', date: hrs(4), icon: ShoppingBag, iconBg: 'bg-emerald-100 text-emerald-600' },
  { id: '12', type: 'product', title: 'Product synced', description: 'Bluzë pambuku — from Instagram', value: 'Active', image: img('1434389677669-e08b4cac3105'), date: hrs(5.5), icon: Sparkles, iconBg: 'bg-blue-100 text-blue-600' },
  { id: '13', type: 'sale', title: 'Order fulfilled', description: 'Rea S. · Çantë kashte', value: '+2,800 ALL', date: hrs(6.3), icon: CheckCircle, iconBg: 'bg-emerald-100 text-emerald-600' },
  { id: '14', type: 'sale', title: 'New order', description: 'Klea D. · Kapelë plazhi', value: '+1,500 ALL', date: hrs(8), icon: ShoppingBag, iconBg: 'bg-emerald-100 text-emerald-600' },
];
