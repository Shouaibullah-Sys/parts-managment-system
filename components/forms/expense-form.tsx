// components/forms/expense-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";

const formSchema = z.object({
  title: z.string().min(1, "عنوان لازم است"),
  description: z.string().optional(),
  amount: z.number().positive("مقدار باید مثبت باشد"),
  category: z.string().min(1, "دسته‌بندی لازم است"),
  expenseDate: z.string().min(1, "تاریخ مصرف لازم است"),
  receiptNumber: z.string().optional(),
  vendor: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  expense?: {
    id: number;
    title: string;
    description?: string;
    amount: number;
    category: string;
    expenseDate: string;
    receiptNumber?: string;
    vendor?: string;
  };
  onSubmit?: () => void;
  className?: string;
}

const expenseCategories = [
  "لوازم اداری",
  "خدمات عمومی",
  "حمل و نقل",
  "بازاریابی",
  "نگهداری",
  "سفر",
  "غذا و سرگرمی",
  "بیمه",
  "کرایه",
  "تجهیزات",
  "نرم افزار",
  "خدمات حرفه‌ای",
  "سایر",
];

export function ExpenseForm({
  expense,
  onSubmit,
  className,
  ...props
}: ExpenseFormProps & React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: expense?.title || "",
      description: expense?.description || "",
      amount: expense?.amount || 0,
      category: expense?.category || "",
      expenseDate: expense?.expenseDate
        ? new Date(expense.expenseDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      receiptNumber: expense?.receiptNumber || "",
      vendor: expense?.vendor || "",
    },
  });

  async function handleSubmit(values: ExpenseFormData) {
    setIsLoading(true);

    try {
      const url = expense ? `/api/expenses/${expense.id}` : "/api/expenses";

      const method = expense ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          expense ? "مصرف با موفقیت به‌روزرسانی شد" : "مصرف با موفقیت ایجاد شد"
        );

        if (onSubmit) {
          onSubmit();
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.error || "ذخیره مصرف ناموفق بود");
      }
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("ذخیره مصرف ناموفق بود");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {expense ? "ویرایش مصرف" : "اضافه کردن مصرف جدید"}
            </CardTitle>
            <CardDescription>
              {expense ? "به‌روزرسانی جزئیات مصرف" : "وارد کردن اطلاعات مصرف"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">
                  {expense
                    ? "در حال به‌روزرسانی مصرف..."
                    : "در حال ایجاد مصرف..."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {expense ? "ویرایش مصرف" : "افزودن مصرف جدید"}
          </CardTitle>
          <CardDescription>
            {expense ? "بروزرسانی جزئیات مصرف" : "وارد کردن اطلاعات مصرف"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <div className="grid gap-4">
                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عنوان *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="به عنوان مثال، خرید لوازم اداری"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>مقدار *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>دسته‌بندی *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="یک دسته‌بندی انتخاب کنید" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {expenseCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="expenseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاریخ مصرف *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="vendor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>فروشنده/تأمین‌کننده</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="به عنوان مثال، شرکت ABC"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="receiptNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>شماره رسید</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="به عنوان مثال، INV-001"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>توضیحات</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="جزئیات اضافی (اختیاری)"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  {expense ? "به‌روزرسانی مصرف" : "ایجاد مصرف"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  className="flex-1"
                >
                  پاک کردن فرم
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
