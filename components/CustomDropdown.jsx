import { useEffect, useRef, useState } from "react";

export default function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled = false,
  minWidth = "180px",
}) {
  const [open, setOpen] = useState(false);
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

  const selected = options.find(o => o.value === value);

  return (
    <div
      ref={ref}
      className={`dropdown ${disabled ? "disabled" : ""}`}
      style={{ minWidth }}
    >
      <div
        className="dropdown-trigger"
        onClick={() => !disabled && setOpen(!open)}
      >
        <span className={!selected ? "placeholder" : ""}>
          {selected?.label || placeholder}
        </span>
        <span className={`arrow ${open ? "open" : ""}`} />
      </div>

      {open && !disabled && (
        <ul className="dropdown-menu">
          {options.map(opt => (
            <li
              key={opt.value}
              className={opt.value === value ? "active" : ""}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
