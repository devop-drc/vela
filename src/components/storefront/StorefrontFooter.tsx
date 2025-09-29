import { useStorefront } from "@/contexts/StorefrontContext";

export const StorefrontFooter = () => {
  const { shopDetails } = useStorefront();

  if (!shopDetails) return null;

  return (
    <footer className="border-t bg-card py-8 text-muted-foreground">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-sm">
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