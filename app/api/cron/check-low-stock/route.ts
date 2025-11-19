// app/api/cron/check-low-stock/route.ts
import { NextRequest } from "next/server";
import { checkLowStockNotifications, getAdminUsers } from "@/lib/notifications";
import { sendBulkPushNotifications } from "@/lib/push-notifications";
import { db } from "@/db/drizzle";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const lowStockParts = await checkLowStockNotifications();
    const admins = await getAdminUsers();

    if (lowStockParts.length > 0) {
      console.log(
        `Found ${lowStockParts.length} low stock parts. Notifying ${admins.length} admins.`
      );

      // Get all admin push subscriptions
      const adminSubscriptions = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, admins[0].id)); // You might want to get for all admins

      if (adminSubscriptions.length > 0) {
        const criticalCount = lowStockParts.filter(
          (part) => part.current_stock === 0
        ).length;

        let title, body;

        if (criticalCount > 0) {
          title = "🚨 هشدار موجودی بحرانی";
          body = `${criticalCount} قطعه تمام شده است! ${lowStockParts.length} قطعه نیاز به بررسی دارد.`;
        } else {
          title = "⚠️ اخطار کمبود موجودی";
          body = `${lowStockParts.length} قطعه کمبود موجودی دارد.`;
        }

        // Transform database results to match PushSubscription interface
        const transformedSubscriptions = adminSubscriptions.map((sub) => ({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }));

        // Send push notifications
        await sendBulkPushNotifications(transformedSubscriptions, title, body, {
          criticalCount,
          totalCount: lowStockParts.length,
        });
      }
    }

    return Response.json({
      success: true,
      data: {
        checked_at: new Date().toISOString(),
        low_stock_count: lowStockParts.length,
        critical_count: lowStockParts.filter((part) => part.current_stock === 0)
          .length,
        admin_count: admins.length,
        notifications_sent: true,
      },
    });
  } catch (error) {
    console.error("Error in low stock cron job:", error);
    return Response.json(
      { success: false, error: "Cron job failed" },
      { status: 500 }
    );
  }
}
