// components/parts/parts-form-table.tsx
"use client";

import { Control } from "react-hook-form";
import { z } from "zod";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { partFormSchema } from "@/lib/validations/part";
import { PartnerSelectField } from "./partner-select-field";

type PartFormValues = z.input<typeof partFormSchema>;

interface PartsFormTableProps {
  control: Control<PartFormValues>;
  partnerId: number | null;
  onPartnerChange: (partnerId: number | null) => void;
  selectedPartnerName?: string | null;
}

/**
 * نمایش فرم قطعه به شکل جدول داده — سرستون‌ها با ترتیب و نام ستون‌های
 * جدول /parts/manage یکسان است و یک ردیف ورودی در بدنه دارد.
 */
export function PartsFormTable({
  control,
  partnerId,
  onPartnerChange,
  selectedPartnerName,
}: PartsFormTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table className="min-w-[1150px]">
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead className="min-w-[130px]">پارت نمبر *</TableHead>
            <TableHead className="min-w-[170px]">نام *</TableHead>
            <TableHead className="min-w-[180px]">شرکا</TableHead>
            <TableHead className="min-w-[110px]">طاقچه</TableHead>
            <TableHead className="min-w-[120px]">حداقل موجودی</TableHead>
            <TableHead className="min-w-[120px]">موجودی فعلی</TableHead>
            <TableHead className="min-w-[130px]">قیمت خرید</TableHead>
            <TableHead className="min-w-[130px]">قیمت فروش</TableHead>
            <TableHead className="min-w-[110px]">وضعیت</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="align-top">
            <TableCell>
              <FormField
                control={control}
                name="partNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="ABC-123"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TableCell>

            <TableCell>
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="فیلتر روغن موتور" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TableCell>

            <TableCell>
              <PartnerSelectField
                compact
                value={partnerId}
                onChange={onPartnerChange}
                selectedName={selectedPartnerName}
              />
            </TableCell>

            <TableCell>
              <FormField
                control={control}
                name="shelf"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="مثلاً A-1"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TableCell>

            <TableCell>
              <FormField
                control={control}
                name="minStock"
                render={({ field }) => (
                  <FormItem>
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
            </TableCell>

            <TableCell>
              <FormField
                control={control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
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
            </TableCell>

            <TableCell>
              <FormField
                control={control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
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
            </TableCell>

            <TableCell>
              <FormField
                control={control}
                name="salePrice"
                render={({ field }) => (
                  <FormItem>
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
            </TableCell>

            <TableCell>
              <FormField
                control={control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <span className="text-xs text-muted-foreground">
                      {field.value ? "فعال" : "غیرفعال"}
                    </span>
                  </FormItem>
                )}
              />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
