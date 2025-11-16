// components/parts/edit-part-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { partFormSchema } from "@/lib/validations/part";
import { z } from "zod";
import { Part } from "@/types/parts";

interface EditPartDialogProps {
  part: Part | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditPartDialog({
  part,
  open,
  onOpenChange,
  onSuccess,
}: EditPartDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<z.input<typeof partFormSchema>>({
    resolver: zodResolver(partFormSchema),
    defaultValues: {
      partNumber: "",
      name: "",
      section: "E",
      minStock: 0,
      currentStock: 0,
      costPrice: "",
      salePrice: "",
      active: true,
    },
  });

  // Reset form when part changes
  useEffect(() => {
    if (part) {
      form.reset({
        partNumber: part.partNumber,
        name: part.name,
        section: part.section,
        minStock: part.minStock,
        currentStock: part.currentStock || 0,
        costPrice: part.costPrice || "",
        salePrice: part.salePrice || "",
        active: part.active,
      });
    }
  }, [part, form]);

  const costPrice = form.watch("costPrice");
  const salePrice = form.watch("salePrice");

  const onSubmit = async (data: z.input<typeof partFormSchema>) => {
    if (!part) return;

    setServerError(null);
    setIsSubmitting(true);

    try {
      const transformedData = {
        ...data,
        minStock: data.minStock as number,
        currentStock: data.currentStock as number,
        active: data.active as boolean,
        costPrice: data.costPrice || undefined,
        salePrice: data.salePrice || undefined,
      };

      const response = await fetch(`/api/parts/${part.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transformedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message ||
            "شما نمیتوانید در پرزه تغییر بیاورین. لطفا با مدیر بتماس شوین!"
        );
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "خطایی رخ داده است"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-mechanical bg-background">
        <DialogHeader>
          <DialogTitle className="bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent text-xl">
            ویرایش قطعه
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            اطلاعات قطعه را ویرایش کنید و ذخیره نمایید
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {serverError && (
              <Alert
                variant="destructive"
                className="border-destructive/50 bg-destructive/10"
              >
                <AlertDescription className="text-destructive">
                  {serverError}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="partNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>شماره قطعه *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ABC-123"
                        {...field}
                        className="border-border focus:border-primary focus:ring-primary/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام قطعه *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="فیلتر هوا"
                        {...field}
                        className="border-border focus:border-primary focus:ring-primary/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>بخش *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="E, D, F, G, OLD, یا سفارشی"
                        {...field}
                        className="border-border focus:border-primary focus:ring-primary/20"
                      />
                    </FormControl>
                    <FormDescription>
                      دسته‌بندی بخش برای قطعه (هر مقدار متنی مجاز است)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حداقل موجودی</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        value={field.value as number}
                        className="border-border focus:border-primary focus:ring-primary/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>موجودی فعلی</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        value={field.value as number}
                        className="border-border focus:border-primary focus:ring-primary/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>قیمت خرید</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        value={field.value || ""}
                        className="border-border focus:border-primary focus:ring-primary/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>قیمت فروش</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        value={field.value || ""}
                        className="border-border focus:border-primary focus:ring-primary/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {costPrice &&
              salePrice &&
              parseFloat(salePrice) < parseFloat(costPrice) && (
                <Alert
                  variant="destructive"
                  className="border-destructive/50 bg-destructive/10"
                >
                  <AlertDescription className="text-destructive">
                    قیمت فروش کمتر از قیمت خرید است. این باعث ضرر می‌شود.
                  </AlertDescription>
                </Alert>
              )}

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">فعال</FormLabel>
                    <FormDescription className="text-muted-foreground">
                      قطعات غیرفعال در فروش و واردات نمایش داده نمی‌شوند
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-primary"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-4 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                لغو
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                ذخیره تغییرات
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
