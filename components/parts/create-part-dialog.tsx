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
import { partFormSchema, PartFormData } from "@/lib/validations/part";
import { z } from "zod";
import { useCreatePart } from "@/hooks/use-parts";

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
      };
      await createPartMutation.mutateAsync(transformedData);
      form.reset();
      onPartCreated();
      onOpenChange(false);
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setServerError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Part</DialogTitle>
          <DialogDescription>
            Add a new part to your inventory. All fields marked with * are
            required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Part Number */}
              <FormField
                control={form.control}
                name="partNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Part Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC-123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Part Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Engine Oil Filter" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Section */}
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="E, D, F, G, OLD, or custom"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Category section for the part (any text value allowed)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Minimum Stock */}
              <FormField
                control={form.control}
                name="minStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Stock</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        value={field.value as number}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Current Stock */}
              <FormField
                control={form.control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Stock</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        value={field.value as number}
                      />
                    </FormControl>
                    <FormDescription>
                      Initial stock quantity for this part
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Cost Price */}
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sale Price */}
              <FormField
                control={form.control}
                name="salePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sale Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Price Comparison Alert */}
            {costPrice &&
              salePrice &&
              parseFloat(salePrice) < parseFloat(costPrice) && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Sale price is less than cost price. This will result in a
                    loss.
                  </AlertDescription>
                </Alert>
              )}

            {/* Active Status */}
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Inactive parts won't appear in sales and imports
                    </FormDescription>
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createPartMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createPartMutation.isPending}>
                {createPartMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Part
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
