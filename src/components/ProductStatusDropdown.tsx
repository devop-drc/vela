import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Archive, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type ProductStatus = 'Active' | 'Draft' | 'Out of Stock';

interface ProductStatusDropdownProps {
  currentStatus: ProductStatus;
  onStatusChange: (newStatus: ProductStatus) => void;
}

const statusConfig = {
  'Active': { icon: CheckCircle, color: "text-emerald-600", label: "Active" },
  'Draft': { icon: XCircle, color: "text-amber-600", label: "Draft" },
  'Out of Stock': { icon: Archive, color: "text-slate-600", label: "Out of Stock" },
};

export const ProductStatusDropdown = ({ currentStatus, onStatusChange }: ProductStatusDropdownProps) => {
  const handleSelect = (e: React.MouseEvent, status: ProductStatus) => {
    e.stopPropagation();
    onStatusChange(status);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {Object.entries(statusConfig).map(([status, { icon: Icon, color, label }]) => (
          <DropdownMenuItem
            key={status}
            className={cn("flex items-center gap-2", { "bg-accent": currentStatus === status })}
            onClick={(e) => handleSelect(e as any, status as ProductStatus)}
          >
            <Icon className={cn("h-4 w-4", color)} />
            <span>{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};