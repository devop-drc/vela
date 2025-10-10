import * as React from "react";
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CreatableComboboxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CreatableCombobox = React.forwardRef<HTMLButtonElement, CreatableComboboxProps>(
  ({ options, value, onChange, placeholder = "Select...", disabled }, ref) => {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");

    const handleSelect = (currentValue: string) => {
      onChange(currentValue);
      setOpen(false);
      setInputValue("");
    };

    const filteredOptions = options.filter(option =>
      option.toLowerCase().includes(inputValue.toLowerCase())
    );

    const showCreateOption = inputValue && !options.some(option => option.toLowerCase() === inputValue.toLowerCase());

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            {value || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput
              placeholder="Search or create..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              {showCreateOption && (
                <CommandGroup>
                  <CommandItem
                    onSelect={() => handleSelect(inputValue)}
                    className="flex items-center gap-2 text-primary"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Create "{inputValue}"
                  </CommandItem>
                </CommandGroup>
              )}
              <CommandEmpty>
                {!showCreateOption && inputValue ? `No results for "${inputValue}".` : "No results found."}
              </CommandEmpty>
              {(filteredOptions.length > 0) && (
                <CommandGroup>
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={option}
                      value={option}
                      onSelect={() => handleSelect(option)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);
CreatableCombobox.displayName = "CreatableCombobox";