import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/contexts/StorefrontContext';

interface BreadcrumbItem {
  label: string;
  path: string;
}

export const InstagramBreadcrumb = () => {
  const { shopSlug, productId } = useParams<{ shopSlug: string; productId: string }>();
  const location = useLocation();
  const { shopDetails, products } = useStorefront();

  const breadcrumbs: BreadcrumbItem[] = [];

  // Always start with the Instagram profile page
  breadcrumbs.push({ label: shopDetails?.username || shopDetails?.shop_name || 'Profile', path: `/instagramShop/${shopSlug}` });

  const pathSegments = location.pathname.split('/').filter(segment => segment && segment !== 'instagramShop' && segment !== shopSlug);
  let currentPathAccumulator = `/instagramShop/${shopSlug}`;

  pathSegments.forEach((segment, index) => {
    if (segment === 'product' && pathSegments[index + 1] === productId) {
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
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4 px-4">
      {breadcrumbs.map((item, index) => (
        <div key={item.path} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />}
          <Link
            to={item.path}
            className={cn(
              "hover:text-foreground transition-colors",
              index === breadcrumbs.length - 1 && "text-foreground font-medium"
            )}
          >
            {index === 0 && <ArrowLeft className="h-4 w-4 inline-block mr-1" />}
            {item.label}
          </Link>
        </div>
      ))}
    </nav>
  );
};