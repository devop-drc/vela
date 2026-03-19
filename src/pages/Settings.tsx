import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { showError, showSuccess } from "@/utils/toast";
import { AppearancePanel } from "@/components/settings/AppearancePanel";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { ShopSettings } from "@/components/settings/ShopSettings";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { User, Store, Palette, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Section = ({ icon: Icon, title, description, color, children, defaultOpen = true }: SectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-accent/30 transition-colors"
      >
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", color)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default function Settings() {
  const { setTitle } = usePageTitle();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => { setTitle("Settings"); }, [setTitle]);

  useEffect(() => {
    const err = searchParams.get("integration_error");
    if (err) { showError(`Integration failed: ${err}`); searchParams.delete("integration_error"); setSearchParams(searchParams, { replace: true }); }
    const ok = searchParams.get("integration_success");
    if (ok) { showSuccess("Instagram connected!"); searchParams.delete("integration_success"); setSearchParams(searchParams, { replace: true }); }
  }, [searchParams, setSearchParams]);

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Account + Shop side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section
          icon={User}
          title="Account"
          description="Profile, integrations & preferences"
          color="bg-blue-500/10 text-blue-600"
        >
          <AccountSettings />
        </Section>

        <Section
          icon={Store}
          title="Shop"
          description="Store name, currency & contact info"
          color="bg-emerald-500/10 text-emerald-600"
        >
          <ShopSettings />
        </Section>
      </div>

      {/* Appearance — full width */}
      <Section
        icon={Palette}
        title="Appearance"
        description="Themes, fonts, colors & layout"
        color="bg-violet-500/10 text-violet-600"
        defaultOpen={false}
      >
        <AppearancePanel />
      </Section>
    </div>
  );
}
