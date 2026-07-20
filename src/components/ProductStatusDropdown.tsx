import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Archive, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { productStatusTone, toneText } from "@/lib/status";
import { useTranslation } from 'react-i18next';

type ProductStatus = 'Active' | 'Draft' | 'Out of Stock';

interface ProductStatusDropdownProps {
  currentStatus: ProductStatus;
  onStatusChange: (newStatus: ProductStatus) => void;
}

// Icon + label per status; colour is derived from the canonical
// productStatusTone() so the trigger matches the StatusBadge used in the table
// and the filter rail (single source of truth — no drifting raw palette).
const STATUS_META: Record<ProductStatus, { icon: React.ElementType; label: string }> = {
  'Active': { icon: CheckCircle, label: "Active" },
  'Draft': { icon: XCircle, label: "Draft" },
  'Out of Stock': { icon: Archive, label: "Out of Stock" },
};

const STATUS_ORDER: ProductStatus[] = ['Active', 'Draft', 'Out of Stock'];

export const ProductStatusDropdown = ({ currentStatus, onStatusChange }: ProductStatusDropdownProps) => {
  const { t } = useTranslation();
  const statusLabel = (value: string) => t('status_labels.' + value.toLowerCase().replace(/\s+/g, '_'), { defaultValue: value });
  const meta = STATUS_META[currentStatus] || STATUS_META['Draft'];
  const CurrentIcon = meta.icon;
  const currentColor = toneText[productStatusTone(currentStatus)];

  const handleSelect = (e: React.MouseEvent, status: ProductStatus) => {
    e.stopPropagation();
    onStatusChange(status);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm" className={cn("h-7 gap-1 px-1.5 text-xs font-semibold hover:bg-accent", currentColor)}>
          <CurrentIcon className="h-3.5 w-3.5" />
          {statusLabel(meta.label)}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {STATUS_ORDER.map((status) => {
          const { icon: Icon, label } = STATUS_META[status];
          return (
            <DropdownMenuItem
              key={status}
              className={cn("flex items-center gap-2", { "bg-accent": currentStatus === status })}
              onClick={(e) => handleSelect(e as any, status)}
            >
              <Icon className={cn("h-4 w-4", toneText[productStatusTone(status)])} />
              <span>{statusLabel(label)}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
