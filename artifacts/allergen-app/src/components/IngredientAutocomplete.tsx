import { useState, useRef, useEffect, useCallback } from "react";
import { useIngredients } from "@/contexts/IngredientsContext";
import type { AllergenItem } from "@/lib/ingredient-store";

interface Props {
  value: string;
  onSelect: (item: AllergenItem | null) => void;
  onChange: (name: string) => void;
  rowIndex: number;
}

export default function IngredientAutocomplete({ value, onSelect, onChange, rowIndex }: Props) {
  const { search } = useIngredients();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [suggestions, setSuggestions] = useState<AllergenItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (open && query.trim().length > 0) {
      setSuggestions(search(query).slice(0, 50));
    } else {
      setSuggestions([]);
    }
  }, [open, query, search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    if (v.trim().length > 0) {
      setOpen(true);
      setHighlighted(0);
    } else {
      setOpen(false);
      onSelect(null);
    }
  };

  const handleSelect = useCallback(
    (item: AllergenItem) => {
      setQuery(item.name);
      setOpen(false);
      onSelect(item);
    },
    [onSelect]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[highlighted]) {
        handleSelect(suggestions[highlighted]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Texte imprimable — visible uniquement à l'impression, peut passer à la ligne */}
      <span
        className="hidden print:block text-[7pt] leading-tight px-[1pt]"
        style={{ color: "#1f355e", wordBreak: "break-word", whiteSpace: "normal" }}
        aria-hidden="true"
      >
        {query}
      </span>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (query.trim().length > 0) setOpen(true);
        }}
        className="w-full bg-transparent text-xs py-0.5 px-1 outline-none focus:bg-accent/30 rounded transition-colors print:hidden"
        placeholder="Rechercher un ingrédient..."
        autoComplete="off"
        data-testid={`input-ingredient-${rowIndex}`}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-50 w-80 max-h-48 overflow-y-auto bg-popover border border-popover-border rounded-md shadow-lg mt-0.5">
          {suggestions.map((item, idx) => (
            <button
              key={item.id}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors ${
                idx === highlighted ? "bg-accent text-accent-foreground" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(item);
              }}
              data-testid={`suggestion-${rowIndex}-${item.id}`}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
