"use client"
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled = false,
  className,
  searchable = false
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const ref = useRef(null);

  // close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reset search when closed
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const selected = options.find(o => o.value === value);

  const filteredOptions = searchable
    ? options.filter(opt =>
      opt.label && opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : options;

  return (
    <div
      ref={ref}
      className={cn("relative w-full min-w-[180px]", className, disabled && "opacity-50 pointer-events-none")}
    >
      <div
        className={cn(
          "flex items-center justify-between w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-md cursor-pointer transition-all hover:border-neutral-300",
          open && "ring-1 ring-neutral-900 border-neutral-900"
        )}
        onClick={() => !disabled && setOpen(!open)}
      >
        <span className={cn("text-sm", !selected ? "text-neutral-500" : "text-neutral-900 font-medium whitespace-nowrap overflow-hidden text-ellipsis")}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={16} className={cn("text-neutral-400 transition-transform duration-200 ml-2 shrink-0", open && "rotate-180")} />
      </div>

      {open && !disabled && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {searchable && (
            <div className="p-2 border-b border-gray-100 bg-gray-50/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:border-neutral-400 text-neutral-700 placeholder:text-gray-400"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            </div>
          )}
          <ul className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <li
                  key={opt.value}
                  className={cn(
                    "px-3 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-neutral-50 transition-colors",
                    opt.value === value && "bg-neutral-50 font-medium text-neutral-900"
                  )}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.value === value && <Check size={14} className="text-neutral-900" />}
                </li>
              ))
            ) : (
              <li className="px-3 py-3 text-xs text-center text-gray-400">
                No results found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
