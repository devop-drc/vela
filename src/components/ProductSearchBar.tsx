import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ListFilter, ArrowUpNarrowWide } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface ProductSearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sortOption: string;
  setSortOption: (option: string) => void;
}

export const ProductSearchBar: React.FC<ProductSearchBarProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  sortOption,
  setSortOption,
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 p-4 border-b flex-shrink-0">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('products.search_placeholder')}
          className="pl-10 h-10 px-3 py-2"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[150px] h-10 px-3 py-2">
          <ListFilter className="mr-2 h-4 w-4" />
          <SelectValue placeholder={t('products.status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">{t('products_ui.all_statuses')}</SelectItem>
          <SelectItem value="Active">{t('status_labels.active', { defaultValue: 'Active' })}</SelectItem>
          <SelectItem value="Draft">{t('status_labels.draft', { defaultValue: 'Draft' })}</SelectItem>
          <SelectItem value="Out of Stock">{t('status_labels.out_of_stock', { defaultValue: 'Out of Stock' })}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortOption} onValueChange={setSortOption}>
        <SelectTrigger className="w-[180px] h-10 px-3 py-2">
          <ArrowUpNarrowWide className="mr-2 h-4 w-4" />
          <SelectValue placeholder={t('products_ui.sort_by')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">{t('products.newest')}</SelectItem>
          <SelectItem value="oldest">{t('products.oldest')}</SelectItem>
          <SelectItem value="price-asc">{t('products.price_low_high')}</SelectItem>
          <SelectItem value="price-desc">{t('products.price_high_low')}</SelectItem>
          <SelectItem value="name-asc">{t('products.name_az')}</SelectItem>
          <SelectItem value="name-desc">{t('products.name_za')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};