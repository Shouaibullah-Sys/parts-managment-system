// app/parts/issue/page.tsx
import { IssuePartsTable } from "@/components/parts/issue-parts-table";

export default function IssuePartsPage() {
  return (
    <div className="container mx-auto py-6 px-4 sm:px-6">
      <div className="mb-6 text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          صدور قطعات
        </h1>
        <p className="text-muted-foreground mt-2">
          جستجو و صدور قطعات برای مشتریان
        </p>
      </div>

      <IssuePartsTable />
    </div>
  );
}
