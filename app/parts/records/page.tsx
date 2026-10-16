// app/parts/records/page.tsx
import { PartsRecordsTable } from "@/components/parts/parts-records-table";

export default function PartsRecordsPage() {
  return (
    <div className="container mx-auto py-6 px-4 sm:px-6">
      <div className="mb-6 text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          سوابق صدور قطعات
        </h1>
        <p className="text-muted-foreground mt-2">
          مشاهده تمام سوابق صدور و فروش قطعات
        </p>
      </div>

      <PartsRecordsTable />
    </div>
  );
}
