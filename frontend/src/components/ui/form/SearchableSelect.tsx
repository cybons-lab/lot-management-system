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
import { useState, useRef, useEffect, useCallback } from "react";

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

/** Hook for managing dropdown open/close state */
function useDropdownState() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

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

  const close = useCallback(() => {
    setIsOpen(false);
    setSearchTerm("");
  }, []);

  return { isOpen, setIsOpen, searchTerm, setSearchTerm, containerRef, close };
}

/** Dropdown options list */
function OptionsList({
  options,
  selectedValue,
  onSelect,
}: {
  options: SelectOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
}) {
  if (options.length === 0) {
    return <div className="px-3 py-2 text-sm text-slate-500">該当なし</div>;
  }

  return (
    <>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            "w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-slate-100",
            option.value === selectedValue && "bg-primary/10 text-primary",
          )}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </button>
      ))}
    </>
  );
}

/** Clear button component */
function ClearButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick(e as unknown as React.MouseEvent)}
      className="rounded p-0.5 hover:bg-slate-100"
    >
      <X className="h-4 w-4 text-slate-400" />
    </span>
  );
}

/** Search input shown when dropdown is open */
function SearchInput({
  inputRef,
  searchTerm,
  setSearchTerm,
  placeholder,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  placeholder: string;
}) {
  return (
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
  );
}

function SearchableSelectTrigger({
  isOpen,
  disabled,
  value,
  selectedOptionLabel,
  placeholder,
  inputRef,
  searchTerm,
  setSearchTerm,
  onOpen,
  onClear,
}: {
  isOpen: boolean;
  disabled: boolean;
  value?: string;
  selectedOptionLabel?: string;
  placeholder: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  onOpen: () => void;
  onClear: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm",
        "focus-within:border-primary focus-within:ring-primary focus-within:ring-1",
        disabled && "cursor-not-allowed opacity-50",
        isOpen && "border-primary ring-primary ring-1",
      )}
      onClick={onOpen}
      disabled={disabled}
    >
      {isOpen ? (
        <SearchInput
          inputRef={inputRef}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder={placeholder}
        />
      ) : (
        <span className={cn("truncate", !selectedOptionLabel && "text-slate-400")}>
          {selectedOptionLabel || placeholder}
        </span>
      )}
      <div className="flex items-center gap-1">
        {value && !isOpen && <ClearButton onClick={onClear} />}
        <ChevronDown
          className={cn("h-4 w-4 text-slate-400 transition-transform", isOpen && "rotate-180")}
        />
      </div>
    </button>
  );
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "選択...",
  className,
  disabled = false,
}: SearchableSelectProps) {
  const { isOpen, setIsOpen, searchTerm, setSearchTerm, containerRef, close } = useDropdownState();
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    close();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchTerm("");
  };

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <SearchableSelectTrigger
        isOpen={isOpen}
        disabled={disabled}
        {...(value ? { value } : {})}
        {...(selectedOption?.label ? { selectedOptionLabel: selectedOption.label } : {})}
        placeholder={placeholder}
        inputRef={inputRef}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onOpen={handleOpen}
        onClear={handleClear}
      />

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          <OptionsList options={filteredOptions} {...(value ? { selectedValue: value } : {})} onSelect={handleSelect} />
        </div>
      )}
    </div>
  );
}
