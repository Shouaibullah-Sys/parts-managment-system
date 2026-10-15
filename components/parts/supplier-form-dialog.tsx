// components/parts/supplier-form-dialog.tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Store } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface Supplier {
  id: number;
  name: string;
  phone?: string | null;
  note?: string | null;
  active?: boolean;
}

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** نام پیش‌پرشده از متن تایپ‌شده در کامبوباکس */
  initialName?: string;
  onCreated: (supplier: Supplier) => void;
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  initialName = "",
  onCreated,
}: SupplierFormDialogProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // هر بار که دیالوگ باز می‌شود، نام پیش‌پر از متن جستجوی کامبوباکس باشد
  useEffect(() => {
    if (open) setName(initialName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const reset = () => {
    setName(initialName);
    setPhone("");
    setNote("");
    setError(null);
    setSaving(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("نام فروشگاه لازم است");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmed,
          phone: phone.trim() || null,
          note: note.trim() || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        const msg = json?.error || "خطا در ایجاد فروشگاه";
        setError(msg);
        setSaving(false);
        return;
      }
      toast.success(`فروشگاه «${trimmed}» ایجاد شد`);
      onCreated(json.data as Supplier);
      handleOpenChange(false);
    } catch {
      setError("خطا در اتصال به سرور");
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            ایجاد فروشگاه جدید
          </DialogTitle>
          <DialogDescription>
            فروشگاه یا تأمین‌کننده‌ای که این پرزه از آن خریداری شده است.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-sm">نام فروشگاه</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: فروشگاه البرز"
              disabled={saving}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">شماره تماس (اختیاری)</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07xx-xxxxxxx"
              disabled={saving}
              dir="ltr"
              className="text-right"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">یادداشت (اختیاری)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="آدرس یا توضیح کوتاه"
              disabled={saving}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            انصراف
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
            ایجاد و انتخاب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
