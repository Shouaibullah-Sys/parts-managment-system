import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { getSessionFromCookies } from "@/lib/auth";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

export default async function Dashboard() {
  const sessionData = await getSessionFromCookies();

  if (!sessionData?.user) {
    redirect("/login");
  }

  const [currentUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, sessionData.user.id))
    .limit(1);

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.approved) {
    redirect("/login");
  }

  if (currentUser.role === "admin") {
    redirect("/dashboard/admin");
  } else if (currentUser.role === "staff") {
    redirect("/dashboard/staff");
  }

  redirect("/login");
}
