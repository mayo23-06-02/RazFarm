"use client";

import { useEffect, useRef, useState } from "react";
import { TbCalendar, TbChevronLeft, TbChevronRight } from "react-icons/tb";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/formatDate";

function useOutsideClose(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function Calendar({
  month,
  onMonthChange,
  isSelected,
  isInRange,
  onPick,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  isSelected: (d: Date) => boolean;
  isInRange?: (d: Date) => boolean;
  onPick: (d: Date) => void;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const startOffset = first.getDay();
  const total = daysInMonth(year, m);
  const cells = [...Array(startOffset).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];

  return (
    <div className="w-64">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, m - 1, 1))}
          className="rounded-ctrl p-1.5 text-ink-500 hover:bg-paper-100"
        >
          <TbChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-medium text-ink-900">
          {month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, m + 1, 1))}
          className="rounded-ctrl p-1.5 text-ink-500 hover:bg-paper-100"
        >
          <TbChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs text-ink-400">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {cells.map((day, i) => {
          if (day === null) return <span key={i} />;
          const date = new Date(year, m, day);
          const selected = isSelected(date);
          const inRange = isInRange?.(date);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(date)}
              className={cn(
                "mx-auto flex size-8 items-center justify-center rounded-pill transition-colors duration-150",
                selected
                  ? "bg-brand-500 text-white"
                  : inRange
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-700 hover:bg-paper-100"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = "Select date", className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value ?? new Date());
  const [selected, setSelected] = useState<Date | undefined>(value);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, () => setOpen(false));

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center gap-2 rounded-ctrl border border-paper-200 bg-paper-0 px-3 text-sm transition-colors duration-150 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      >
        <TbCalendar className="size-4 shrink-0 text-ink-400" />
        <span className={selected ? "text-ink-900" : "text-ink-400"}>
          {selected ? formatDate(selected) : placeholder}
        </span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 rounded-card border border-paper-200 bg-paper-0 p-3 shadow-modal">
          <Calendar
            month={month}
            onMonthChange={setMonth}
            isSelected={(d) => (selected ? isSameDay(d, selected) : false)}
            onPick={(d) => {
              setSelected(d);
              onChange?.(d);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

const PRESETS = ["This season", "Last season", "This month"];

export interface DateRangePickerProps {
  onChange?: (range: { start: Date; end: Date }) => void;
  className?: string;
}

export function DateRangePicker({ onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date());
  const [start, setStart] = useState<Date | undefined>();
  const [end, setEnd] = useState<Date | undefined>();
  const [preset, setPreset] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, () => setOpen(false));

  const pick = (d: Date) => {
    setPreset(null);
    if (!start || (start && end)) {
      setStart(d);
      setEnd(undefined);
    } else if (d < start) {
      setStart(d);
    } else {
      setEnd(d);
      onChange?.({ start, end: d });
      setOpen(false);
    }
  };

  const label =
    start && end
      ? `${formatDate(start)} – ${formatDate(end)}`
      : preset ?? "Select date range";

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center gap-2 rounded-ctrl border border-paper-200 bg-paper-0 px-3 text-sm transition-colors duration-150 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      >
        <TbCalendar className="size-4 shrink-0 text-ink-400" />
        <span className={start ? "text-ink-900" : "text-ink-400"}>{label}</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 flex gap-3 rounded-card border border-paper-200 bg-paper-0 p-3 shadow-modal">
          <div className="flex flex-col gap-1 border-r border-paper-200 pr-3">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPreset(p);
                  setStart(undefined);
                  setEnd(undefined);
                  setOpen(false);
                }}
                className="rounded-ctrl px-2.5 py-1.5 text-left text-sm text-ink-700 hover:bg-paper-100"
              >
                {p}
              </button>
            ))}
          </div>
          <Calendar
            month={month}
            onMonthChange={setMonth}
            isSelected={(d) => (start && isSameDay(d, start)) || (end !== undefined && isSameDay(d, end))}
            isInRange={(d) => !!start && !!end && d > start && d < end}
            onPick={pick}
          />
        </div>
      )}
    </div>
  );
}
