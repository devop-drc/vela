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

  // Home / Shop link
  if (shopDetails?.slug) {
    breadcrumbs.push({ label: shopDetails.shop_name, path: `/shop/${shopDetails.slug}` });
  } else {
    breadcrumbs.push({ label: 'Shop', path: `/shop/${shopSlug}` });
  }

  // Add other segments based on current path
  const pathSegments = location.pathname.split('/').filter(segment => segment && segment !== 'shop' && segment !== shopSlug);

  pathSegments.forEach((segment, index) => {
    const currentPath = `/${['shop', shopSlug, ...pathSegments.slice(0, index + 1)].join('/')}`;
    let label = segment.replace(/-/g, ' ');

    // Special handling for product detail page
    if (segment === productId && productId) {
      const product = products.find(p => p.id === productId);
      if (product) {
        label = product.name;
      }
      // The previous segment was 'products', so we need to ensure it's correctly labeled and linked
      if (pathSegments[index - 1] === 'products') {
        breadcrumbs.push({ label: 'Products', path: `/shop/${shopSlug}/products` });
      }
    } else if (segment === 'products') { // Corrected: Link to /products
      label = 'Products';
    } else if (segment === 'cart') {
      label = 'Cart';
    } else if (segment === 'checkout') {
      label = 'Checkout';
    } else if (segment === 'order-tracking') {
      label = 'Order Tracking';
    }

    // Only add if not already added by special handling (e.g., 'Products' before product name)
    if (!breadcrumbs.some(b => b.path === currentPath)) {
      breadcrumbs.push({ label: label.charAt(0).toUpperCase() + label.slice(1), path: currentPath });
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