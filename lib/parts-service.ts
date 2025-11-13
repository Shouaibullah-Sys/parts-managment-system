import { eq, and, or, like, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { parts, inventory } from "@/db/schema";

export const partsQueries = {
  async createPart(partData: any) {
    const [part] = await db.insert(parts).values(partData).returning();
    return part;
  },

  async getParts(
    options: {
      page?: number;
      limit?: number;
      search?: string;
      section?: string;
      active?: boolean;
    } = {}
  ) {
    const { page = 1, limit = 10, search, section, active } = options;
    const offset = (page - 1) * limit;

    let whereConditions = [];

    if (search) {
      whereConditions.push(
        or(
          like(parts.partNumber, `%${search}%`),
          like(parts.name, `%${search}%`)
        )
      );
    }

    if (section) {
      whereConditions.push(eq(parts.section, section as any));
    }

    if (active !== undefined) {
      whereConditions.push(eq(parts.active, active));
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [partsList, totalCount] = await Promise.all([
      db
        .select()
        .from(parts)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(parts.partNumber),

      db
        .select({ count: sql<number>`count(*)` })
        .from(parts)
        .where(whereClause),
    ]);

    return {
      parts: partsList,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
      },
    };
  },

  async getPartById(id: number) {
    const [part] = await db.select().from(parts).where(eq(parts.id, id));
    return part;
  },

  async getPartByNumber(partNumber: string) {
    const [part] = await db
      .select()
      .from(parts)
      .where(eq(parts.partNumber, partNumber));
    return part;
  },

  async updatePart(id: number, updateData: any) {
    const [updatedPart] = await db
      .update(parts)
      .set(updateData)
      .where(eq(parts.id, id))
      .returning();
    return updatedPart;
  },

  async deletePart(id: number) {
    const [deletedPart] = await db
      .update(parts)
      .set({ active: false })
      .where(eq(parts.id, id))
      .returning();
    return deletedPart;
  },

  async getLowStockParts() {
    // Fix: Use COALESCE to handle null minStock values
    const partsWithStock = await db
      .select({
        part: parts,
        currentStock: sql<number>`COALESCE(SUM(${inventory.change}), 0)`,
      })
      .from(parts)
      .leftJoin(inventory, eq(parts.id, inventory.partId))
      .where(eq(parts.active, true))
      .groupBy(parts.id)
      .having(
        sql`COALESCE(SUM(${inventory.change}), 0) < COALESCE(${parts.minStock}, 0)`
      );

    return partsWithStock;
  },

  async getPartInventoryHistory(
    partId: number,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const [history, totalCount] = await Promise.all([
      db
        .select()
        .from(inventory)
        .where(eq(inventory.partId, partId))
        .orderBy(inventory.createdAt)
        .limit(limit)
        .offset(offset),

      db
        .select({ count: sql<number>`count(*)` })
        .from(inventory)
        .where(eq(inventory.partId, partId)),
    ]);

    return {
      history,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
      },
    };
  },
};

export const partsService = {
  async createPart(partData: any) {
    const existingPart = await partsQueries.getPartByNumber(
      partData.partNumber
    );
    if (existingPart) {
      throw new Error("Part number already exists");
    }

    if (partData.costPrice && partData.salePrice) {
      const cost = parseFloat(partData.costPrice);
      const sale = parseFloat(partData.salePrice);

      if (sale < cost) {
        throw new Error("Sale price cannot be less than cost price");
      }
    }

    return await partsQueries.createPart(partData);
  },

  async getParts(options: any) {
    return await partsQueries.getParts(options);
  },

  async updatePart(id: number, updateData: any) {
    if (updateData.partNumber) {
      const existingPart = await partsQueries.getPartByNumber(
        updateData.partNumber
      );
      if (existingPart && existingPart.id !== id) {
        throw new Error("Part number already exists");
      }
    }

    return await partsQueries.updatePart(id, updateData);
  },

  async getPartDetails(id: number) {
    const part = await partsQueries.getPartById(id);
    if (!part) {
      throw new Error("Part not found");
    }

    const stockResult = await db
      .select({ stock: sql<number>`COALESCE(SUM(${inventory.change}), 0)` })
      .from(inventory)
      .where(eq(inventory.partId, id));

    const currentStock = stockResult[0]?.stock || 0;

    const recentTransactions = await db
      .select()
      .from(inventory)
      .where(eq(inventory.partId, id))
      .orderBy(inventory.createdAt)
      .limit(10);

    // Fix: Handle null minStock by using 0 as default
    const minStock = part.minStock || 0;

    return {
      ...part,
      currentStock,
      recentTransactions,
      isLowStock: currentStock < minStock,
    };
  },
};
