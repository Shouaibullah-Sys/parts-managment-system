// components/PaymentForm.tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addPaymentSchema } from "@/lib/validation/schemas";
import type { z } from "zod";

type Form = z.infer<typeof addPaymentSchema>;

export default function PaymentForm({
  saleId,
  onDone,
}: {
  saleId: number;
  onDone?: () => void;
}) {
  const { register, handleSubmit } = useForm<Form>({
    resolver: zodResolver(addPaymentSchema),
    defaultValues: { saleId, amount: 0 },
  });

  const onSubmit = async (data: Form) => {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json?.newPaid !== undefined) {
      alert("پرداخت ثبت شد");
      if (onDone) onDone();
    } else {
      alert("خطا در ثبت پرداخت");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <input {...register("saleId", { valueAsNumber: true })} type="hidden" />
      <input
        {...register("amount", { valueAsNumber: true })}
        type="number"
        className="px-3 py-2 border rounded w-full"
        placeholder="مبلغ پرداخت"
      />
      <input
        {...register("note")}
        className="px-3 py-2 border rounded w-full"
        placeholder="یادداشت (اختیاری)"
      />
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        ثبت پرداخت
      </button>
    </form>
  );
}
