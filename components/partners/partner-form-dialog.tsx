// components/partners/partner-form-dialog.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export interface Partner {
  id: number;
  name: string;
  phone: string | null;
  note: string | null;
  percentage: number | string | null;
  active: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const formSchema = z.object({
  name: z.string().min(1, "نام شریک لازم است").max(255),
  phone: z.string().max(50).optional(),
  note: z.string().optional(),
  percentage: z.string().optional(),
  active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface PartnerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog works in edit mode. */
  partner?: Partner | null;
  onSaved?: () => void;
}

export function PartnerFormDialog({
  open,
  onOpenChange,
  partner,
  onSaved,
}: PartnerFormDialogProps) {
  const isEdit = Boolean(partner);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      note: "",
      percentage: "",
      active: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: partner?.name ?? "",
        phone: partner?.phone ?? "",
        note: partner?.note ?? "",
        percentage:
          partner?.percentage != null ? String(partner.percentage) : "",
        active: partner?.active ?? true,
      });
    }
  }, [open, partner, form]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const url = isEdit ? `/api/partners/${partner!.id}` : "/api/partners";
      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: values.name,
          phone: values.phone || null,
          note: values.note || null,
          percentage:
            values.percentage && values.percentage.trim() !== ""
              ? Number(values.percentage)
              : null,
          active: values.active,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "خطا در ذخیره شریک");
      }

      toast.success(isEdit ? "شریک ویرایش شد" : "شریک اضافه شد");
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ذخیره شریک");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "ویرایش شریک" : "افزودن شریک"}</DialogTitle>
          <DialogDescription>
            نام شریک و معلومات تماس را وارد کنید.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نام شریک</FormLabel>
                  <FormControl>
                    <Input placeholder="نام کامل شریک" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>شماره تماس (اختیاری)</FormLabel>
                  <FormControl>
                    <Input
                      dir="ltr"
                      placeholder="+93 7xx xxx xxx"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>یادداشت (اختیاری)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="توضیحات"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>درصد سهم (٪)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step="0.01"
                      placeholder="مثلاً ۵۰"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="mb-0">فعال</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      شرکای غیرفعال در فهرست انتخاب قطعات نمایش داده نمی‌شوند.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "در حال ذخیره..." : isEdit ? "ذخیره" : "افزودن"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
