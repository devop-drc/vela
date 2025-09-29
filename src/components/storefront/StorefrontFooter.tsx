import { useStorefront } from "@/contexts/StorefrontContext";
import { cn } from "@/lib/utils"; // Import cn for conditional class names

export const StorefrontFooter = () => {
  const { shopDetails, appearanceSettings } = useStorefront();

  if (!shopDetails) return null;

  const blurEnabled = appearanceSettings?.blurEnabled;

  return (
    <footer className={cn(
      "border-t py-8 text-muted-foreground",
      blurEnabled ? "bg-card/80 backdrop-blur-lg" : "bg-card"
    )}>
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-sm text-center md:text-left">
          &copy; {new Date().getFullYear()} {shopDetails.shop_name}. All rights reserved.
        </p>
        {shopDetails.contact_email && (
          <a href={`mailto:${shopDetails.contact_email}`} className="text-sm hover:underline">
            {shopDetails.contact_email}
          </a>
        )}
      </div>
    </footer>
  );
};