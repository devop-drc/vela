import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { CheckCircle, XCircle, Trash2, X } from "lucide-react";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClear: () => void;
  onSetStatus: (status: 'Active' | 'Draft') => void;
  onDelete: () => void;
}

export const BulkActionsToolbar = ({ selectedCount, onClear, onSetStatus, onDelete }: BulkActionsToolbarProps) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 w-auto bg-background/80 backdrop-blur-lg border rounded-lg shadow-2xl z-40 p-2 flex items-center gap-2 md:gap-4"
    >
      <p className="text-sm font-medium px-2">{selectedCount} selected</p>
      <Button variant="outline" size="sm" onClick={() => onSetStatus('Active')}><CheckCircle className="mr-2 h-4 w-4" />Set to Active</Button>
      <Button variant="outline" size="sm" onClick={() => onSetStatus('Draft')}><XCircle className="mr-2 h-4 w-4" />Set to Draft</Button>
      <Button variant="destructive-outline" size="sm" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
      <Button variant="ghost" size="icon" onClick={onClear} className="h-8 w-8"><X className="h-4 w-4" /></Button>
    </motion.div>
  );
};