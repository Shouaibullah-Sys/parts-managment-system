// components/parts/supplier-select-field.tsx
// کامبوباکس «نام فروشگاه»: جستجوی زنده بین فروشگاه‌های موجود؛
// اگر نامی پیدا نشد، گزینه «ایجاد فروشگاه جدید» → دیالوگ ایجاد → انتخاب خودکار.
"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Pencil, Plus, Store, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SupplierFormDialog, type Supplier } from "./supplier-form-dialog";
import { SupplierManageDialog } from "./supplier-manage-dialog";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

interface SupplierSelectFieldProps {
  value: Supplier | null;
  onChange: (supplier: Supplier | null) => void;
  disabled?: boolean;
  /** نسخهٔ جمع‌وجور داخل جدول: بدون برچسب و بدون لینک مدیریت */
  compact?: boolean;
}

export function SupplierSelectField({
  value,
  onChange,
  disabled,
  compact = false,
}: SupplierSelectFieldProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // بستن لیست با کلیک بیرون
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // جستجوی دیبانس‌شده
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/suppliers?search=${encodeURIComponent(q)}&active=true&limit=8`,
          { credentials: "include" },
        );
        const json = await res.json().catch(() => null);
        setResults(res.ok && json?.success ? (json.data ?? []) : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const q = query.trim();
  const exactMatch = results.find(
    (s) => s.name.toLocaleLowerCase("fa") === q.toLocaleLowerCase("fa"),
  );
  // نمایش گزینهٔ «ایجاد جدید» وقتی نام تایپ‌شده دقیقاً موجود نیست
  const showCreate = q.length >= 1 && !exactMatch;

  const handleSelect = (supplier: Supplier) => {
    onChange(supplier);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const handleCreated = (supplier: Supplier) => {
    handleSelect(supplier);
  };

  // پس از مدیریت فروشگاه‌ها: نام انتخاب‌شده را تازه کن؛ اگر حذف شده بود، انتخاب برداشته شود
  const handleManaged = async () => {
    if (!value) return;
    try {
      const res = await fetch(`/api/suppliers/${value.id}`, {
        credentials: "include",
      });
      if (res.status === 404) {
        onChange(null);
        return;
      }
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json.data) {
        onChange(json.data as Supplier);
      }
    } catch {
      /* در صورت خطا انتخاب قبلی حفظ می‌شود */
    }
  };

  return (
    <div className={compact ? "relative" : "space-y-1"} ref={containerRef}>
      {!compact && (
        <Label className="text-sm">نام فروشگاه (تأمین‌کننده) — اختیاری</Label>
      )}

      {/* نام انتخاب‌شده */}
      {value && (
        <div
          className={`flex items-center gap-2 border border-primary/40 bg-primary/5 ${
            compact
              ? "h-8 rounded-md px-2 text-xs text-primary"
              : "rounded-lg px-3 py-2 text-sm"
          }`}
        >
          <Store
            className={`shrink-0 text-primary ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`}
          />
          <span className="font-medium flex-1 truncate">{value.name}</span>
          {value.phone && (
            <span className="text-muted-foreground text-xs" dir="ltr">
              {value.phone}
            </span>
          )}
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-destructive text-xs"
            disabled={disabled}
            title="حذف انتخاب"
          >
            {compact ? <X className="h-3.5 w-3.5" /> : "حذف انتخاب"}
          </button>
        </div>
      )}

      {(!compact || !value) && (
        <div className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="جستجوی نام فروشگاه…"
          disabled={disabled}
          className="pe-8"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {open && (results.length > 0 || showCreate) && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
            {results.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-right hover:bg-accent"
              >
                <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1">{s.name}</span>
                {s.phone && (
                  <span className="text-xs text-muted-foreground" dir="ltr">
                    {s.phone}
                  </span>
                )}
                {value?.id === s.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}

            {showCreate && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setCreateOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-right border-t border-border hover:bg-accent text-primary font-medium"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="flex-1">
                  ایجاد فروشگاه «{q}» جدید…
                </span>
              </button>
            )}
          </div>
        )}
        </div>
      )}

      <SupplierFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialName={q}
        onCreated={handleCreated}
      />

      {!compact && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            disabled={disabled}
            className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
          >
            <Pencil className="h-3 w-3" />
            مدیریت فروشگاه‌ها
          </button>
        </div>
      )}

      <SupplierManageDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        onChanged={handleManaged}
      />
    </div>
  );
}
