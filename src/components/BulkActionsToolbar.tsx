import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { CheckCircle, XCircle, Trash2, X, Archive, Percent, Instagram } from "lucide-react";
import { useTranslation } from 'react-i18next';

type ProductStatus = 'Active' | 'Draft' | 'Out of Stock';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClear: () => void;
  onSetStatus: (status: ProductStatus) => void;
  onDelete: () => void;
  onAddSale: () => void;
  /** Products in the selection not yet on Instagram; shows the publish action. */
  unpostedCount?: number;
  onBulkPublish?: () => void;
}

export const BulkActionsToolbar = ({ selectedCount, onClear, onSetStatus, onDelete, onAddSale, unpostedCount = 0, onBulkPublish }: BulkActionsToolbarProps) => {
  const { t } = useTranslation();
  return (
    <motion.div
      // Keep x pinned at -50% throughout so framer's transform doesn't clobber
      // the horizontal centering while it animates y/opacity.
      initial={{ x: "-50%", y: 100, opacity: 0 }}
      animate={{ x: "-50%", y: 0, opacity: 1 }}
      exit={{ x: "-50%", y: 100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-6 left-1/2 z-[60] flex w-max max-w-[calc(100vw-2rem)] items-center gap-2 overflow-x-auto rounded-xl border bg-background/80 p-2 shadow-2xl backdrop-blur-[20px] md:gap-3"
    >
      <p className="text-sm font-medium px-2">{t('products_ui.selected_count', { count: selectedCount })}</p>
      <Button variant="outline" size="sm" onClick={() => onSetStatus('Active')} className="text-success border-success/40 hover:bg-success/10 hover:text-success"><CheckCircle className="mr-2 h-4 w-4" />{t('products_ui.set_active')}</Button>
      <Button variant="outline" size="sm" onClick={() => onSetStatus('Draft')} className="text-warning border-warning/40 hover:bg-warning/10 hover:text-warning"><XCircle className="mr-2 h-4 w-4" />{t('products_ui.set_draft')}</Button>
      <Button variant="outline" size="sm" onClick={() => onSetStatus('Out of Stock')} className="text-muted-foreground border-border hover:bg-muted hover:text-foreground"><Archive className="mr-2 h-4 w-4" />{t('products_ui.set_out_of_stock')}</Button>
      <Button variant="outline" size="sm" onClick={onAddSale}><Percent className="mr-2 h-4 w-4" />{t('products_ui.add_sale')}</Button>
      {unpostedCount > 0 && onBulkPublish && (
        <Button variant="outline" size="sm" onClick={onBulkPublish} className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary">
          <Instagram className="mr-2 h-4 w-4" />{t('bulk_publish.action', { count: unpostedCount })}
        </Button>
      )}
      <Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" />{t('common.delete')}</Button>
      <Button variant="ghost" size="icon" onClick={onClear} className="h-8 w-8"><X className="h-4 w-4" /></Button>
    </motion.div>
  );
};