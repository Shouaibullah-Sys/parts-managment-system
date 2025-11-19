import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

export default async function Dashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Get current user to check role
  const [currentUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!currentUser) {
    redirect("/login");
  }

  // Check if user is approved
  if (!currentUser.approved) {
    redirect("/login");
  }

  // Redirect based on user role
  if (currentUser.role === "admin") {
    redirect("/dashboard/admin");
  } else if (currentUser.role === "staff") {
    redirect("/dashboard/staff");
  }

  // Fallback (should not reach here)
  redirect("/login");
}
