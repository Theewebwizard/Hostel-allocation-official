import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown } from "lucide-react";

interface Option {
  id: string | number;
  label: string;
  subLabel?: string;
  data?: any;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  label,
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opt.subLabel?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          {label}
        </label>
      )}
      <div
        className={`relative w-full px-4 py-2 border rounded-lg cursor-pointer bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600 transition-colors flex items-center justify-between ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="truncate flex-1">
          {selectedOption ? (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {selectedOption.label}
              </span>
              {selectedOption.subLabel && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedOption.subLabel}
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                autoFocus
                className="w-full pl-8 pr-4 py-1.5 text-sm bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white border-none rounded-md focus:ring-0"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  className={`px-4 py-2 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors ${
                    opt.id === value
                      ? "bg-indigo-50 dark:bg-indigo-900/20"
                      : ""
                  }`}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {opt.label}
                    </span>
                    {opt.subLabel && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {opt.subLabel}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-400 font-medium">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
