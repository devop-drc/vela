import { useStorefront } from "@/contexts/StorefrontContext";
import { cn } from "@/lib/utils";

export const StorefrontFooter = () => {
  const { shopDetails, appearanceSettings } = useStorefront();

  if (!shopDetails) return null;

  const blurEnabled = appearanceSettings?.blurEnabled;

  return (
    <footer className={cn(
      "border-t py-8 text-muted-foreground",
      blurEnabled ? "bg-card/80 backdrop-blur-lg" : "bg-card",
      "shadow-inner" // Added shadow-inner for a subtle effect
    )}>
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-sm text-center md:text-left">
          &copy; {new Date().getFullYear()} <span className="font-semibold text-foreground">{shopDetails.shop_name}</span>. All rights reserved.
        </p>
        {shopDetails.contact_email && (
          <a href={`mailto:${shopDetails.contact_email}`} className="text-sm hover:underline text-primary hover:text-primary-foreground transition-colors">
            {shopDetails.contact_email}
          </a>
        )}
      </div>
    </footer>
  );
};