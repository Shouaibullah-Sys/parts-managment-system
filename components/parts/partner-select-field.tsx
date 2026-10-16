// components/parts/partner-select-field.tsx
"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PartnerOption = {
  id: number;
  name: string;
  percentage: string | null;
};

/** گزینه‌ی «بدون شراکت» — چون مقدار خالی در Select مجاز نیست */
const NO_PARTNER = "__none__";

interface PartnerSelectFieldProps {
  value: number | null;
  onChange: (partnerId: number | null) => void;
  /** نام شریک انتخاب‌شده (نمایش وقتی شریک در لیست فعال‌ها نیست) */
  selectedName?: string | null;
  disabled?: boolean;
  /** حالت فشرده برای استفاده داخل سلول جدول (بدون کادر و برچسب) */
  compact?: boolean;
}

/**
 * دراپ‌داون «نام شراکت»: لیست شرکا از صفحه‌ی /dashboard/admin/partners خوانده
 * می‌شود و کاربر برای هر قطعه یک شراکت انتخاب می‌کند.
 */
export function PartnerSelectField({
  value,
  onChange,
  selectedName,
  disabled,
  compact,
}: PartnerSelectFieldProps) {
  const [options, setOptions] = useState<PartnerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/partners?active=true&limit=1000", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fetch"))))
      .then((payload) => {
        if (cancelled) return;
        setOptions(payload.data ?? []);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setOptions([]);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const emptyHint = !isLoading && options.length === 0;

  const select = (
    <Select
      value={value != null ? String(value) : NO_PARTNER}
      onValueChange={(next) =>
        onChange(next === NO_PARTNER ? null : Number(next))
      }
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="border-border focus:border-primary">
        <SelectValue
          placeholder={isLoading ? "در حال بارگیری..." : "انتخاب شراکت"}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_PARTNER}>— بدون شراکت —</SelectItem>
        {value != null &&
          selectedName &&
          !options.some((option) => option.id === value) && (
            <SelectItem value={String(value)}>{selectedName}</SelectItem>
          )}
        {options.map((option) => (
          <SelectItem key={option.id} value={String(option.id)}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (compact) {
    return (
      <div className="space-y-1">
        {select}
        {emptyHint && (
          <p className="text-xs text-muted-foreground">شریکی ثبت نشده است</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="space-y-0.5">
        <Label className="text-base">نام شراکت</Label>
        <p className="text-xs text-muted-foreground">
          شریک این قطعه را از لیست شرکا انتخاب کنید.
        </p>
      </div>

      {select}

      {emptyHint && (
        <p className="text-xs text-muted-foreground">
          هنوز شریکی ثبت نشده است. ابتدا از بخش «شرکا» یک شریک اضافه کنید.
        </p>
      )}
    </div>
  );
}
