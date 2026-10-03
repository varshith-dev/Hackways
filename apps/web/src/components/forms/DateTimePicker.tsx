"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./DateTimePicker.module.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function buildGrid(viewYear: number, viewMonth: number): { date: Date; outside: boolean }[] {
  const first = new Date(viewYear, viewMonth, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: { date: Date; outside: boolean }[] = [];

  for (let i = startOffset; i > 0; i--) {
    cells.push({ date: new Date(viewYear, viewMonth, 1 - i), outside: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(viewYear, viewMonth, day), outside: false });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last);
    next.setDate(next.getDate() + 1);
    cells.push({ date: next, outside: true });
  }
  return cells;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export interface DateTimePickerProps {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
}

export default function DateTimePicker({ id, value, onChange, placeholder = "Select date & time" }: DateTimePickerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const parsed = value ? new Date(value) : null;
  const validParsed = parsed && !isNaN(parsed.getTime()) ? parsed : null;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState((validParsed ?? new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState((validParsed ?? new Date()).getMonth());
  const [pendingDay, setPendingDay] = useState<Date | null>(validParsed);
  const [hour12, setHour12] = useState(() => {
    const base = validParsed ?? new Date();
    const h = base.getHours() % 12;
    return h === 0 ? 12 : h;
  });
  const [minute, setMinute] = useState((validParsed ?? new Date()).getMinutes());
  const [ampm, setAmpm] = useState<"AM" | "PM">((validParsed ?? new Date()).getHours() >= 12 ? "PM" : "AM");

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function openPanel() {
    const base = validParsed ?? new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setPendingDay(validParsed);
    const h = base.getHours() % 12;
    setHour12(h === 0 ? 12 : h);
    setMinute(base.getMinutes());
    setAmpm(base.getHours() >= 12 ? "PM" : "AM");
    setOpen(true);
  }

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  function save() {
    if (!pendingDay) return;
    let h = hour12 % 12;
    if (ampm === "PM") h += 12;
    const result = new Date(pendingDay.getFullYear(), pendingDay.getMonth(), pendingDay.getDate(), h, minute);
    onChange(result.toISOString());
    setOpen(false);
  }

  function dayKeyDown(e: KeyboardEvent<HTMLDivElement>, date: Date) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setPendingDay(date);
    }
  }

  const cells = buildGrid(viewYear, viewMonth);
  const today = new Date();
  const display = validParsed
    ? validParsed.toLocaleString(undefined, {
        weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
      })
    : "";

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button type="button" id={id} className={styles.trigger} data-empty={!display} onClick={openPanel}>
        {display || placeholder}
      </button>
      {open && <div className={styles.backdrop} onClick={() => setOpen(false)} aria-hidden="true" />}
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Choose date and time">
          <div className={styles.monthRow}>
            <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
              <ChevronLeft size={16} />
            </button>
            <strong>{MONTHS[viewMonth]} {viewYear}</strong>
            <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className={styles.weekRow}>
            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
          </div>

          <div className={styles.dayGrid}>
            {cells.map(({ date, outside }, i) => (
              <div
                key={i}
                role="button"
                tabIndex={0}
                className={styles.day}
                data-outside={outside}
                data-selected={!!pendingDay && isSameDay(date, pendingDay)}
                data-today={isSameDay(date, today)}
                onClick={() => setPendingDay(date)}
                onKeyDown={(e) => dayKeyDown(e, date)}
              >
                {date.getDate()}
              </div>
            ))}
          </div>

          <div className={styles.timeRow}>
            <div className={styles.timeField}>
              <input
                type="number"
                min={1}
                max={12}
                value={hour12}
                onChange={(e) => setHour12(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
                aria-label="Hour"
              />
            </div>
            <span className={styles.timeSep}>:</span>
            <div className={styles.timeField}>
              <input
                type="number"
                min={0}
                max={59}
                value={minute.toString().padStart(2, "0")}
                onChange={(e) => setMinute(Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
                aria-label="Minute"
              />
            </div>
            <div className={styles.ampm}>
              <button type="button" data-active={ampm === "AM"} onClick={() => setAmpm("AM")}>AM</button>
              <button type="button" data-active={ampm === "PM"} onClick={() => setAmpm("PM")}>PM</button>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className={styles.save} onClick={save} disabled={!pendingDay}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
