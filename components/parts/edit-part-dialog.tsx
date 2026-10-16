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
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { partFormSchema } from "@/lib/validations/part";
import { z } from "zod";
import { Part } from "@/types/parts";
import { PartsFormTable } from "./parts-form-table";

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
  const [partnerId, setPartnerId] = useState<number | null>(null);

  const form = useForm<z.input<typeof partFormSchema>>({
    resolver: zodResolver(partFormSchema),
    defaultValues: {
      partNumber: "",
      name: "",
      shelf: "",
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
        shelf: part.shelf || "",
        minStock: part.minStock,
        currentStock: part.currentStock || 0,
        costPrice: part.costPrice || "",
        salePrice: part.salePrice || "",
        active: part.active,
      });
    }
  }, [part, form]);

  // Load the partnership already selected for the part being edited
  useEffect(() => {
    setPartnerId(part?.partnerId ?? part?.partner?.id ?? null);
  }, [part]);

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
        partnerId,
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
      <DialogContent className="sm:max-w-[95vw] max-h-[90vh] overflow-y-auto border-mechanical bg-background">
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

            <PartsFormTable
              control={form.control}
              partnerId={partnerId}
              onPartnerChange={setPartnerId}
              selectedPartnerName={part?.partner?.name ?? null}
            />

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
