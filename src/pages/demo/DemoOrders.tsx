/** Demo Orders — stat chips, status tabs, table, detail modal, status change. */
import { useMemo, useState } from "react";
import {
  ShoppingBag, Banknote, Clock, Loader2, CheckCircle2, Search, PackageCheck,
  User, Mail, Calendar, CreditCard, MapPin, Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { demoOrders, DemoOrder, DemoOrderStatus, orderStatusMeta, orderStatusOrder, fmtALL } from "./data";
import { StatusBadge } from "@/components/ui-app/StatusBadge";
import { orderStatusTone, toneTint, toneText } from "@/lib/status";

const TABS: { key: string; label: string; match: (s: DemoOrderStatus) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "pending", label: "Pending", match: (s) => s === "Pending" },
  { key: "progress", label: "In Progress", match: (s) => ["Order Seen", "Order Packaged", "Given to Courier"].includes(s) },
  { key: "fulfilled", label: "Fulfilled", match: (s) => s === "Fulfilled" },
  { key: "problematic", label: "Problematic", match: (s) => s === "Problematic" },
  { key: "cancelled", label: "Cancelled", match: (s) => s === "Cancelled" },
];

const rel = (iso: string) => {
  const m = (Date.now() - new Date(iso).getTime()) / 60000;
  if (m < 60) return `${Math.round(m)}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

const Chip = ({ icon: Icon, iconCls, value, label, tint }: any) => (
  <div className={cn("flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium", tint ?? "bg-card")}>
    <Icon className={cn("h-3.5 w-3.5", iconCls)} /> <span className="tabular-nums">{value}</span> <span className="opacity-70">{label}</span>
  </div>
);

const DemoOrders = () => {
  const [orders, setOrders] = useState<DemoOrder[]>(demoOrders);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<DemoOrder | null>(null);

  const totals = {
    count: orders.length,
    revenue: orders.filter((o) => o.status === "Fulfilled" && o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0),
    pending: orders.filter((o) => o.status === "Pending").length,
    progress: orders.filter((o) => ["Order Seen", "Order Packaged", "Given to Courier"].includes(o.status)).length,
    fulfilled: orders.filter((o) => o.status === "Fulfilled").length,
  };

  const activeTab = TABS.find((t) => t.key === tab)!;
  const filtered = useMemo(
    () => orders.filter((o) => activeTab.match(o.status) && (o.customer.toLowerCase().includes(q.toLowerCase()) || o.id.includes(q.toLowerCase()))),
    [orders, tab, q],
  );

  const setStatus = (id: string, s: DemoOrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: s } : o)));
    setOpen((o) => (o && o.id === id ? { ...o, status: s } : o));
  };

  return (
    <div className="space-y-4">
      {/* chips */}
      <div className="flex flex-wrap gap-3">
        <Chip icon={ShoppingBag} iconCls="text-muted-foreground" value={totals.count} label="orders" />
        <Chip icon={Banknote} iconCls={toneText.success} value={fmtALL(totals.revenue)} label="revenue" />
        <Chip icon={Clock} iconCls={toneText.warning} value={totals.pending} label="Pending" tint={toneTint.warning} />
        <Chip icon={Loader2} iconCls={toneText.info} value={totals.progress} label="In Progress" tint={toneTint.info} />
        <Chip icon={CheckCircle2} iconCls={toneText.success} value={totals.fulfilled} label="Fulfilled" tint={toneTint.success} />
      </div>

      {/* search + tabs */}
      <div className="space-y-2">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search orders" className="h-8 pl-8 text-sm" />
        </div>
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => {
            const n = orders.filter((o) => t.match(o.status)).length;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn("flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
                {t.label}
                {n > 0 && <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-xs">{n}</Badge>}
              </button>
            );
          })}
        </div>
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Order</th>
              <th className="px-4 py-2.5 text-left font-medium">Customer</th>
              <th className="hidden px-4 py-2.5 text-left font-medium sm:table-cell">Items</th>
              <th className="hidden px-4 py-2.5 text-left font-medium md:table-cell">Created</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              return (
                <tr key={o.id} onClick={() => setOpen(o)} className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-muted-foreground">#{o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium leading-tight">{o.customer}</p>
                    <p className="text-xs text-muted-foreground">{o.email}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground md:table-cell">{rel(o.createdAt)}</td>
                  <td className="px-4 py-3"><StatusBadge tone={orderStatusTone(o.status)} size="sm">{o.status}</StatusBadge></td>
                  <td className="px-4 py-3 text-right font-medium">{fmtALL(o.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <PackageCheck className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-muted-foreground">No orders here</p>
          </div>
        )}
      </div>
      <p className="text-right text-xs text-muted-foreground">{filtered.length} of {orders.length} orders</p>

      {/* detail modal */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          {open && (() => {
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Order #{open.id.slice(0, 8)}</DialogTitle>
                  <DialogDescription>Placed {new Date(open.createdAt).toLocaleDateString()} · {open.customer}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {[[User, "Customer", open.customer], [Mail, "Email", open.email], [Calendar, "Date", new Date(open.createdAt).toLocaleString()], [Banknote, "Total", fmtALL(open.total)], [CreditCard, "Payment", `${open.paymentMethod} · ${open.paymentStatus}`]].map(([Icon, l, v]: any) => (
                        <div key={l} className="text-sm">
                          <p className="mb-0.5 flex items-center gap-1.5 text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {l}</p>
                          <p className="font-medium capitalize">{v}</p>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4" /> Shipping</h3>
                      <div className="space-y-1 rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
                        <p><span className="font-medium text-foreground">{open.shipping.address}</span></p>
                        <p>{open.shipping.city}, {open.shipping.zip}</p>
                        <p>{open.shipping.country}</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 font-semibold"><Package className="h-4 w-4" /> Items</h3>
                      <div className="space-y-3">
                        {open.items.map((it, i) => (
                          <div key={i} className="flex items-center gap-4">
                            <img src={it.image} alt="" className="h-16 w-16 rounded-md bg-muted object-cover" />
                            <div className="flex-1">
                              <p className="font-medium">{it.name}</p>
                              <p className="text-sm text-muted-foreground">Qty: {it.qty}</p>
                            </div>
                            <p className="font-medium">{fmtALL(it.price * it.qty)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <StatusBadge tone={orderStatusTone(open.status)} variant="solid">{open.status}</StatusBadge>
                  </div>
                  <Select value={open.status} onValueChange={(s) => setStatus(open.id, s as DemoOrderStatus)}>
                    <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {orderStatusOrder.map((s) => {
                        const SM = orderStatusMeta[s];
                        return <SelectItem key={s} value={s}><span className="flex items-center gap-2"><SM.icon className="h-3.5 w-3.5" /> {s}</span></SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DemoOrders;
