/**
 * Canonical search field — the premium pill used across list pages (Products,
 * Orders, …). Icon + input + optional clear button + optional ⌘K hint.
 * Controlled: pass `value` + `onValueChange`.
 */
import * as React from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onValueChange: (value: string) => void;
  /** Show a ⌘K / Ctrl-K affordance on the right. */
  shortcutHint?: boolean;
  containerClassName?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onValueChange,
      placeholder,
      shortcutHint,
      className,
      containerClassName,
      ...props
    },
    ref,
  ) => {
    const { t } = useTranslation();
    return (
      <div
        className={cn(
          "group relative flex h-9 items-center rounded-full border border-input bg-background/60 pl-3 pr-1.5 shadow-sm transition-colors focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/20",
          containerClassName,
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none",
            className,
          )}
          {...props}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onValueChange("")}
            aria-label={t('app_ui.clear_search')}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : shortcutHint ? (
          <kbd className="pointer-events-none mr-1 hidden shrink-0 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
            ⌘K
          </kbd>
        ) : null}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";

export default SearchInput;
