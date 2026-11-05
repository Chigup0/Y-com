"use client";
// OWNER: Agent B. Text input with company typeahead from GET /api/suggest (Company Autocomplete, free).
import { useEffect, useId, useState } from "react";

export function CompanyInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const q = value.trim();
    if (!focused || q.length < 2) return;
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: ac.signal });
        const data = (await res.json()) as { suggestions?: string[] };
        setSuggestions((data.suggestions ?? []).slice(0, 8));
      } catch {
        /* typeahead is best-effort */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [value, focused]);

  return (
    <>
      <input
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        list={listId}
        autoComplete="off"
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  );
}
