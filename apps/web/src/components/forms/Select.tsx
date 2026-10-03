"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import styles from "./Select.module.css";

export interface SelectOption {
  id: string;
  label: string;
  supportingText?: string;
}

export interface SelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** An extra row pinned below a divider at the bottom of the list, e.g. "+ Create new…". */
  extraAction?: { label: string; onClick: () => void };
}

/**
 * A styled dropdown that replaces the browser's native <select> chrome, built to match
 * this app's own design system rather than pulling in a separate component library.
 * Reusable anywhere a single-select field is needed.
 */
export default function Select({ id, value, onChange, options, placeholder = "Select…", extraAction }: SelectProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const selected = options.find((o) => o.id === value) || null;
  const rowCount = options.length + (extraAction ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function openPanel() {
    const idx = Math.max(0, options.findIndex((o) => o.id === value));
    setHighlighted(idx);
    setOpen(true);
  }

  function choose(index: number) {
    if (index < options.length) {
      onChange(options[index].id);
      setOpen(false);
    } else if (extraAction) {
      extraAction.onClick();
      setOpen(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openPanel();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(rowCount - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(highlighted);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        id={id}
        className={styles.trigger}
        data-empty={!selected}
        data-open={open}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={onKeyDown}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={16} className={styles.chevron} />
      </button>

      {open && (
        <div className={styles.panel} role="listbox">
          {options.map((o, i) => (
            <div
              key={o.id}
              role="option"
              aria-selected={o.id === value}
              tabIndex={-1}
              className={styles.option}
              data-highlighted={i === highlighted}
              data-selected={o.id === value}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => choose(i)}
            >
              <span className={styles.optionText}>
                <span className={styles.optionLabel}>{o.label}</span>
                {o.supportingText && <span className={styles.optionSupport}>{o.supportingText}</span>}
              </span>
              {o.id === value && <Check size={15} className={styles.check} />}
            </div>
          ))}
          {extraAction && (
            <>
              <div className={styles.divider} />
              <div
                role="option"
                aria-selected={false}
                tabIndex={-1}
                className={styles.option}
                data-highlighted={highlighted === options.length}
                onMouseEnter={() => setHighlighted(options.length)}
                onClick={() => choose(options.length)}
              >
                <span className={styles.optionText}>
                  <span className={styles.optionLabel}>{extraAction.label}</span>
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
