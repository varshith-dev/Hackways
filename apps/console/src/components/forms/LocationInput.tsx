"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./LocationInput.module.css";

interface Suggestion {
  label: string;
  lat: number;
  lon: number;
}

export interface LocationInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function LocationInput({ id, value, onChange, placeholder }: LocationInputProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function handleChange(next: string) {
    onChange(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = next.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/geocode?q=${encodeURIComponent(query)}`);
        const data: { results: Suggestion[] } = await res.json();
        setSuggestions(data.results || []);
        setOpen((data.results || []).length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, 400);
  }

  function pick(s: Suggestion) {
    onChange(s.label);
    setOpen(false);
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <input
        id={id}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className={styles.list} role="listbox">
          {suggestions.map((s) => (
            <button
              key={`${s.lat},${s.lon}`}
              type="button"
              className={styles.item}
              onClick={() => pick(s)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
