import { PartDetails } from "@/components/parts/part-details";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

interface PartDetailPageProps {
  params: {
    id: string;
  };
}

export default async function PartDetailPage({ params }: PartDetailPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const partId = parseInt(params.id);

  if (isNaN(partId)) {
    notFound();
  }

  return <PartDetails partId={partId} />;
}
