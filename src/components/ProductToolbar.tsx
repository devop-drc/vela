import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Search, ListFilter, LayoutGrid, List, CheckSquare, Minus, Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Slider } from "@/components/ui/slider";

interface ProductToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortOption: string;
  onSortChange: (value: string) => void;
  statusFilter: string[];
  onStatusFilterChange: (statuses: string[]) => void;
  viewMode: 'grid' | 'table';
  onViewChange: (view: 'grid' | 'table') => void;
  isSelectionModeActive: boolean;
  onToggleSelectionMode: () => void;
  gridCols: number;
  onGridColsChange: (value: number) => void;
}

export const ProductToolbar = ({ searchTerm, onSearchChange, sortOption, onSortChange, statusFilter, onStatusFilterChange, viewMode, onViewChange, isSelectionModeActive, onToggleSelectionMode, gridCols, onGridColsChange }: ProductToolbarProps) => {
  const isMobile = useIsMobile();

  const handleStatusChange = (status: 'Active' | 'Draft' | 'Out of Stock') => {
    const newFilter = statusFilter.includes(status)
      ? statusFilter.filter(s => s !== status)
      : [...statusFilter, status];
    onStatusFilterChange(newFilter);
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="relative w-full md:flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2 w-full md:w-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto justify-start">
              <ListFilter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={statusFilter.includes('Active')} onCheckedChange={() => handleStatusChange('Active')}>Active</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={statusFilter.includes('Draft')} onCheckedChange={() => handleStatusChange('Draft')}>Draft</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={statusFilter.includes('Out of Stock')} onCheckedChange={() => handleStatusChange('Out of Stock')}>Out of Stock</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Select value={sortOption} onValueChange={onSortChange}>
          <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="price-asc">Price: Low to High</SelectItem>
            <SelectItem value="price-desc">Price: High to Low</SelectItem>
            <SelectItem value="name-asc">Name: A-Z</SelectItem>
            <SelectItem value="name-desc">Name: Z-A</SelectItem>
          </SelectContent>
        </Select>
        {!isMobile && (
          <>
            {viewMode === 'grid' && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => onGridColsChange(Math.max(2, gridCols - 1))}><Minus className="h-4 w-4" /></Button>
                <Slider value={[gridCols]} onValueChange={(value) => onGridColsChange(value[0])} min={2} max={8} step={1} className="w-24" />
                <Button variant="outline" size="icon" onClick={() => onGridColsChange(Math.min(8, gridCols + 1))}><Plus className="h-4 w-4" /></Button>
              </div>
            )}
            <Button variant="outline" size="icon" onClick={() => onViewChange(viewMode === 'grid' ? 'table' : 'grid')} className="w-10 h-10 flex-shrink-0">
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </Button>
            <Button variant={isSelectionModeActive ? "secondary" : "outline"} onClick={onToggleSelectionMode}>
              <CheckSquare className="mr-2 h-4 w-4" />
              {isSelectionModeActive ? 'Cancel' : 'Select'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};