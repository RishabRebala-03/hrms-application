import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

function normalizeOption(option) {
  if (typeof option === "string" || typeof option === "number") {
    return { value: String(option), label: String(option) };
  }

  return {
    value: String(option.value ?? ""),
    label: option.label ?? String(option.value ?? ""),
    description: option.description,
  };
}

export default function ValueHelpSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select value",
  searchPlaceholder = "Search available options",
  className = "",
  disabled = false,
  style,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const normalizedOptions = useMemo(() => options.map(normalizeOption), [options]);
  const selected = normalizedOptions.find((option) => option.value === String(value ?? ""));

  const filteredOptions = useMemo(() => {
    const nextQuery = query.trim().toLowerCase();
    if (!nextQuery) return normalizedOptions;

    return normalizedOptions.filter((option) =>
      [option.label, option.description, option.value]
        .filter(Boolean)
        .some((part) => String(part).toLowerCase().includes(nextQuery))
    );
  }, [normalizedOptions, query]);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => searchRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelect = (nextValue) => {
    onChange?.(nextValue);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className={`value-help ${className}`} ref={rootRef} style={style}>
      <button
        type="button"
        className="value-help-trigger input"
        onClick={() => !disabled && setOpen((previous) => !previous)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? "value-help-label" : "value-help-placeholder"}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={16} />
      </button>

      {open ? (
        <div className="value-help-popover">
          <div className="value-help-search">
            <Search size={15} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                <X size={14} />
              </button>
            ) : null}
          </div>

          <div className="value-help-list" role="listbox">
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const isSelected = option.value === String(value ?? "");
                return (
                  <button
                    type="button"
                    key={option.value}
                    className={`value-help-option ${isSelected ? "is-selected" : ""}`}
                    onClick={() => handleSelect(option.value)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span>
                      <strong>{option.label}</strong>
                      {option.description ? <small>{option.description}</small> : null}
                    </span>
                    {isSelected ? <Check size={16} /> : null}
                  </button>
                );
              })
            ) : (
              <div className="value-help-empty">No matching options</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
