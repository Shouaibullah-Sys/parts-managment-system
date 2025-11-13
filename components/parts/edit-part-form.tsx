"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft } from "lucide-react";
import { partFormSchema, PartFormData } from "@/lib/validations/part";
import { z } from "zod";
import { usePart, useUpdatePart } from "@/hooks/use-parts";
import Link from "next/link";

interface EditPartFormProps {
  partId: number;
}

export function EditPartForm({ partId }: EditPartFormProps) {
  const router = useRouter();
  const { data: partResponse, isLoading: isLoadingPart } = usePart(partId);
  const updatePartMutation = useUpdatePart();
  const [serverError, setServerError] = useState<string | null>(null);

  const part = partResponse?.data;

  const form = useForm<z.input<typeof partFormSchema>>({
    resolver: zodResolver(partFormSchema),
    defaultValues: {
      partNumber: "",
      name: "",
      section: "E",
      minStock: 0,
      costPrice: "",
      salePrice: "",
      active: true,
    },
  });

  // Reset form when part data is loaded
  useEffect(() => {
    if (part) {
      form.reset({
        partNumber: part.partNumber,
        name: part.name,
        section: part.section,
        minStock: part.minStock,
        costPrice: part.costPrice || "",
        salePrice: part.salePrice || "",
        active: part.active,
      });
    }
  }, [part, form]);

  const costPrice = form.watch("costPrice");
  const salePrice = form.watch("salePrice");

  const onSubmit = async (data: z.input<typeof partFormSchema>) => {
    setServerError(null);

    try {
      const transformedData = {
        ...data,
        minStock: data.minStock as number,
        active: data.active as boolean,
        costPrice: data.costPrice || undefined,
        salePrice: data.salePrice || undefined,
      };
      await updatePartMutation.mutateAsync({
        id: partId,
        data: transformedData,
      });
      router.push("/parts");
      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  };

  if (isLoadingPart) {
    return (
      <div className="container max-w-2xl mx-auto py-6 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!part) {
    return (
      <div className="container max-w-2xl mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>Part not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/parts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Part</h1>
          <p className="text-muted-foreground">Update part information</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{part.partNumber}</CardTitle>
          <CardDescription>Update the details for this part.</CardDescription>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="section"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="E">Section E</SelectItem>
                          <SelectItem value="D">Section D</SelectItem>
                          <SelectItem value="F">Section F</SelectItem>
                          <SelectItem value="G">Section G</SelectItem>
                          <SelectItem value="OLD">OLD</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          {...field}
                          value={field.value || ""}
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
                      <FormLabel>Sale Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          value={field.value || ""}
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
                  <Alert variant="destructive">
                    <AlertDescription>
                      Sale price is less than cost price. This will result in a
                      loss.
                    </AlertDescription>
                  </Alert>
                )}

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

              <div className="flex gap-4 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/parts")}
                  disabled={updatePartMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePartMutation.isPending}>
                  {updatePartMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Part
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
