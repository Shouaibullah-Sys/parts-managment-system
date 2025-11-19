import Loader from "@/components/loader";

export default function AdminDashboardLoading() {
  return (
    <div className="container mx-auto py-6 px-4 sm:px-6">
      <div className="flex items-center justify-center min-h-96">
        <Loader
          title="در حال بارگذاری داشبورد..."
          subtitle="لطفاً منتظر بمانید"
          size="md"
        />
      </div>
    </div>
  );
}
