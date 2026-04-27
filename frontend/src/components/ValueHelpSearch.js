import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

const normalizeSuggestion = (suggestion) => {
  if (typeof suggestion === "string" || typeof suggestion === "number") {
    const label = String(suggestion);
    return { value: label, label };
  }

  const value = String(suggestion.value ?? suggestion.label ?? "");
  return {
    value,
    label: suggestion.label ?? value,
    description: suggestion.description,
  };
};

export default function ValueHelpSearch({
  value,
  onChange,
  suggestions = [],
  placeholder = "Search",
  className = "",
  style,
}) {
  const [open, setOpen] = useState(false);
  const [helpQuery, setHelpQuery] = useState("");
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const helpSearchRef = useRef(null);

  const normalizedSuggestions = useMemo(() => {
    const seen = new Set();
    return suggestions
      .map(normalizeSuggestion)
      .filter((suggestion) => {
        const key = suggestion.value.trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [suggestions]);

  const filteredSuggestions = useMemo(() => {
    const query = helpQuery.trim().toLowerCase();
    const source = query
      ? normalizedSuggestions.filter((suggestion) =>
          [suggestion.label, suggestion.description, suggestion.value]
            .filter(Boolean)
            .some((part) => String(part).toLowerCase().includes(query))
        )
      : normalizedSuggestions;

    return source.slice(0, 12);
  }, [helpQuery, normalizedSuggestions]);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => helpSearchRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handlePick = (suggestion) => {
    onChange?.(suggestion.value);
    setOpen(false);
    setHelpQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className={`value-help-search-field ${className}`} ref={rootRef} style={style}>
      <Search size={16} />
      <input
        ref={inputRef}
        className="input"
        value={value}
        onChange={(event) => {
          onChange?.(event.target.value);
          setHelpQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setHelpQuery("");
          setOpen(true);
        }}
        placeholder={placeholder}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange?.("");
            setHelpQuery("");
            setOpen(true);
          }}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      ) : null}

      {open ? (
        <div className="value-help-popover value-help-search-popover">
          <div className="value-help-search">
            <Search size={15} />
            <input
              ref={helpSearchRef}
              value={helpQuery}
              onChange={(event) => setHelpQuery(event.target.value)}
              placeholder="Search available values"
            />
            {helpQuery ? (
              <button type="button" onClick={() => setHelpQuery("")} aria-label="Clear value help search">
                <X size={14} />
              </button>
            ) : null}
          </div>

          <div className="value-help-list" role="listbox">
            {filteredSuggestions.length ? (
              filteredSuggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion.value}
                  className={`value-help-option ${suggestion.value === value ? "is-selected" : ""}`}
                  onClick={() => handlePick(suggestion)}
                  role="option"
                  aria-selected={suggestion.value === value}
                >
                  <span>
                    <strong>{suggestion.label}</strong>
                    {suggestion.description ? <small>{suggestion.description}</small> : null}
                  </span>
                </button>
              ))
            ) : (
              <div className="value-help-empty">No matching values</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
