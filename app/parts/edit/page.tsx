import { EditPartForm } from "@/components/parts/edit-part-form";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

interface EditPartPageProps {
  params: {
    id: string;
  };
}

export default async function EditPartPage({ params }: EditPartPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Only admin can edit parts
  if (!session?.user || session.user.role !== "admin") {
    redirect("/parts");
  }

  const partId = parseInt(params.id);

  if (isNaN(partId)) {
    redirect("/parts");
  }

  return <EditPartForm partId={partId} />;
}
