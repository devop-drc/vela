import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/contexts/StorefrontContext';

interface BreadcrumbItem {
  label: string;
  path: string;
}

export const StorefrontBreadcrumb = () => {
  const { shopSlug, productId } = useParams<{ shopSlug: string; productId: string }>();
  const location = useLocation();
  const { shopDetails, products } = useStorefront();

  const breadcrumbs: BreadcrumbItem[] = [];

  // Always start with the shop's home page
  breadcrumbs.push({ label: shopDetails?.shop_name || 'Shop', path: `/shop/${shopSlug}` });

  const pathSegments = location.pathname.split('/').filter(segment => segment && segment !== 'shop' && segment !== shopSlug);
  let currentPathAccumulator = `/shop/${shopSlug}`;

  pathSegments.forEach((segment, index) => {
    if (segment === 'products') {
      currentPathAccumulator += `/${segment}`;
      breadcrumbs.push({ label: 'Products', path: currentPathAccumulator });
    } else if (segment === 'product' && pathSegments[index + 1] === productId) {
      // This is the '/product' segment before the actual product ID.
      // We want to ensure 'Products' is in the breadcrumb before the product name.
      const productsPath = `/shop/${shopSlug}/products`;
      if (!breadcrumbs.some(b => b.path === productsPath)) {
        breadcrumbs.push({ label: 'Products', path: productsPath });
      }
      // Do not add '/product' as a separate breadcrumb item.
    } else if (segment === productId && productId) {
      currentPathAccumulator += `/product/${segment}`; // Build the full product path
      const product = products.find(p => p.id === productId);
      breadcrumbs.push({ label: product?.name || 'Product Detail', path: currentPathAccumulator });
    } else {
      currentPathAccumulator += `/${segment}`;
      breadcrumbs.push({ label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '), path: currentPathAccumulator });
    }
  });

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
      {breadcrumbs.map((item, index) => (
        <div key={item.path} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
          <Link
            to={item.path}
            className={cn(
              "hover:text-foreground transition-colors",
              index === breadcrumbs.length - 1 && "text-foreground font-medium"
            )}
          >
            {index === 0 && <Home className="h-4 w-4 inline-block mr-1" />}
            {item.label}
          </Link>
        </div>
      ))}
    </nav>
  );
};