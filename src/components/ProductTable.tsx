import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";
import { StatusBadge } from "@/components/ui-app/StatusBadge";
import { productStatusTone } from "@/lib/status";
import { Product } from "@/hooks/useProductData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from 'react-i18next';

interface ProductTableProps {
  isLoading: boolean;
  filteredAndSortedProducts: Product[];
  currentSelection: string[];
  handleSelectOne: (productId: string) => void;
  handleSelectAll: (checked: boolean) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  isLoading,
  filteredAndSortedProducts,
  currentSelection,
  handleSelectOne,
  handleSelectAll,
}) => {
  const { t } = useTranslation();
  const { shopDetails, convertCurrency } = useShop();

  return (
    <ScrollArea className="flex-1">
      {isLoading ? (
        <div className="p-4 space-y-2">
          <Spinner className="h-8 w-8 mx-auto" />
          <p className="text-center text-muted-foreground">{t('products_ui.loading_products')}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={currentSelection.length === filteredAndSortedProducts.length && filteredAndSortedProducts.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  aria-label={t('products_ui.select_all_products')}
                />
              </TableHead>
              <TableHead className="w-[80px]">{t('products_ui.image')}</TableHead>
              <TableHead>{t('products_ui.name')}</TableHead>
              <TableHead>{t('products.status')}</TableHead>
              <TableHead>{t('products_ui.price')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedProducts.length > 0 ? (
              filteredAndSortedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox
                      checked={currentSelection.includes(product.id)}
                      onCheckedChange={() => handleSelectOne(product.id)}
                      aria-label={t('products_ui.select_product_aria', { name: product.name })}
                    />
                  </TableCell>
                  <TableCell>
                    <img src={product.media_url} alt={product.name} className="h-12 w-12 object-cover rounded-md bg-muted" referrerPolicy="no-referrer" loading="lazy" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <StatusBadge tone={productStatusTone(product.status)} size="sm">
                      {t('status_labels.' + product.status.toLowerCase().replace(/\s+/g, '_'), { defaultValue: product.status })}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    {product.price != null ? (
                      formatCurrency(convertCurrency(product.price, product.currency), shopDetails?.currency)
                    ) : (
                      <span className="text-muted-foreground">{t('products_ui.not_applicable')}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {t('products_ui.no_products_found')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </ScrollArea>
  );
};