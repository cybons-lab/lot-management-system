/**
 * SearchableSelect - A combobox-style select with search filtering
 *
 * Usage:
 * <SearchableSelect
 *   options={[{value: "1", label: "Option 1"}]}
 *   value={selectedValue}
 *   onChange={setValue}
 *   placeholder="Search..."
 * />
 */

import { ChevronDown, X, Search } from "lucide-react";
import { useState, useRef, useEffect } from "react";

import { cn } from "@/shared/libs/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "選択...",
  className,
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Get selected option label
  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchTerm("");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <div
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm",
          "focus-within:border-primary focus-within:ring-primary focus-within:ring-1",
          disabled && "cursor-not-allowed opacity-50",
          isOpen && "border-primary ring-primary ring-1",
        )}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
      >
        {isOpen ? (
          <div className="flex flex-1 items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent outline-none placeholder:text-slate-400"
              placeholder={placeholder}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ) : (
          <span className={cn("truncate", !selectedOption && "text-slate-400")}>
            {selectedOption?.label || placeholder}
          </span>
        )}

        <div className="flex items-center gap-1">
          {value && !isOpen && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-0.5 hover:bg-slate-100"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
          <ChevronDown
            className={cn("h-4 w-4 text-slate-400 transition-transform", isOpen && "rotate-180")}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">該当なし</div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm hover:bg-slate-100",
                  option.value === value && "bg-primary/10 text-primary",
                )}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
