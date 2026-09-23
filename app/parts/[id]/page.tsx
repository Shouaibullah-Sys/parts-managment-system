import { PartDetails } from "@/components/parts/part-details";
import { getSessionFromCookies } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

interface PartDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PartDetailPage({ params }: PartDetailPageProps) {
  const { id } = await params;

  const sessionData = await getSessionFromCookies();

  if (!sessionData?.user) {
    redirect("/login");
  }

  const partId = parseInt(id);

  if (isNaN(partId)) {
    notFound();
  }

  return <PartDetails partId={partId} />;
}
