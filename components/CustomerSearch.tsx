// components/CustomerSearch.tsx
"use client";
import { useState } from "react";

export default function CustomerSearch({
  onSelect,
}: {
  onSelect: (customer: any) => void;
}) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleFind() {
    if (!q) return;
    setLoading(true);
    const res = await fetch("/api/customers/find-or-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: q }),
    });
    const data = await res.json();
    setLoading(false);
    if (data?.id) onSelect(data);
    else alert("خطا در ایجاد یا پیدا کردن مشتری");
  }

  return (
    <div className="flex gap-2 items-center">
      <input
        className="px-3 py-2 border rounded w-full"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="نام مشتری (فارسی یا انگلیسی)"
      />
      <button
        className="px-3 py-2 bg-sky-600 text-white rounded"
        onClick={handleFind}
        disabled={!q || loading}
      >
        {loading ? "در حال جستجو..." : "پیدا/ایجاد"}
      </button>
    </div>
  );
}
