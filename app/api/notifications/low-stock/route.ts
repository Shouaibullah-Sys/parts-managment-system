// app/api/notifications/low-stock/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import {
  checkLowStockNotifications,
  getAdminUsers,
  getNotificationPriority,
} from "@/lib/notifications";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session?.user) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const [userRole] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!userRole || userRole.role !== "admin") {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const lowStockParts = await checkLowStockNotifications();

    // Sort by priority (critical first)
    const sortedNotifications = lowStockParts
      .map((part) => ({
        ...part,
        priority: getNotificationPriority(
          part.deficit || 0,
          part.current_stock || 0
        ),
      }))
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = {
          high: 0,
          medium: 1,
          low: 2,
        };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    return Response.json({
      success: true,
      data: {
        notifications: sortedNotifications,
        total: sortedNotifications.length,
        critical: sortedNotifications.filter((n) => n.priority === "high")
          .length,
        warning: sortedNotifications.filter((n) => n.priority === "medium")
          .length,
        info: sortedNotifications.filter((n) => n.priority === "low").length,
      },
    });
  } catch (error) {
    console.error("Error fetching low stock notifications:", error);
    return Response.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
