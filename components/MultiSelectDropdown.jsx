"use client"
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MultiSelectDropdown({
    value = [], // Array of selected values
    onChange, // Returns array of selected values
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

    const toggleOption = (optValue) => {
        if (value.includes(optValue)) {
            onChange(value.filter(v => v !== optValue));
        } else {
            onChange([...value, optValue]);
        }
    };

    const selectAll = () => {
        const allValues = options.map(o => o.value);
        if (value.length === allValues.length) {
            onChange([]); // Deselect all
        } else {
            onChange(allValues);
        }
    };

    const filteredOptions = searchable
        ? options.filter(opt =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : options;

    const getDisplayText = () => {
        if (!value || value.length === 0) return placeholder;
        if (value.length === options.length) return "All Selected";
        if (value.length === 1) {
            const selectedOption = options.find(o => o.value === value[0]);
            return selectedOption ? selectedOption.label : value[0];
        }
        return `${value.length} Selected`;
    };

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
                <span className={cn("text-sm", value.length === 0 ? "text-neutral-500" : "text-neutral-900 font-medium whitespace-nowrap overflow-hidden text-ellipsis")}>
                    {getDisplayText()}
                </span>
                <ChevronDown size={16} className={cn("text-neutral-400 transition-transform duration-200 ml-2 shrink-0", open && "rotate-180")} />
            </div>

            {open && !disabled && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-gray-100 bg-gray-50/50 space-y-2">
                        {searchable && (
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
                        )}
                        <div
                            className="text-xs font-medium text-blue-600 cursor-pointer hover:underline px-1"
                            onClick={() => selectAll()}
                        >
                            {value.length === options.length ? "Deselect All" : "Select All"}
                        </div>
                    </div>

                    <ul className="max-h-60 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => {
                                const isSelected = value.includes(opt.value);
                                return (
                                    <li
                                        key={opt.value}
                                        className={cn(
                                            "px-3 py-2 cursor-pointer text-sm flex items-center gap-3 hover:bg-neutral-50 transition-colors",
                                            isSelected && "bg-neutral-50/50"
                                        )}
                                        onClick={() => {
                                            toggleOption(opt.value);
                                        }}
                                    >
                                        <div className={cn(
                                            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                            isSelected ? "bg-neutral-900 border-neutral-900 text-white" : "border-gray-300 bg-white"
                                        )}>
                                            {isSelected && <Check size={10} strokeWidth={3} />}
                                        </div>
                                        <span className={cn("truncate", isSelected ? "font-medium text-neutral-900" : "text-neutral-700")}>{opt.label}</span>
                                    </li>
                                );
                            })
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
