"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft } from "lucide-react";
import { partFormSchema, PartFormData } from "@/lib/validations/part";
import { z } from "zod";
import { useCreatePart } from "@/hooks/use-parts";
import Link from "next/link";

export function CreatePartForm() {
  const router = useRouter();
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

      // Navigate back to parts list with refresh
      router.push("/parts");
      router.refresh(); // Force refresh the route
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/parts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Part</h1>
          <p className="text-muted-foreground">
            Add a new part to your inventory
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Part Information</CardTitle>
          <CardDescription>
            Enter the details for the new part. All fields marked with * are
            required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {serverError && (
                <Alert variant="destructive">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <FormDescription>
                        Unique identifier for the part
                      </FormDescription>
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
                      <FormDescription>
                        Descriptive name of the part
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <FormDescription>
                        Alert when stock falls below this level
                      </FormDescription>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <FormDescription>Purchase cost per unit</FormDescription>
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
                      <FormDescription>Selling price per unit</FormDescription>
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
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

              {/* Form Actions */}
              <div className="flex gap-4 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/parts")}
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
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
