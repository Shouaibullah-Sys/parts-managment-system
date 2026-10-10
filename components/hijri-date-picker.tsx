// components/hijri-date-picker.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { jalaaliMonthLength, toGregorian, toJalaali } from "jalaali-js";

// Afghan (Dari) Solar Hijri month names
const JALAALI_MONTHS = [
  "حمل",
  "ثور",
  "جوزا",
  "سرطان",
  "اسد",
  "سنبله",
  "میزان",
  "عقرب",
  "قوس",
  "جدی",
  "دلو",
  "حوت",
];

// Week starts on Sunday (matches date-fns startOfWeek and dashboard day order)
const WEEKDAYS = ["ی", "د", "س", "چ", "پ", "ج", "ش"];

const pad = (n: number) => String(n).padStart(2, "0");
// Persian digits WITHOUT grouping (toLocaleString would render ۱٬۴۰۵)
const faDigits = new Intl.NumberFormat("fa-IR", { useGrouping: false });
const fa = (n: number) => faDigits.format(n);

function isoToJalaali(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return toJalaali(y, m, d);
}

function jalaaliToIso(jy: number, jm: number, jd: number) {
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}

function currentIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Format a Gregorian ISO date as Solar Hijri (same as fa-IR table dates)
export function formatHijri(iso: string): string {
  if (!iso) return "";
  const { jy, jm, jd } = isoToJalaali(iso);
  return `${fa(jy)}/${fa(jm)}/${fa(jd)}`;
}

interface HijriDatePickerProps {
  /** Gregorian ISO date (yyyy-MM-dd) or "" */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function HijriDatePicker({
  value,
  onChange,
  placeholder = "انتخاب تاریخ",
  className,
  disabled,
}: HijriDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState("");
  const [view, setView] = useState(() => {
    const base = value || currentIso();
    const { jy, jm } = isoToJalaali(base);
    return { jy, jm };
  });

  useEffect(() => {
    setToday(currentIso());
  }, []);

  // Sync calendar view with selected value whenever the popover opens
  useEffect(() => {
    if (open) {
      const { jy, jm } = isoToJalaali(value || currentIso());
      setView({ jy, jm });
    }
  }, [open, value]);

  const goToMonth = (delta: number) => {
    setView(({ jy, jm }) => {
      let m = jm + delta;
      let y = jy;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
      if (m > 12) {
        m = 1;
        y += 1;
      }
      return { jy: y, jm: m };
    });
  };

  const monthDays = jalaaliMonthLength(view.jy, view.jm);
  const firstGregorian = toGregorian(view.jy, view.jm, 1);
  const startOffset = new Date(
    firstGregorian.gy,
    firstGregorian.gm - 1,
    firstGregorian.gd
  ).getDay(); // 0 = Sunday

  const selectDay = (jd: number) => {
    onChange(jalaaliToIso(view.jy, view.jm, jd));
    setOpen(false);
  };

  const selectToday = () => {
    const iso = currentIso();
    onChange(iso);
    const { jy, jm } = isoToJalaali(iso);
    setView({ jy, jm });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-36 justify-start gap-2 font-normal text-sm",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-70" />
          <span suppressHydrationWarning>
            {value ? formatHijri(value) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        {/* Month / year navigation */}
        <div className="mb-2 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => goToMonth(-1)}
            aria-label="ماه قبل"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">
            {JALAALI_MONTHS[view.jm - 1]} {fa(view.jy)}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => goToMonth(1)}
            aria-label="ماه بعد"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="grid h-7 w-8 place-items-center text-xs font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startOffset }, (_, i) => (
            <div key={`empty-${i}`} className="h-8 w-8" />
          ))}
          {Array.from({ length: monthDays }, (_, i) => {
            const jd = i + 1;
            const iso = jalaaliToIso(view.jy, view.jm, jd);
            const isSelected = iso === value;
            const isToday = today !== "" && iso === today;
            return (
              <button
                key={jd}
                type="button"
                onClick={() => selectDay(jd)}
                aria-label={formatHijri(iso)}
                className={cn(
                  "h-8 w-8 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  isSelected &&
                    "bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  isToday &&
                    !isSelected &&
                    "border border-primary/50 font-semibold text-primary"
                )}
              >
                {fa(jd)}
              </button>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={selectToday}
          >
            امروز
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            پاک کردن
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
