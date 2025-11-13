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

  if (!session) {
    redirect("/login");
  }

  // Get current user to check role
  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  if (!currentUser) {
    redirect("/login");
  }

  // Redirect based on user role
  if (currentUser.role === "admin") {
    redirect("/dashboard/admin");
  } else if (currentUser.role === "staff") {
    redirect("/dashboard/staff");
  }

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto py-10">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">
          Welcome, {currentUser.name}
        </h2>
        <p className="text-gray-600">Your role: {currentUser.role}</p>
      </div>
    </div>
  );
}
