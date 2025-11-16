// components/SaleForm.tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSaleSchema } from "@/lib/validation/schemas";
import type { z } from "zod";
import CustomerSearch from "./CustomerSearch";

type FormSchema = z.infer<typeof createSaleSchema>;

export default function SaleForm({ parts }: { parts: any[] }) {
  const { register, handleSubmit, setValue } = useForm<FormSchema>({
    resolver: zodResolver(createSaleSchema),
    defaultValues: { quantity: 1, paidAmount: 0 },
  });

  const onSubmit = async (data: FormSchema) => {
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json?.id) {
      alert("فروش ثبت شد");
    } else {
      alert("خطا در ثبت فروش");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <CustomerSearch onSelect={(c) => setValue("customerName", c.name)} />
      <select
        {...register("partId")}
        className="w-full px-3 py-2 border rounded"
      >
        <option value="">انتخاب قطعه</option>
        {parts.map((p) => (
          <option key={p.id} value={p.id}>
            {p.partNumber} — {p.name}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-3 gap-2">
        <input
          {...register("quantity", { valueAsNumber: true })}
          type="number"
          className="px-3 py-2 border rounded"
          placeholder="تعداد"
        />
        <input
          {...register("totalAmount", { valueAsNumber: true })}
          type="number"
          className="px-3 py-2 border rounded"
          placeholder="مبلغ کل"
        />
        <input
          {...register("paidAmount", { valueAsNumber: true })}
          type="number"
          className="px-3 py-2 border rounded"
          placeholder="پرداخت فعلی"
        />
      </div>

      <button
        type="submit"
        className="px-4 py-2 bg-green-600 text-white rounded"
      >
        ثبت فروش
      </button>
    </form>
  );
}
