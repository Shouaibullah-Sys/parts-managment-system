// components/parts/supplier-manage-dialog.tsx
// مدیریت فروشگاه‌ها: مشاهده، جستجو، افزودن، ویرایش، غیرفعال‌سازی و حذف دائمی
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
  Power,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SupplierFormDialog, type Supplier } from "./supplier-form-dialog";

interface SupplierManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** پس از هر تغییر — والد لیست/انتخاب را تازه کند */
  onChanged?: () => void;
}

const DEBOUNCE_MS = 300;

export function SupplierManageDialog({
  open,
  onOpenChange,
  onChanged,
}: SupplierManageDialogProps) {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    note: "",
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  // شمارهٔ درخواست: پاسخِ کهنهٔ در راه نباید لیست تازه را بازنویسی کند
  const seqRef = useRef(0);

  const load = useCallback(async (search: string) => {
    const mySeq = ++seqRef.current;
    setLoading(true);
    try {
      const url = `/api/suppliers?limit=100${
        search ? `&search=${encodeURIComponent(search)}` : ""
      }`;
      const res = await fetch(url, { credentials: "include" });
      const json = await res.json().catch(() => null);
      if (mySeq !== seqRef.current) return; // درخواست جدتری ارسال شده
      setRows(res.ok && json?.success ? (json.data ?? []) : []);
    } catch {
      if (mySeq === seqRef.current) setRows([]);
    } finally {
      if (mySeq === seqRef.current) setLoading(false);
    }
  }, []);

  // جستجوی دیبانس‌شده
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => load(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [open, query, load]);

  // پس از هر تغییر، لیست از سرور همگام می‌شود (پاسخ‌های کهنهٔ در راه را کنار می‌زند)
  const reconcile = () => load(query.trim());

  const startEdit = (row: Supplier) => {
    setEditingId(row.id);
    setEditForm({
      name: row.name,
      phone: row.phone ?? "",
      note: row.note ?? "",
      active: row.active !== false,
    });
    setConfirmId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: number) => {
    const name = editForm.name.trim();
    if (!name) {
      toast.error("نام فروشگاه لازم است");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          phone: editForm.phone.trim() || null,
          note: editForm.note.trim() || null,
          active: editForm.active,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        toast.error(json?.error || "خطا در ویرایش فروشگاه");
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.id === id ? (json.data as Supplier) : r)),
      );
      setEditingId(null);
      toast.success("فروشگاه بروزرسانی شد");
      onChanged?.();
      reconcile();
    } catch {
      toast.error("خطا در اتصال به سرور");
    } finally {
      setSaving(false);
    }
  };

  const removeSupplier = async (id: number, hard: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/suppliers/${id}${hard ? "?hard=true" : ""}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        toast.error(json?.error || "خطا در حذف فروشگاه");
        return;
      }
      if (hard) {
        setRows((prev) => prev.filter((r) => r.id !== id));
        toast.success("فروشگاه برای همیشه حذف شد");
      } else {
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, active: false } : r)),
        );
        toast.success("فروشگاه غیرفعال شد");
      }
      setConfirmId(null);
      onChanged?.();
      reconcile();
    } catch {
      toast.error("خطا در اتصال به سرور");
    } finally {
      setSaving(false);
    }
  };

  const handleCreated = (supplier: Supplier) => {
    setRows((prev) => [supplier, ...prev]);
    onChanged?.();
    reconcile();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              مدیریت فروشگاه‌ها
            </DialogTitle>
            <DialogDescription>
              افزودن، ویرایش و غیرفعال‌سازی فروشگاه‌هایی که پرزه از آن‌ها
              خریداری می‌شود.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 py-1">
            <div className="relative flex-1">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجو در فروشگاه‌ها…"
                className="pr-9"
              />
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 ml-1" />
              فروشگاه جدید
            </Button>
          </div>

          <div className="rounded-lg border border-border divide-y divide-border">
            {loading && rows.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال بارگذاری…
              </div>
            )}

            {!loading && rows.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                فروشگاهی یافت نشد
              </div>
            )}

            {rows.map((row) => (
              <div key={row.id} className="p-3">
                {editingId === row.id ? (
                  // حالت ویرایش
                  <div className="space-y-2">
                    <Input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="نام فروشگاه"
                      disabled={saving}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, phone: e.target.value }))
                        }
                        placeholder="شماره تماس"
                        dir="ltr"
                        className="text-right"
                        disabled={saving}
                      />
                      <Input
                        value={editForm.note}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, note: e.target.value }))
                        }
                        placeholder="یادداشت"
                        disabled={saving}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Switch
                        checked={editForm.active}
                        onCheckedChange={(v) =>
                          setEditForm((p) => ({ ...p, active: v }))
                        }
                        disabled={saving}
                      />
                      فعال
                    </label>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                        disabled={saving}
                      >
                        انصراف
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveEdit(row.id)}
                        disabled={saving}
                      >
                        {saving && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
                        ذخیره
                      </Button>
                    </div>
                  </div>
                ) : confirmId === row.id ? (
                  // حالت تأیید حذف
                  <div className="space-y-2">
                    <p className="text-sm">
                      فروشگاه «{row.name}» را غیرفعال کنیم یا برای همیشه حذف؟
                      <span className="block text-xs text-muted-foreground mt-1">
                        نام این فروشگاه روی فروش‌های قبلی باقی می‌ماند.
                      </span>
                    </p>
                    <div className="flex gap-2 justify-end flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmId(null)}
                        disabled={saving}
                      >
                        انصراف
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeSupplier(row.id, false)}
                        disabled={saving}
                      >
                        <Power className="h-4 w-4 ml-1" />
                        غیرفعال‌سازی
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeSupplier(row.id, true)}
                        disabled={saving}
                      >
                        {saving && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
                        حذف دائمی
                      </Button>
                    </div>
                  </div>
                ) : (
                  // حالت نمایش
                  <div className="flex items-center gap-3">
                    <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {row.name}
                        </span>
                        {row.active === false && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-amber-400 text-amber-600"
                          >
                            غیرفعال
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {row.phone && (
                          <span dir="ltr">{row.phone}</span>
                        )}
                        {row.phone && row.note && " · "}
                        {row.note}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(row)}
                        title="ویرایش"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setConfirmId(row.id);
                        }}
                        title="حذف"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <SupplierFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialName={query.trim()}
        onCreated={handleCreated}
      />
    </>
  );
}
