import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Plus, Trash2, X } from "lucide-react"; // Changed CheckCircle to Plus

interface OutOfStockActionsToolbarProps {
  selectedCount: number;
  onClear: () => void;
  onAddStock: () => void; // Renamed from onSetStatus
  onDelete: () => void;
}

export const OutOfStockActionsToolbar = ({ selectedCount, onClear, onAddStock, onDelete }: OutOfStockActionsToolbarProps) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto bg-background/80 backdrop-blur-[20px] border rounded-lg shadow-2xl z-40 p-2 flex items-center gap-2 md:gap-4"
    >
      <p className="text-sm font-medium px-2">{selectedCount} selected</p>
      <Button variant="outline" size="sm" onClick={onAddStock} className="text-blue-600 border-blue-300 hover:bg-blue-50 hover:text-blue-700">
        <Plus className="mr-2 h-4 w-4" /> {/* Changed icon to Plus */}
        Add Stock
      </Button>
      <Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
      <Button variant="ghost" size="icon" onClick={onClear} className="h-8 w-8"><X className="h-4 w-4" /></Button>
    </motion.div>
  );
};