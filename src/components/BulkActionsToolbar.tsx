import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { CheckCircle, XCircle, Trash2, X, Archive, Percent } from "lucide-react";

type ProductStatus = 'Active' | 'Draft' | 'Out of Stock';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClear: () => void;
  onSetStatus: (status: ProductStatus) => void;
  onDelete: () => void;
  onAddSale: () => void;
}

export const BulkActionsToolbar = ({ selectedCount, onClear, onSetStatus, onDelete, onAddSale }: BulkActionsToolbarProps) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto bg-background/80 backdrop-blur-[20px] border rounded-lg shadow-2xl z-40 p-2 flex items-center gap-2 md:gap-4"
    >
      <p className="text-sm font-medium px-2">{selectedCount} selected</p>
      <Button variant="outline" size="sm" onClick={() => onSetStatus('Active')} className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"><CheckCircle className="mr-2 h-4 w-4" />Set Active</Button>
      <Button variant="outline" size="sm" onClick={() => onSetStatus('Draft')} className="text-amber-600 border-amber-300 hover:bg-amber-50 hover:text-amber-700"><XCircle className="mr-2 h-4 w-4" />Set Draft</Button>
      <Button variant="outline" size="sm" onClick={() => onSetStatus('Out of Stock')} className="text-slate-600 border-slate-300 hover:bg-slate-50 hover:text-slate-700"><Archive className="mr-2 h-4 w-4" />Set Out of Stock</Button>
      <Button variant="outline" size="sm" onClick={onAddSale}><Percent className="mr-2 h-4 w-4" />Add Sale</Button>
      <Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
      <Button variant="ghost" size="icon" onClick={onClear} className="h-8 w-8"><X className="h-4 w-4" /></Button>
    </motion.div>
  );
};