// app/api/push/subscribe/route.ts
import { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-session";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await request.json();

    // Check if subscription already exists
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      .limit(1);

    if (existing.length > 0) {
      // Update existing subscription
      await db
        .update(pushSubscriptions)
        .set({
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        })
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    } else {
      // Create new subscription
      await db.insert(pushSubscriptions).values({
        userId: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error saving push subscription:", error);
    return Response.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}
