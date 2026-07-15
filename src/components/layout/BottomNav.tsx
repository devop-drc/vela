import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home, Package, ShoppingBag, Archive, Settings, MoreHorizontal,
  Layers, MessageSquareQuote, Megaphone, Globe, LogOut, Store,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/dashboard", icon: Home, labelKey: "nav.dashboard", end: true },
  { to: "/products", icon: Package, labelKey: "nav.products" },
  { to: "/out-of-stock", icon: Archive, labelKey: "nav.stock" },
  { to: "/orders", icon: ShoppingBag, labelKey: "nav.orders" },
];

const moreLinks = [
  { to: "/categories", icon: Layers, labelKey: "nav.categories" },
  { to: "/keywords", icon: MessageSquareQuote, labelKey: "nav.keywords" },
  { to: "/promotions", icon: Megaphone, labelKey: "nav.promotions" },
  { to: "/storefront-studio", icon: Store, labelKey: "nav.storefront" },
  { to: "/settings", icon: Settings, labelKey: "nav.settings" },
];

const BottomNav = () => {
  const isMobile = useIsMobile();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  if (!isMobile) return null;

  const go = (to: string) => { setMoreOpen(false); navigate(to); };
  const handleLogout = async () => { await supabase.auth.signOut(); setMoreOpen(false); navigate('/login'); };

  const itemCls = ({ isActive }: { isActive: boolean }) =>
    cn("flex flex-col items-center justify-center text-muted-foreground w-full h-full transition-colors", isActive && "text-primary");

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 h-16 z-50">
      <nav className="bg-background/80 backdrop-blur-[20px] border rounded-2xl shadow-lg h-full">
        <div className="flex justify-around items-center h-full">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={itemCls}>
              <item.icon className="h-6 w-6" />
              <span className="text-[11px] mt-1">{t(item.labelKey)}</span>
            </NavLink>
          ))}

          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button type="button" className="flex flex-col items-center justify-center text-muted-foreground w-full h-full transition-colors" aria-label={t("nav.more", "More")}>
                <MoreHorizontal className="h-6 w-6" />
                <span className="text-[11px] mt-1">{t("nav.more", "More")}</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl" style={{ paddingBottom: 'calc(1.5rem + var(--sab))' }}>
              <h2 className="text-lg font-semibold">{t("nav.more", "More")}</h2>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {moreLinks.map((l) => (
                  <button key={l.to} type="button" onClick={() => go(l.to)} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted text-left transition-colors">
                    <l.icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium">{t(l.labelKey)}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Select value={i18n.language} onValueChange={(v) => i18n.changeLanguage(v)}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="sq">Shqip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <button type="button" onClick={handleLogout} className="flex items-center gap-3 p-3 rounded-lg border w-full text-left text-destructive hover:bg-destructive/10 transition-colors">
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{t("nav.logout", "Log out")}</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
};

export default BottomNav;
