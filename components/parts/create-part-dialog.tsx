// components/parts/create-part-dialog.tsx

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { partFormSchema } from "@/lib/validations/part";
import { z } from "zod";
import { useCreatePart } from "@/hooks/use-parts";
import { PartsFormTable } from "./parts-form-table";

interface CreatePartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPartCreated: () => void;
}

export function CreatePartDialog({
  open,
  onOpenChange,
  onPartCreated,
}: CreatePartDialogProps) {
  const createPartMutation = useCreatePart();
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

  const costPrice = form.watch("costPrice");
  const salePrice = form.watch("salePrice");

  const onSubmit = async (data: z.input<typeof partFormSchema>) => {
    setServerError(null);

    try {
      const transformedData = {
        ...data,
        minStock: data.minStock as number,
        currentStock: data.currentStock as number,
        costPrice: data.costPrice || undefined,
        salePrice: data.salePrice || undefined,
        partnerId,
      };
      await createPartMutation.mutateAsync(transformedData);
      form.reset();
      onPartCreated();
      onOpenChange(false);
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setServerError(null);
      setPartnerId(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ایجاد قطعه جدید</DialogTitle>
          <DialogDescription>
            یک قطعه جدید به موجودی خود اضافه کنید. تمام فیلدهای علامت‌گذاری شده
            با * الزامی هستند.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <PartsFormTable
              control={form.control}
              partnerId={partnerId}
              onPartnerChange={setPartnerId}
            />

            {/* Price Comparison Alert */}
            {costPrice &&
              salePrice &&
              parseFloat(salePrice) < parseFloat(costPrice) && (
                <Alert variant="destructive">
                  <AlertDescription>
                    قیمت فروش کمتر از قیمت خرید است. این منجر به ضرر خواهد شد.
                  </AlertDescription>
                </Alert>
              )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createPartMutation.isPending}
              >
                لغو
              </Button>
              <Button type="submit" disabled={createPartMutation.isPending}>
                {createPartMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                ایجاد قطعه
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
