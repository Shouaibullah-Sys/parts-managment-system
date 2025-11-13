import { CreatePartForm } from "@/components/parts/create-part-form";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function CreatePartPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Only admin can create parts
  if (!session?.user || session.user.role !== "admin") {
    redirect("/parts");
  }

  return <CreatePartForm />;
}
