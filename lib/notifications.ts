// lib/notifications.ts
import { db } from "../db/drizzle";
import { parts, user } from "../db/schema";
import { and, lt, eq, desc } from "drizzle-orm";

export interface LowStockNotification {
  id: number;
  part_number: string;
  name: string;
  section: string;
  min_stock: number;
  current_stock: number;
  deficit: number;
  created_at: Date;
  notified: boolean;
}

// Check for low stock parts and create notifications
export async function checkLowStockNotifications() {
  try {
    // Find parts that are below minimum stock and active
    const lowStockParts = await db
      .select({
        id: parts.id,
        part_number: parts.partNumber,
        name: parts.name,
        section: parts.section,
        min_stock: parts.minStock,
        current_stock: parts.currentStock,
      })
      .from(parts)
      .where(
        and(lt(parts.currentStock, parts.minStock), eq(parts.active, true))
      );

    return lowStockParts.map((part) => ({
      ...part,
      deficit: (part.min_stock || 0) - (part.current_stock || 0),
      created_at: new Date(),
      notified: false,
    }));
  } catch (error) {
    console.error("Error checking low stock notifications:", error);
    return [];
  }
}

// Get admin users for notifications
export async function getAdminUsers() {
  try {
    const admins = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.role, "admin"));

    return admins;
  } catch (error) {
    console.error("Error getting admin users:", error);
    return [];
  }
}

// Calculate notification priority
export function getNotificationPriority(deficit: number, currentStock: number) {
  if (currentStock === 0) {
    return "high"; // Critical - out of stock
  } else if (deficit > currentStock) {
    return "high"; // Critical - deficit more than current stock
  } else if (deficit >= 10) {
    return "medium"; // High deficit
  } else {
    return "low"; // Low deficit
  }
}
