// db/schema.ts

import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  serial,
  varchar,
  integer,
  numeric,
} from "drizzle-orm/pg-core";

// Role enum for simple staff/admin system
export const role = pgEnum("role", ["staff", "admin"]);

export type Role = (typeof role.enumValues)[number];

// Extended user table with role and notification settings
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  role: role("role").default("staff").notNull(),
  approved: boolean("approved")
    .$defaultFn(() => false)
    .notNull(),
  phone: varchar("phone", { length: 20 }),
  smsNotifications: boolean("sms_notifications")
    .$defaultFn(() => false)
    .notNull(),
  pushNotifications: boolean("push_notifications")
    .$defaultFn(() => true)
    .notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export type User = typeof user.$inferSelect;

// Push subscriptions table for web push notifications
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const parts = pgTable("parts", {
  id: serial("id").primaryKey(),
  partNumber: varchar("part_number", { length: 100 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  section: varchar("section", { length: 50 }).default("E"), // Changed from enum to varchar for flexibility
  minStock: integer("min_stock").default(0), // Minimum stock threshold
  currentStock: integer("current_stock").default(0), // Current available quantity
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
  salePrice: numeric("sale_price", { precision: 12, scale: 2 }),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- جدول مشتریان ---
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  normalizedName: varchar("normalized_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- جدول فروش ---
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  partId: integer("part_id").references(() => parts.id),
  customerId: integer("customer_id").references(() => customers.id),
  quantity: integer("quantity").notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).default("0"),
  outstanding: numeric("outstanding", { precision: 12, scale: 2 }).default("0"),
  isFullyPaid: boolean("is_fully_paid").default(false),
  saleDate: timestamp("sale_date").defaultNow(),
  createdBy: text("created_by").references(() => user.id),
});

// --- جدول پرداخت‌های بعدی مشتری ---
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").defaultNow(),
  note: text("note"),
  receivedBy: text("received_by").references(() => user.id),
});

// --- جدول واردات (خرید از خارج) ---
export const imports = pgTable("imports", {
  id: serial("id").primaryKey(),
  supplierName: varchar("supplier_name", { length: 255 }).notNull(),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  advancePaid: numeric("advance_paid", { precision: 12, scale: 2 }).default(
    "0"
  ),
  remainingAmount: numeric("remaining_amount", {
    precision: 12,
    scale: 2,
  }).default("0"),
  isFullyPaid: boolean("is_fully_paid").default(false),
  expectedArrival: timestamp("expected_arrival"),
  status: varchar("status", { length: 50 }).default("pending"), // pending, arrived, completed
  createdAt: timestamp("created_at").defaultNow(),
});

// --- جزئیات پرزه‌های وارد شده ---
export const importItems = pgTable("import_items", {
  id: serial("id").primaryKey(),
  importId: integer("import_id").references(() => imports.id),
  partId: integer("part_id").references(() => parts.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
});

// --- جدول تراکنش‌های انونتوری ---
export const inventory = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  partId: integer("part_id").references(() => parts.id),
  change: integer("change").notNull(), // + برای واردات / - برای فروش
  reason: varchar("reason", { length: 50 }), // 'sale', 'import', 'adjustment'
  referenceId: integer("reference_id"), // id از sale یا import
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: text("created_by").references(() => user.id),
});

// --- جدول شاخص جستجو برای عملکرد بهتر ---
export const searchIndex = pgTable("search_index", {
  id: serial("id").primaryKey(),
  partId: integer("part_id")
    .references(() => parts.id, { onDelete: "cascade" })
    .notNull(),
  searchText: text("search_text").notNull(), // متن جستجو با تمام زبان‌ها
  englishText: text("english_text"), // متن انگلیسی
  dariText: text("dari_text"), // متن دری
  partNumber: varchar("part_number", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  section: varchar("section", { length: 50 }).default("E"), // Changed from enum to varchar for flexibility
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- جدول هزینه‌های روزانه ---
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  expenseDate: timestamp("expense_date").defaultNow(),
  receiptNumber: varchar("receipt_number", { length: 100 }),
  vendor: varchar("vendor", { length: 255 }),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

export const schema = {
  user,
  pushSubscriptions,
  session,
  account,
  verification,
  parts,
  customers,
  sales,
  payments,
  imports,
  importItems,
  inventory,
  searchIndex,
  expenses,
};
