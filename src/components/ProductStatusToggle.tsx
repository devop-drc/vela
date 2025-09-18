import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

type ProductStatus = 'Active' | 'Draft' | 'Out of Stock';

interface ProductStatusToggleProps {
  currentStatus: ProductStatus;
  onStatusChange: (newStatus: ProductStatus) => void;
}

const statusCycle: ProductStatus[] = ['Draft', 'Active', 'Out of Stock'];

const statusConfig = {
  'Active': { icon: CheckCircle, color: "text-emerald-600 hover:text-emerald-700", label: "Active" },
  'Draft': { icon: XCircle, color: "text-amber-600 hover:text-amber-700", label: "Draft" },
  'Out of Stock': { icon: Archive, color: "text-slate-600 hover:text-slate-700", label: "Out of Stock" },
};

export const ProductStatusToggle = ({ currentStatus, onStatusChange }: ProductStatusToggleProps) => {
  const CurrentIcon = statusConfig[currentStatus]?.icon || XCircle;
  const currentColor = statusConfig[currentStatus]?.color || "text-amber-600";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when changing status
    const currentIndex = statusCycle.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    onStatusChange(statusCycle[nextIndex]);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} className={cn("font-semibold", currentColor)}>
      <CurrentIcon className="mr-2 h-4 w-4" />
      {statusConfig[currentStatus]?.label || 'Draft'}
    </Button>
  );
};