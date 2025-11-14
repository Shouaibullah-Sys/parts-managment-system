import { PartDetails } from "@/components/parts/part-details";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

interface PartDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PartDetailPage({ params }: PartDetailPageProps) {
  // Unwrap params (NEW Next.js 15+ requirement)
  const { id } = await params;

  // Fix: Do NOT use headers() inside auth — slow + streaming boundary
  const reqHeaders = await headers();

  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!session?.user) {
    redirect("/login");
  }

  const partId = parseInt(id);

  if (isNaN(partId)) {
    notFound();
  }

  return <PartDetails partId={partId} />;
}
